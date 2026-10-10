const db = require("./_db");
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const cookieName = "ks_customer_session";
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const clean = (value, max) => String(value || "").trim().slice(0, max);
function readCookie(req, name) {
  const raw = String(req.headers.cookie || "");
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
function setSessionCookie(res, token, maxAge) {
  res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
async function currentUser(req) {
  const token = readCookie(req, cookieName);
  if (!token || token.length < 40) return null;
  const session = await db.getj("customer-session:" + hash(token));
  if (!session || session.exp < Date.now()) return null;
  const user = await db.getj("customer:" + session.id);
  return user ? { id: session.id, name: user.name, email: user.email, created: user.created } : null;
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!db.ok()) return db.reply(res, 501, { error: "Account storage is not configured yet. Please contact Keepsake." });
  try {
    if (req.method === "GET") {
      const user = await currentUser(req);
      return db.reply(res, 200, { ok: true, user });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return db.reply(res, 405, { error: "Method not allowed." });
    }
    const b = req.body || {};
    if (b.action === "logout") {
      const token = readCookie(req, cookieName);
      if (token) await db.cmd("DEL", "customer-session:" + hash(token));
      clearSessionCookie(res);
      return db.reply(res, 200, { ok: true });
    }
    if (b.action === "signup") {
      const name = clean(b.name, 80);
      const email = clean(b.email, 254).toLowerCase();
      const password = String(b.password || "");
      if (name.length < 2) return db.reply(res, 400, { error: "Please enter your name." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return db.reply(res, 400, { error: "Please enter a valid email address." });
      if (password.length < 10 || password.length > 128) return db.reply(res, 400, { error: "Use a password between 10 and 128 characters." });
      const id = hash(email);
      const existing = await db.getj("customer:" + id);
      if (existing) return db.reply(res, 409, { error: "An account with this email already exists. Please log in." });
      const salt = crypto.randomBytes(16).toString("hex");
      const derived = await scrypt(password, salt, 64);
      const user = { name, email, salt, passwordHash: derived.toString("hex"), created: Date.now() };
      const saved = await db.cmd("SET", "customer:" + id, JSON.stringify(user), "NX");
      if (saved !== "OK") return db.reply(res, 409, { error: "An account with this email already exists. Please log in." });
      const token = crypto.randomBytes(32).toString("base64url");
      const exp = Date.now() + SESSION_SECONDS * 1000;
      await db.setj("customer-session:" + hash(token), { id, exp }, "EX", SESSION_SECONDS);
      setSessionCookie(res, token, SESSION_SECONDS);
      return db.reply(res, 201, { ok: true, user: { id, name, email, created: user.created } });
    }
    if (b.action === "login") {
      const email = clean(b.email, 254).toLowerCase();
      const password = String(b.password || "");
      if (!email || !password) return db.reply(res, 400, { error: "Enter your email and password." });
      const id = hash(email);
      const user = await db.getj("customer:" + id);
      if (!user || !user.salt || !user.passwordHash) return db.reply(res, 401, { error: "Email or password is incorrect." });
      const candidate = await scrypt(password, user.salt, 64);
      const stored = Buffer.from(user.passwordHash, "hex");
      if (stored.length !== candidate.length || !crypto.timingSafeEqual(stored, candidate)) return db.reply(res, 401, { error: "Email or password is incorrect." });
      const token = crypto.randomBytes(32).toString("base64url");
      const exp = Date.now() + SESSION_SECONDS * 1000;
      await db.setj("customer-session:" + hash(token), { id, exp }, "EX", SESSION_SECONDS);
      setSessionCookie(res, token, SESSION_SECONDS);
      return db.reply(res, 200, { ok: true, user: { id, name: user.name, email: user.email, created: user.created } });
    }
    return db.reply(res, 400, { error: "Unknown account action." });
  } catch (e) {
    return db.reply(res, 500, { error: "Something went wrong. Please try again." });
  }
};
