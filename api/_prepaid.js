// Prepaid QR codes sold through shops. Not a route.
// Each printed card has a code (in its QR: getkeepsake.in/k/CODE) and its own 6-digit PIN inside the pack.
// After 10 wrong PINs in total a code locks until the owner unlocks it in admin.
// The buyer scans, makes their keepsake, enters the PIN, and it goes live with no online payment.
// pcode:<CODE>   = { code, pin, tier: "card"|"site", batch, status: "new"|"claimed", fails, locked, memory, kind, owner, claimedAt }
// pbatch:<ID>    = { id, shop, tier, count, note, created, codes: [CODE...] }
// pbatches       = sorted set of batch ids (score = created)
// pbatch-claimed:<ID> = number of claimed codes in the batch
const crypto = require("crypto");
const db = require("./_db");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const norm = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const valid = c => /^KS[A-HJ-NP-Z2-9]{8}$/.test(c);
const newCode = () => "KS" + [...crypto.randomBytes(8)].map(b => ALPHA[b % 32]).join("");
const newPin = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
const MAX_FAILS = 10, HOURLY = Math.max(1, +process.env.PCLAIM_HOURLY || 8);
const TIERS = { card: "Memory card", site: "Love-story website", biz: "Business page" };
const urlFor = (kind, id) => (kind === "site" ? "/s/" : kind === "biz" ? "/b/" : "/m/") + id;
const same = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function get(code) { code = norm(code); return valid(code) ? await db.getj("pcode:" + code) : null; }

async function createBatch({ count, tier, shop, note }) {
  count = Math.round(+count); if (!(count >= 1 && count <= 200)) return { error: "Make between 1 and 200 codes at a time." };
  if (!TIERS[tier]) return { error: "Choose card, website or business codes." };
  const id = db.rid(8), created = Date.now(), codes = [], pins = new Set();
  while (codes.length < count) {
    const code = newCode();
    let pin = newPin(); while (pins.has(pin)) pin = newPin(); // every card in a batch has a different PIN
    const rec = { code, pin, tier, batch: id, status: "new", fails: 0, created };
    if ((await db.cmd("SET", "pcode:" + code, JSON.stringify(rec), "NX")) === "OK") codes.push(code);
  }
  const batch = { id, shop: String(shop || "").slice(0, 60) || "Direct", tier, count, note: String(note || "").slice(0, 120), created, codes };
  await db.setj("pbatch:" + id, batch);
  await db.cmd("ZADD", "pbatches", created, id);
  return { batch };
}

// Admin: unlock a code that was locked by wrong PINs.
async function unlock(code) {
  const rec = await get(code); if (!rec) return null;
  rec.fails = 0; rec.locked = false; await db.setj("pcode:" + rec.code, rec);
  await db.cmd("DEL", "pclaim-tries:" + rec.code); return rec;
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
    .map(r => ({ code: r.code, pin: r.pin, status: r.status, locked: !!r.locked, fails: r.fails || 0, kind: r.kind || "", claimedAt: r.claimedAt || null }));
  return { ...b, codes };
}

// Claim a code for one of the user's keepsakes. Returns { ok, url } or { status, error }.
async function claim({ code, pin, id, user, ip }) {
  code = norm(code);
  const ipKey = "pclaim-ip:" + ip, n1 = await db.cmd("INCR", ipKey); if (n1 === 1) await db.cmd("EXPIRE", ipKey, 3600);
  if (n1 > 30) return { status: 429, error: "Too many tries. Please wait an hour and try again." };
  if (!valid(code)) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  const tk = "pclaim-tries:" + code, n2 = await db.cmd("INCR", tk); if (n2 === 1) await db.cmd("EXPIRE", tk, 3600);
  if (n2 > HOURLY) return { status: 429, error: "Too many wrong PINs for this code. Please wait an hour, or WhatsApp us on +91 63775 47759." };
  const rec = await db.getj("pcode:" + code);
  if (!rec) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  if (!/^[a-z0-9]{8,16}$/i.test(String(id || ""))) return { status: 400, error: "Save your keepsake first." };
  if (rec.status === "claimed") {
    if (rec.memory === id && rec.owner === user.id) return { ok: true, url: urlFor(rec.kind, id) };
    return { status: 409, error: "This code has already been used." };
  }
  if (rec.tier === "biz") return { status: 400, error: "Business QR cards switch on when you pay for your page. Open the card's QR to set it up." };
  if (rec.locked) return { status: 423, error: "This code is locked after too many wrong PINs. WhatsApp us on +91 63775 47759 with a photo of your card and we'll unlock it." };
  if (!same(rec.pin, String(pin || "").replace(/\D/g, ""))) {
    rec.fails = (rec.fails || 0) + 1; if (rec.fails >= MAX_FAILS) rec.locked = true;
    await db.setj("pcode:" + code, rec);
    if (rec.tier === "biz") return { status: 400, error: "Business QR cards switch on when you pay for your page. Open the card's QR to set it up." };
  if (rec.locked) return { status: 423, error: "Too many wrong PINs, so this code is now locked. WhatsApp us on +91 63775 47759 with a photo of your card and we'll unlock it." };
    return { status: 401, error: `That PIN isn't right. It's the 6-digit number printed inside your box (${MAX_FAILS - rec.fails} tries left).` };
  }
  const mk = "customer-memory:" + id, memory = await db.getj(mk);
  if (!memory || memory.owner !== user.id) return { status: 404, error: "Keepsake not found in your account." };
  if (memory.kind === "biz") return { status: 400, error: "This code is for a keepsake, not a business page." };
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
    return { ok: true, url: urlFor(kind, id) };
  } finally { await db.cmd("DEL", "pclaim-lock:" + code); }
}

// Business QR cards have no PIN: the shop pays online, and the paid order links the card to its page.
async function linkBiz(code, id, owner) {
  const rec = await get(code);
  if (!rec || rec.tier !== "biz") return null;
  if (rec.status === "claimed") return rec.memory === id ? rec : null;
  Object.assign(rec, { status: "claimed", memory: id, kind: "biz", owner, claimedAt: Date.now() });
  await db.setj("pcode:" + rec.code, rec);
  await db.cmd("INCR", "pbatch-claimed:" + rec.batch);
  return rec;
}

module.exports = { norm, valid, get, createBatch, batches, batchCodes, claim, unlock, linkBiz, urlFor, TIERS };
