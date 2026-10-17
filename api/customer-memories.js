const db = require("./_db");
const auth = require("./customer-auth");
const pay = require("./_pay");
const crypto = require("crypto");
const idPattern = /^[a-z0-9]{8,16}$/i;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n);
const MAX = { card: 30000, site: 90000, biz: 60000 };
const kindOf = v => (v === "site" || v === "biz" ? v : "card");
const urlFor = (kind, id) => (kind === "site" ? "/s/" : kind === "biz" ? "/b/" : "/m/") + id;
const tooBig = (data, kind) => JSON.stringify(data).length > MAX[kind];
// A website is either section-based (older themes) or one of the designed templates.
const TEMPLATES = ["wildflower", "candlelit", "mixtape"];
// A business page (shops, cafes): data.biz === 1 with at least a name.
const validData = (data, kind) => !!data && (kind === "biz" ? data.biz === 1 && typeof data.t === "string" && !!data.t.trim() : kind === "site" ? (Array.isArray(data.sections) || TEMPLATES.includes(data.tpl)) : Array.isArray(data.i));

// Optional password lock. Only a salted hash is stored; the card's content is never sent until it matches.
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString("hex");
function setLock(memory, b) {
  const { lock, lockStyle: style, lockHint: hint, lockPhoto: photo } = b;
  if (lock === false) { delete memory.lock; return null; }                      // removed
  if (!(lock === undefined || lock === null || lock === "")) {
    const pw = String(lock), pin = style === "pin";
    if (pin && !/^\d{4}$/.test(pw)) return "The passcode must be exactly 4 numbers.";
    if (!pin && (pw.length < 4 || pw.length > 64)) return "Password must be 4 to 64 characters.";
    const salt = crypto.randomBytes(12).toString("hex");
    memory.lock = { salt, hash: hashPw(pw, salt), style: pin ? "pin" : "word" };
  }
  // A hint shown on the lock screen, e.g. "our anniversary (DDMM)". Saved with or without a new password.
  if (memory.lock && hint !== undefined) { const h = clip(hint, 60); if (h) memory.lock.hint = h; else delete memory.lock.hint; }
  // An optional teaser photo the owner chose to show on it (only our own uploads).
  if (memory.lock && photo !== undefined) { const u = String(photo || ""); if (/^\/api\/img\?id=[\w-]{1,80}$/.test(u)) memory.lock.photo = u; else delete memory.lock.photo; }
  return null;
}
// What the lock screen may show before it's unlocked: never the password or the content.
const lockInfo = m => ({ style: (m.lock && m.lock.style) || "word", hint: (m.lock && m.lock.hint) || "", photo: (m.lock && m.lock.photo) || "" });
const ownerLock = m => m.lock ? { lockStyle: lockInfo(m).style, lockHint: lockInfo(m).hint, lockPhoto: lockInfo(m).photo } : {};
function lockMatches(memory, pw) {
  if (!pw) return false;
  const a = Buffer.from(hashPw(pw, memory.lock.salt), "hex"), b = Buffer.from(memory.lock.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const clientIp = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();

// Delivery status of the most recent photo-frame order on a memory, if any.
async function shipStatus(m) {
  for (const oid of [...(m.orders || [])].reverse()) {
    const o = await db.getj("order:" + oid);
    if (o && (o.plan === "frameQr" || o.plan === "frameNfc") && o.status === "paid") return o.ship || "to-ship";
  }
  return "";
}
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Memory storage is not configured yet." });
  try {
    const q = req.query || {};
    if (req.method === "GET" && q.id) {
      const id = String(q.id);
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory link." });
      const memory = await db.getj("customer-memory:" + id);
      if (!memory) return db.reply(res, 404, { error: "Memory not found." });
      // Cards saved before payments existed have no "paid" field and stay active.
      const active = memory.paid !== false;
      const viewer = await auth.currentUser(req), isOwner = !!viewer && viewer.id === memory.owner;
      const kind = kindOf(memory.kind), base = { id, kind, created: memory.created, locked: !!memory.lock };
      if (!active) {
        if (!isOwner) return db.reply(res, 402, { error: "This keepsake isn't active yet.", inactive: true });
        return db.reply(res, 200, { ...base, ...ownerLock(memory), data: memory.data, title: memory.title, active: false, owner: true });
      }
      if (memory.lock && !isOwner) {
        const pw = String(req.headers["x-card-password"] || "");
        if (!pw) return db.reply(res, 401, { locked: true, kind, ...lockInfo(memory), error: "This keepsake is protected with a password." });
        const rk = "unlock-tries:" + id + ":" + clientIp(req), tries = await db.cmd("INCR", rk);
        if (tries === 1) await db.cmd("EXPIRE", rk, 900);
        if (tries > 10) return db.reply(res, 429, { locked: true, kind, ...lockInfo(memory), error: "Too many wrong tries. Please wait 15 minutes." });
        if (!lockMatches(memory, pw)) return db.reply(res, 401, { locked: true, kind, wrong: true, left: Math.max(0, 10 - tries), ...lockInfo(memory), error: "That passcode isn't right." });
        await db.cmd("DEL", rk);
      }
      if (!isOwner) await db.cmd("INCR", "customer-memory-views:" + id);
      return db.reply(res, 200, { ...base, ...(isOwner ? ownerLock(memory) : {}), data: memory.data, title: memory.title, active: true, owner: isOwner });
    }
    const user = await auth.currentUser(req);
    if (!user) return db.reply(res, 401, { error: "Please log in to manage your memories." });
    if (req.method === "GET") {
      const ids = await db.cmd("SMEMBERS", "customer-memories:" + user.id);
      const memories = (await Promise.all(ids.map(async id => {
        const m = await db.getj("customer-memory:" + id);
        if (!m || m.owner !== user.id) return null;
        return { id, title: m.title || "Our Memories", created: m.created, updated: m.updated || m.created, views: +(await db.cmd("GET", "customer-memory-views:" + id)) || 0, active: m.paid !== false, plan: m.plan || "", ship: await shipStatus(m), kind: kindOf(m.kind), locked: !!m.lock };
      }))).filter(Boolean).sort((a, b) => b.created - a.created);
      return db.reply(res, 200, { memories });
    }
    if (req.method === "POST") {
      const b = req.body || {}, data = b.data, kind = kindOf(b.kind);
      if (!validData(data, kind) || tooBig(data, kind))
        return db.reply(res, 400, { error: "This memory is empty or too large. Reduce its content and try again." });
      const id = crypto.randomBytes(8).toString("hex");
      const now = Date.now();
      // Limit unpaid drafts so storage can't be filled for free.
      const ids = await db.cmd("SMEMBERS", "customer-memories:" + user.id);
      if (ids.length >= 60) return db.reply(res, 429, { error: "You have a lot of saved cards. Delete a few unused ones first." });
      const memory = { owner: user.id, ownerName: user.name, kind, title: clip(data.t || "Our Memories", 80) || "Our Memories", data, created: now, updated: now,
        // Until Razorpay keys are added in Vercel, keepsakes go live without payment.
        paid: !pay.configured(), ...(pay.configured() ? {} : { free: true }) };
      const lockErr = setLock(memory, b); if (lockErr) return db.reply(res, 400, { error: lockErr });
      await db.setj("customer-memory:" + id, memory, "NX");
      await db.cmd("SADD", "customer-memories:" + user.id, id);
      return db.reply(res, 201, { id, kind, url: urlFor(kind, id), title: memory.title, created: now, active: memory.paid !== false, locked: !!memory.lock, ...ownerLock(memory) });
    }
    if (req.method === "PUT") {
      const b = req.body || {}, id = String(b.id || ""), data = b.data;
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory." });
      const key = "customer-memory:" + id, memory = await db.getj(key);
      if (!memory || memory.owner !== user.id) return db.reply(res, 404, { error: "Memory not found in your account." });
      const kind = kindOf(memory.kind);
      if (!validData(data, kind) || tooBig(data, kind)) return db.reply(res, 400, { error: "This memory is empty or too large." });
      const lockErr = setLock(memory, b); if (lockErr) return db.reply(res, 400, { error: lockErr });
      memory.data = data; memory.title = clip(data.t || "Our Memories", 80) || "Our Memories"; memory.updated = Date.now();
      await db.setj(key, memory);
      return db.reply(res, 200, { id, kind, url: urlFor(kind, id), title: memory.title, updated: memory.updated, active: memory.paid !== false, locked: !!memory.lock, ...ownerLock(memory) });
    }
    if (req.method === "DELETE") {
      const id = String(q.id || (req.body || {}).id || "");
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory." });
      const key = "customer-memory:" + id, memory = await db.getj(key);
      if (!memory || memory.owner !== user.id) return db.reply(res, 404, { error: "Memory not found in your account." });
      await db.cmd("DEL", key, "customer-memory-views:" + id);
      await db.cmd("SREM", "customer-memories:" + user.id, id);
      return db.reply(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return db.reply(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return db.reply(res, 500, { error: "Could not process the memory. Please try again." });
  }
};
