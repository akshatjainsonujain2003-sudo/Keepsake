// Loyalty stamp cards for business pages ("Visit 10 times, get a free coffee"). Not a route: api/qr.js passes loy-* actions here.
// The shop turns it on in the studio (page data.loy = { on, n: stamps needed, r: reward, t: note }) and sets a 4-digit staff PIN.
// A customer gets a card on the shop's page with their phone number. At the counter, staff type the PIN on the
// customer's phone to add a stamp (one per visit, at most one every 4 hours). When the card is full, staff redeem the reward.
// The owner (logged in) sees every member and can stamp or redeem by phone number from the studio.
//   loy:<page>:<phone>  = { name, phone, s: stamps, r: rewards claimed, tok, at, last, h: [{t, k: "s"|"r", by: "pin"|"owner"}] }
//   loy-m:<page>        = sorted set of phones by last activity
//   loy-pin:<page>      = { salt, hash } (staff PIN, never sent anywhere)
const crypto = require("crypto");
const db = require("./_db");
const pay = require("./_pay");
// Paid add-on (₹300, or ₹799 with the page): runs only once bought, or for free while payments aren't set up yet.
const unlocked = m => !!m.loyalty || !pay.configured();

const ID = /^[a-z0-9]{8,16}$/i, COOL = 4 * 3600e3, MAXM = 2000;
const ph10 = p => { const d = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? d : ""; };
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n);
const hash = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString("hex");
const E = (status, error, x) => ({ status, error, ...(x || {}) });

async function shop(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  if (!m || m.kind !== "biz") return null;
  const l = (m.data && m.data.loy) || {}, n = Math.round(+l.n);
  const cfg = unlocked(m) && l.on && n >= 2 && n <= 30 ? { n, r: clip(l.r, 40) || "A free treat" } : null;
  return { m, cfg, live: m.paid !== false, paid: unlocked(m) };
}
const key = (id, p) => "loy:" + id + ":" + p;
const view = (c, cfg) => ({ name: c.name, phone: c.phone, s: Math.min(c.s, cfg.n), n: cfg.n, reward: cfg.r, ready: c.s >= cfg.n, rewards: c.r || 0, visits: c.v || 0, last: c.last || 0,
  wait: c.lastStamp && Date.now() - c.lastStamp < COOL ? COOL - (Date.now() - c.lastStamp) : 0 });
const own = c => ({ ...c, tok: undefined, h: (c.h || []).slice(-10) });

async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }
async function pinOk(id, pin, ip) {
  const p = await db.getj("loy-pin:" + id);
  if (!p) return E(409, "The shop hasn't set a staff PIN yet. The owner can add your stamp from their phone.");
  const rk = "loy-try:" + id + ":" + ip;
  if (+(await db.cmd("GET", rk)) >= 8) return E(429, "Too many wrong PINs. Please wait 15 minutes.");
  const a = Buffer.from(hash(String(pin || ""), p.salt), "hex"), b = Buffer.from(p.hash, "hex");
  if (!/^\d{4}$/.test(String(pin || "")) || !crypto.timingSafeEqual(a, b)) { await limit(rk, 999, 900); return E(401, "That PIN isn't right. Staff only."); }
  await db.cmd("DEL", rk); return null;
}
function addStamp(c, cfg, by) {
  if (c.s >= cfg.n) return E(409, "This card is full. Claim the " + cfg.r + " first.");
  if (by === "pin" && c.lastStamp && Date.now() - c.lastStamp < COOL) {
    const mins = Math.ceil((COOL - (Date.now() - c.lastStamp)) / 6e4);
    return E(429, "Today's stamp is already on the card. Next one after " + (mins >= 60 ? Math.floor(mins / 60) + " h " + (mins % 60) + " min" : mins + " min") + ".");
  }
  c.s++; c.v = (c.v || 0) + 1; c.lastStamp = c.last = Date.now(); c.h = (c.h || []).concat({ t: c.last, k: "s", by }).slice(-50); return null;
}
function redeem(c, cfg, by) {
  if (c.s < cfg.n) return E(409, "Not yet: " + (cfg.n - c.s) + " more visit" + (cfg.n - c.s > 1 ? "s" : "") + " to go.");
  c.s -= cfg.n; c.r = (c.r || 0) + 1; c.last = Date.now(); c.h = (c.h || []).concat({ t: c.last, k: "r", by }).slice(-50); return null;
}
async function save(id, c) { await db.setj(key(id, c.phone), c); await db.cmd("ZADD", "loy-m:" + id, c.last || Date.now(), c.phone); }
async function newCard(id, phone, name) {
  if (+(await db.cmd("ZCARD", "loy-m:" + id)) >= MAXM) return null;
  return { name: clip(name, 40) || "Customer", phone, s: 0, r: 0, tok: crypto.randomBytes(12).toString("hex"), at: Date.now(), last: Date.now(), h: [] };
}

// b = request body, ctx = { ip, user: async () => logged-in customer or null }
async function handle(b, ctx) {
  const a = String(b.action || ""), id = String(b.id || "");
  const sh = await shop(id);
  if (!sh) return E(404, "This shop page wasn't found.");

  // ---------- owner (logged in): PIN, members, stamp/redeem by phone ----------
  if (a.startsWith("loy-own")) {
    const u = await ctx.user();
    if (!u || u.id !== sh.m.owner) return E(401, "Please log in as the owner of this page.");
    if (a === "loy-own-pin") {
      const pin = String(b.pin || "");
      if (!/^\d{4}$/.test(pin)) return E(400, "The staff PIN must be 4 numbers.");
      if (/^(\d)\1{3}$|^1234$|^0000$/.test(pin)) return E(400, "Pick a PIN that's harder to guess than " + pin + ".");
      const salt = crypto.randomBytes(12).toString("hex"); await db.setj("loy-pin:" + id, { salt, hash: hash(pin, salt), at: Date.now() });
      return { ok: true, pin: true };
    }
    if (a === "loy-own-list") {
      const phones = await db.cmd("ZRANGE", "loy-m:" + id, 0, 499, "REV");
      const cs = phones.length ? await db.cmd("MGET", ...phones.map(p => key(id, p))) : [];
      const list = cs.map(v => { try { return v && JSON.parse(v); } catch (e) { return null; } }).filter(Boolean).map(own);
      const wk = Date.now() - 7 * 864e5;
      return { ok: true, unlocked: sh.paid, pin: !!(await db.cmd("EXISTS", "loy-pin:" + id)), cfg: sh.cfg, members: list,
        sum: { members: list.length, week: list.reduce((n, c) => n + (c.h || []).filter(x => x.k === "s" && x.t >= wk).length, 0), rewards: list.reduce((n, c) => n + (c.r || 0), 0), ready: list.filter(c => sh.cfg && c.s >= sh.cfg.n).length } };
    }
    if (!sh.paid) return E(402, "Unlock the loyalty card add-on first.");
    if (!sh.cfg) return E(409, "Turn on the loyalty card and save your page first.");
    const phone = ph10(b.phone); if (!phone) return E(400, "Enter the customer's 10-digit mobile number.");
    let c = await db.getj(key(id, phone));
    if (a === "loy-own-stamp") {
      if (!c && !(c = await newCard(id, phone, b.name))) return E(429, "This card has reached its member limit.");
      if (b.name && c.name === "Customer") c.name = clip(b.name, 40);
      const err = addStamp(c, sh.cfg, "owner"); if (err) return err;
      await save(id, c); return { ok: true, card: own(c) };
    }
    if (a === "loy-own-redeem") {
      if (!c) return E(404, "No card for that number yet.");
      const err = redeem(c, sh.cfg, "owner"); if (err) return err;
      await save(id, c); return { ok: true, card: own(c) };
    }
    return E(400, "Unknown action.");
  }

  // ---------- customer, on the shop's page ----------
  if (!sh.live || !sh.cfg) return E(409, "This shop's loyalty card isn't running right now.");
  const phone = ph10(b.phone); if (!phone) return E(400, "Enter your 10-digit mobile number.");
  let c = await db.getj(key(id, phone));
  if (a === "loy-join") {
    if (await limit("loy-join:" + ctx.ip, 15, 3600)) return E(429, "Too many tries. Please wait a while.");
    if (!c) { if (!(c = await newCard(id, phone, b.name))) return E(429, "This shop's card is full right now. Ask at the counter."); await save(id, c); }
    return { ok: true, tok: c.tok, card: view(c, sh.cfg) };
  }
  if (!c || !b.tok || String(b.tok) !== c.tok) return E(401, "Please open your card again.", { gone: true });
  if (a === "loy-card") return { ok: true, card: view(c, sh.cfg) };
  if (a === "loy-stamp" || a === "loy-redeem") {
    const bad = await pinOk(id, b.pin, ctx.ip); if (bad) return bad;
    const err = a === "loy-stamp" ? addStamp(c, sh.cfg, "pin") : redeem(c, sh.cfg, "pin"); if (err) return { ...err, card: view(c, sh.cfg) };
    await save(id, c); return { ok: true, card: view(c, sh.cfg) };
  }
  return E(400, "Unknown action.");
}
module.exports = { handle, ph10 };
