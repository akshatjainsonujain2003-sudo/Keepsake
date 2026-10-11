// Optional password lock for cards (shared by api/card.js and api/customer-memories.js).
// The password is never stored: only a salted scrypt hash. Locked cards send no content until unlocked,
// and wrong guesses are rate limited so even a short PIN cannot be brute-forced.
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);
const db = require("./_db");

const MIN = 4, MAX = 40;
const PER_IP = 6, PER_IP_SECONDS = 15 * 60;     // 6 wrong tries per visitor per 15 minutes
const PER_CARD = 40, PER_CARD_SECONDS = 60 * 60; // 40 wrong tries per card per hour, from anyone

exports.MIN = MIN;
exports.MAX = MAX;

// Returns the password if it is acceptable, "" if no password was asked for, or null if it is invalid.
exports.clean = v => {
  if (v == null || v === "") return "";
  const p = String(v);
  return p.length >= MIN && p.length <= MAX ? p : null;
};

exports.make = async pw => {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw.normalize("NFKC"), salt, 32);
  return { s: salt.toString("base64"), h: h.toString("base64") };
};

const verify = async (pw, lock) => {
  if (!lock || !lock.s || !lock.h) return false;
  const want = Buffer.from(lock.h, "base64");
  const got = await scrypt(String(pw || "").normalize("NFKC"), Buffer.from(lock.s, "base64"), want.length);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
};
exports.verify = verify;

const ipOf = req => String((req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) || (req.socket && req.socket.remoteAddress) || "x").split(",")[0].trim().slice(0, 64);

// Checks a password attempt. Resolves { ok:true } or { ok:false, status, error }.
exports.attempt = async (req, kind, id, pw, lock) => {
  const ipKey = `lockfail:${kind}:${id}:${ipOf(req)}`, cardKey = `lockfail:${kind}:${id}`;
  const [a, b] = await Promise.all([db.cmd("GET", ipKey), db.cmd("GET", cardKey)]);
  if ((+a || 0) >= PER_IP || (+b || 0) >= PER_CARD)
    return { ok: false, status: 429, error: "Too many wrong tries. Please wait a little while and try again." };
  if (await verify(pw, lock)) { await db.cmd("DEL", ipKey); return { ok: true }; }
  const n = await db.cmd("INCR", ipKey); if (n === 1) await db.cmd("EXPIRE", ipKey, PER_IP_SECONDS);
  const m = await db.cmd("INCR", cardKey); if (m === 1) await db.cmd("EXPIRE", cardKey, PER_CARD_SECONDS);
  const left = Math.max(0, PER_IP - n);
  return { ok: false, status: 401, error: left ? "That password is not right." + (left <= 2 ? ` ${left} ${left === 1 ? "try" : "tries"} left.` : "") : "Too many wrong tries. Please wait a little while and try again." };
};
