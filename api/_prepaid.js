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

async function createBatch({ count, tier, shop, note, comm, phone, sp }) {
  count = Math.round(+count); if (!(count >= 1 && count <= 200)) return { error: "Make between 1 and 200 codes at a time." };
  if (!TIERS[tier]) return { error: "Choose card, website or business codes." };
  const id = db.rid(8), created = Date.now(), codes = [], pins = new Set();
  while (codes.length < count) {
    const code = newCode();
    let pin = newPin(); while (pins.has(pin)) pin = newPin(); // every card in a batch has a different PIN
    const rec = { code, pin, tier, batch: id, status: "new", fails: 0, created };
    if ((await db.cmd("SET", "pcode:" + code, JSON.stringify(rec), "NX")) === "OK") codes.push(code);
  }
  comm = Math.max(0, Math.min(5000, Math.round(+comm || 0)));
  const batch = { id, shop: String(shop || "").slice(0, 60) || "Direct", tier, count, note: String(note || "").slice(0, 120), created, codes,
    comm, phone: String(phone || "").replace(/[^\d+ ]/g, "").slice(0, 16), key: db.rid(12), paidOut: 0, payouts: [], ...(sp ? { sp } : {}) };
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
    const { codes, ...rest } = b, claimed = +(await db.cmd("GET", "pbatch-claimed:" + id)) || 0, comm = b.comm || 0, paidOut = b.paidOut || 0;
    return { ...rest, claimed, comm, paidOut, earned: claimed * comm, owed: Math.max(0, claimed - paidOut) * comm };
  }))).filter(Boolean);
}
async function batchCodes(id) {
  const b = await db.getj("pbatch:" + String(id || "").slice(0, 20)); if (!b) return null;
  const codes = (await Promise.all(b.codes.map(c => db.getj("pcode:" + c)))).filter(Boolean)
    .map(r => ({ code: r.code, pin: r.pin, status: r.status, locked: !!r.locked, fails: r.fails || 0, kind: r.kind || "", claimedAt: r.claimedAt || null }));
  return { ...b, codes };
}

// Salesperson commission: rate per activation, and "mark as paid" (pays everything activated so far).
async function setComm(id, comm) {
  const b = await db.getj("pbatch:" + String(id || "").slice(0, 20)); if (!b) return null;
  b.comm = Math.max(0, Math.min(5000, Math.round(+comm || 0))); if (!b.key) b.key = db.rid(12);
  await db.setj("pbatch:" + b.id, b); return { id: b.id, comm: b.comm };
}
async function payout(id) {
  const b = await db.getj("pbatch:" + String(id || "").slice(0, 20)); if (!b) return null;
  const claimed = +(await db.cmd("GET", "pbatch-claimed:" + b.id)) || 0, n = claimed - (b.paidOut || 0);
  if (n <= 0) return { id: b.id, paid: 0 };
  b.payouts = (b.payouts || []).concat({ at: Date.now(), shops: n, amount: n * (b.comm || 0) }).slice(-50); b.paidOut = claimed;
  await db.setj("pbatch:" + b.id, b); return { id: b.id, paid: n * (b.comm || 0), shops: n };
}
// The salesperson's private page (/sales?b=ID&k=KEY): their codes, activated shops and commission. Never PINs or customer details.
async function salesView(id, key) {
  const b = await db.getj("pbatch:" + String(id || "").slice(0, 20));
  if (!b || !b.key || !same(b.key, key)) return null;
  const recs = (await Promise.all(b.codes.map(c => db.getj("pcode:" + c)))).filter(Boolean);
  const shops = (await Promise.all(recs.filter(r => r.status === "claimed" && r.memory).map(async r => {
    const m = await db.getj("customer-memory:" + r.memory);
    return { code: r.code, name: m ? String(m.title || "").slice(0, 60) : "Shop", at: r.claimedAt || 0, url: urlFor(r.kind, r.memory) };
  }))).sort((a, c) => c.at - a.at);
  const claimed = shops.length, comm = b.comm || 0, paidOut = Math.min(b.paidOut || 0, claimed);
  return { name: b.shop, tier: b.tier, count: b.count, created: b.created, activated: claimed, unused: b.count - claimed, comm, earned: claimed * comm, paid: paidOut * comm, owed: (claimed - paidOut) * comm,
    payouts: (b.payouts || []).map(p => ({ at: p.at, amount: p.amount, shops: p.shops })), shops, codes: recs.map(r => ({ code: r.code, status: r.status })) };
}

// Claim a code for one of the user's keepsakes. Returns { ok, url } or { status, error }.
async function claim({ code, pin, id, user, ip }) {
  code = norm(code);
  const ipKey = "pclaim-ip:" + ip, n1 = await db.cmd("INCR", ipKey); if (n1 === 1) await db.cmd("EXPIRE", ipKey, 3600);
  if (n1 > 30) return { status: 429, error: "Too many tries. Please wait an hour and try again." };
  if (!valid(code)) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  const tk = "pclaim-tries:" + code, n2 = await db.cmd("INCR", tk); if (n2 === 1) await db.cmd("EXPIRE", tk, 3600);
  if (n2 > HOURLY) return { status: 429, error: "Too many wrong PINs for this code. Please wait an hour, or WhatsApp us on +91 83027 91217." };
  const rec = await db.getj("pcode:" + code);
  if (!rec) return { status: 404, error: "That code isn't valid. Check the card in your pack." };
  if (!/^[a-z0-9]{8,16}$/i.test(String(id || ""))) return { status: 400, error: "Save your keepsake first." };
  if (rec.status === "claimed") {
    if (rec.memory === id && rec.owner === user.id) return { ok: true, url: urlFor(rec.kind, id) };
    return { status: 409, error: "This code has already been used." };
  }
  if (rec.tier === "biz") return { status: 400, error: "Business QR cards switch on when you pay for your page. Open the card's QR to set it up." };
  if (rec.locked) return { status: 423, error: "This code is locked after too many wrong PINs. WhatsApp us on +91 83027 91217 with a photo of your card and we'll unlock it." };
  if (!same(rec.pin, String(pin || "").replace(/\D/g, ""))) {
    rec.fails = (rec.fails || 0) + 1; if (rec.fails >= MAX_FAILS) rec.locked = true;
    await db.setj("pcode:" + code, rec);
    if (rec.tier === "biz") return { status: 400, error: "Business QR cards switch on when you pay for your page. Open the card's QR to set it up." };
  if (rec.locked) return { status: 423, error: "Too many wrong PINs, so this code is now locked. WhatsApp us on +91 83027 91217 with a photo of your card and we'll unlock it." };
    return { status: 401, error: `That PIN isn't right. It's the 6-digit number printed inside your box (${MAX_FAILS - rec.fails} tries left).` };
  }
  const mk = "customer-memory:" + id, memory = await db.getj(mk);
  if (!memory || memory.owner !== user.id) return { status: 404, error: "Keepsake not found in your account." };
  if (memory.kind === "biz") return { status: 400, error: "This code is for a keepsake, not a business page." };
  const kind = memory.kind === "site" ? "site" : "card";
  if (kind === "site" && (memory.data || {}).tpl === "wedding") return { status: 400, error: "This code can't be used for a wedding invitation. Pay online to switch it on, or WhatsApp us." };
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
  try { await db.cmd("SADD", "qrs:" + id, rec.code); } catch (e) {}
  return rec;
}

// ---------- Link a blank business QR board to a page that already exists ----------
// A shop that made and paid for its page online (or with a salesperson) can attach one of our printed blank QR boards to it.
// The owner does it from the dashboard; a salesperson can do it for the shops they signed up. No payment and no PIN:
// a business board only ever points at a page that is already paid for.
// qrs:<PAGE> = set of board codes linked to the page (at most MAX_BOARDS)
const MAX_BOARDS = 5;
const codeOf = v => { const m = String(v || "").toUpperCase().match(/KS[A-HJ-NP-Z2-9]{8}/); return m ? m[0] : norm(v); };
const pageIdOf = v => { const m = String(v || "").match(/(?:\/b\/)?([a-z0-9]{8,16})\/?$/i); return m ? m[1] : ""; };
async function tooMany(k, max) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, 3600); return n > max; }

async function linkBoard(codeIn, id, who) {
  const code = codeOf(codeIn);
  if (!valid(code)) return { status: 400, error: "That QR code isn't right. Type the code printed under the QR, like KSAB12CD34." };
  const m = await db.getj("customer-memory:" + id);
  if (!m || m.kind !== "biz") return { status: 404, error: "That shop page wasn't found." };
  if (m.paid === false) return { status: 402, error: "This page isn't live yet. Finish the payment first, then link the QR." };
  if ((await db.cmd("SET", "pclaim-lock:" + code, "1", "NX", "EX", 15)) !== "OK") return { status: 409, error: "Please try again in a moment." };
  try {
    const rec = await db.getj("pcode:" + code);
    if (!rec) return { status: 404, error: "We don't know that QR code. Check the letters under the QR." };
    if (rec.tier !== "biz") return { status: 400, error: "That code is for a gift keepsake, not a shop QR board." };
    if (rec.locked) return { status: 423, error: "This QR is locked. WhatsApp us on +91 83027 91217 and we'll sort it out." };
    if (rec.status === "claimed") return rec.memory === id ? { ok: true, code, already: true } : { status: 409, error: "This QR board is already linked to another shop." };
    if ((+(await db.cmd("SCARD", "qrs:" + id)) || 0) >= MAX_BOARDS) return { status: 409, error: "This page already has " + MAX_BOARDS + " QR boards. Remove one first." };
    Object.assign(rec, { status: "claimed", memory: id, kind: "biz", owner: m.owner, claimedAt: Date.now(), linkedBy: who });
    await db.setj("pcode:" + code, rec);
    await db.cmd("INCR", "pbatch-claimed:" + rec.batch);
    await db.cmd("SADD", "qrs:" + id, code);
    return { ok: true, code, url: urlFor("biz", id), title: String(m.title || "").slice(0, 80) };
  } finally { await db.cmd("DEL", "pclaim-lock:" + code); }
}

async function boards(id) {
  const codes = await db.cmd("SMEMBERS", "qrs:" + id) || [];
  const recs = await Promise.all(codes.map(c => db.getj("pcode:" + c)));
  return recs.filter(r => r && r.status === "claimed" && r.memory === id).map(r => ({ code: r.code, at: r.claimedAt || 0 })).sort((a, b) => a.at - b.at);
}

// Owner actions (logged in): qr-boards { id }, qr-link { id, qr }, qr-unlink { id, qr }
async function ownerHandle(b, ctx) {
  const user = await ctx.user(); if (!user) return { status: 401, error: "Please log in." };
  const id = String(b.id || ""); if (!/^[a-z0-9]{8,16}$/i.test(id)) return { status: 400, error: "Open this from your dashboard." };
  const m = await db.getj("customer-memory:" + id);
  if (!m || m.kind !== "biz" || m.owner !== user.id) return { status: 404, error: "That shop page isn't in your account." };
  if (b.action === "qr-boards") return { ok: true, boards: await boards(id), max: MAX_BOARDS };
  if (b.action === "qr-link") {
    if (await tooMany("qrlink:" + user.id, 20) || await tooMany("qrlink-ip:" + ctx.ip, 40)) return { status: 429, error: "Too many tries. Please wait an hour." };
    const r = await linkBoard(b.qr, id, "owner"); if (r.error) return r;
    return { ...r, boards: await boards(id) };
  }
  if (b.action === "qr-unlink") {
    const code = codeOf(b.qr), rec = valid(code) ? await db.getj("pcode:" + code) : null;
    if (!rec || rec.status !== "claimed" || rec.memory !== id) return { status: 404, error: "That QR isn't linked to this page." };
    Object.assign(rec, { status: "new", memory: "", kind: "", owner: "", claimedAt: 0, linkedBy: "" });
    await db.setj("pcode:" + code, rec); await db.cmd("DECR", "pbatch-claimed:" + rec.batch); await db.cmd("SREM", "qrs:" + id, code);
    return { ok: true, boards: await boards(id) };
  }
  return { status: 400, error: "Unknown action." };
}

// Salesperson: link a blank board to one of the shops they signed up. `sp` is the checked salesperson record.
async function salesLink(sp, b, ip) {
  if (await tooMany("qrlink-sp:" + sp.code, 60)) return { status: 429, error: "Too many tries. Please wait an hour." };
  const id = pageIdOf(b.page); if (!id) return { status: 400, error: "Choose the shop first." };
  if ((await db.cmd("ZSCORE", "sp-shops:" + sp.code, id)) == null) return { status: 403, error: "You can only link a QR for shops you signed up. Ask the owner to link it from their dashboard." };
  return linkBoard(b.qr, id, "sp:" + sp.code);
}

// Which page should a logged-in owner be offered when they scan a blank business board? Their newest live page without asking them to rebuild it.
async function ownerPage(user) {
  if (!user) return "";
  try {
    const ids = await db.cmd("SMEMBERS", "customer-memories:" + user.id) || [];
    for (const id of ids.slice(0, 40)) { const m = await db.getj("customer-memory:" + id); if (m && m.kind === "biz" && m.paid !== false) return id; }
  } catch (e) {}
  return "";
}

module.exports = { norm, valid, get, createBatch, batches, batchCodes, claim, unlock, linkBiz, urlFor, setComm, payout, salesView, TIERS, linkBoard, boards, ownerHandle, salesLink, ownerPage, codeOf, MAX_BOARDS };
