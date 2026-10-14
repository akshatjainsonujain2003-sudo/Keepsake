// Prepaid QR codes sold through shops. Not a route.
// Each printed card has a code (in its QR: getkeepsake.in/k/CODE) and a 4-digit PIN inside the pack.
// The buyer scans, makes their keepsake, enters the PIN, and it goes live with no online payment.
// pcode:<CODE>   = { code, pin, tier: "card"|"site", batch, status: "new"|"claimed", memory, kind, owner, claimedAt }
// pbatch:<ID>    = { id, shop, tier, count, note, created, codes: [CODE...] }
// pbatches       = sorted set of batch ids (score = created)
// pbatch-claimed:<ID> = number of claimed codes in the batch
const crypto = require("crypto");
const db = require("./_db");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const norm = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const valid = c => /^KS[A-HJ-NP-Z2-9]{8}$/.test(c);
const newCode = () => "KS" + [...crypto.randomBytes(8)].map(b => ALPHA[b % 32]).join("");
const newPin = () => String(crypto.randomInt(0, 10000)).padStart(4, "0");
const TIERS = { card: "Memory card", site: "Love-story website" };
const same = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function get(code) { code = norm(code); return valid(code) ? await db.getj("pcode:" + code) : null; }

async function createBatch({ count, tier, shop, note }) {
  count = Math.round(+count); if (!(count >= 1 && count <= 200)) return { error: "Make between 1 and 200 codes at a time." };
  if (!TIERS[tier]) return { error: "Choose card or website codes." };
  const id = db.rid(8), created = Date.now(), codes = [];
  while (codes.length < count) {
    const code = newCode();
    const rec = { code, pin: newPin(), tier, batch: id, status: "new", created };
    if ((await db.cmd("SET", "pcode:" + code, JSON.stringify(rec), "NX")) === "OK") codes.push(code);
  }
  const batch = { id, shop: String(shop || "").slice(0, 60) || "Direct", tier, count, note: String(note || "").slice(0, 120), created, codes };
  await db.setj("pbatch:" + id, batch);
  await db.cmd("ZADD", "pbatches", created, id);
  return { batch };
}

async function batches() {
  const ids = await db.cmd("ZRANGE", "pbatches", 0, -1, "REV");
  return (await Promise.all(ids.map(async id => {
    const b = await db.getj("pbatch:" + id); if (!b) return null;
    const { codes, ...rest } = b; return { ...rest, claimed: +(await db.cmd("GET", "pbatch-claimed:" + id)) || 0 };
  }))).filter(Boolean);
}
async function batchCodes(id) {
  const b = await db.getj("pbatch:" + String(id || "").slice(0, 20)); if (!b) return null;
  const codes = (await Promise.all(b.codes.map(c => db.getj("pcode:" + c)))).filter(Boolean)
    .map(r => ({ code: r.code, pin: r.pin, status: r.status, kind: r.kind || "", claimedAt: r.claimedAt || null }));
  return { ...b, codes };
}

// Claim a code for one of the user's keepsakes. Returns { ok, url } or { status, error }.
async function claim({ code, pin, id, user, ip }) {
  code = norm(code);
  const ipKey = "pclaim-ip:" + ip, n1 = await db.cmd("INCR", ipKey); if (n1 === 1) await db.cmd("EXPIRE", ipKey, 3600);
  if (n1 > 30) return { status: 429, error: "Too many tries. Please wait an hour and try again." };
  if (!valid(code)) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  const tk = "pclaim-tries:" + code, n2 = await db.cmd("INCR", tk); if (n2 === 1) await db.cmd("EXPIRE", tk, 3600);
  if (n2 > 8) return { status: 429, error: "Too many wrong PINs for this code. Please wait an hour, or WhatsApp us on +91 63775 47759." };
  const rec = await db.getj("pcode:" + code);
  if (!rec) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  if (!/^[a-z0-9]{8,16}$/i.test(String(id || ""))) return { status: 400, error: "Save your keepsake first." };
  if (rec.status === "claimed") {
    if (rec.memory === id && rec.owner === user.id) return { ok: true, url: (rec.kind === "site" ? "/s/" : "/m/") + id };
    return { status: 409, error: "This code has already been used." };
  }
  if (!same(rec.pin, String(pin || "").replace(/\D/g, ""))) return { status: 401, error: "That PIN isn't right. It's the 4-digit number printed inside your pack." };
  const mk = "customer-memory:" + id, memory = await db.getj(mk);
  if (!memory || memory.owner !== user.id) return { status: 404, error: "Keepsake not found in your account." };
  const kind = memory.kind === "site" ? "site" : "card";
  if (rec.tier === "card" && kind === "site") return { status: 400, error: "This code is for a memory card. Make a card in the studio to use it, or WhatsApp us to upgrade." };
  if (memory.prepaid && memory.prepaid !== code) return { status: 409, error: "This keepsake already used a prepaid code." };
  if ((await db.cmd("SET", "pclaim-lock:" + code, "1", "NX", "EX", 30)) !== "OK") return { status: 409, error: "Please try again in a moment." };
  try {
    const fresh = await db.getj("pcode:" + code);
    if (!fresh || fresh.status !== "new") return { status: 409, error: "This code has already been used." };
    const now = Date.now();
    memory.paid = true; memory.prepaid = code; memory.term = "life"; delete memory.expiresAt;
    memory.plan = memory.plan || "digital"; memory.activatedAt = memory.activatedAt || now;
    await db.setj(mk, memory);
    Object.assign(fresh, { status: "claimed", memory: id, kind, owner: user.id, claimedAt: now });
    await db.setj("pcode:" + code, fresh);
    await db.cmd("INCR", "pbatch-claimed:" + fresh.batch);
    await db.cmd("DEL", tk);
    return { ok: true, url: (kind === "site" ? "/s/" : "/m/") + id };
  } finally { await db.cmd("DEL", "pclaim-lock:" + code); }
}

module.exports = { norm, valid, get, createBatch, batches, batchCodes, claim, TIERS };
