// Orders and customers for business pages. Not a route: api/qr.js passes bz-* actions here.
// A customer builds an order on the shop's page and sends it on WhatsApp. The same order is saved here so the
// owner's dashboard can show it (New → Preparing → Ready → Done), add up today's sales and keep a customer list.
//   bzo:<page>:<ref>    = { ref, at, items: [{ n, q, p }], tot, name, phone, mode, addr, note, st, ts: { prep, ready, done } }
//                         a sale the owner records in the shop has mode "walkin", offline: true, pay: cash|upi|card, st "done"
//   bzoz:<page>         = sorted set of order refs by time (newest 2000 kept)
//   bzc:<page>:<phone>  = { name, phone, n: orders, spend, first, last }
//   bzcz:<page>         = sorted set of customer phones by last order
// Prices are always taken from the shop's own menu, never from the customer's phone.
const db = require("./_db");
const { ph10 } = require("./_loyal");

const ID = /^[a-z0-9]{8,16}$/i, REF = /^[A-HJ-NP-Z2-9]{5}$/;
const KEEP = 120 * 86400, MAXO = 2000, MAXC = 5000;
const ST = ["new", "prep", "ready", "done", "cancel"];
const MODES = ["pickup", "delivery", "table"];
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const num = p => { const x = /(\d[\d,]*(?:\.\d+)?)/.exec(String(p || "").replace(/\s/g, "")); return x ? +x[1].replace(/,/g, "") : null; };
const E = (status, error) => ({ status, error });

async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };

// The customer's phone sends { id, ref, items: [["0.2", 2], …], name, phone, mode, addr, note }.
async function placeOrder(b, ip) {
  const m = await page(b.id);
  if (!m || m.paid === false) return E(404, "This shop page wasn't found.");
  const d = m.data || {};
  if (!d.ord) return E(409, "This shop isn't taking orders on its page.");
  if (d.shut || d.pause) return E(409, "The shop isn't taking orders right now.");
  const ref = String(b.ref || "");
  if (!REF.test(ref)) return E(400, "Invalid order.");
  if (await limit("bzo-ip:" + ip, 25, 3600) || await limit("bzo-day:" + b.id, 600, 86400)) return E(429, "Too many orders. Please wait a little.");
  const menu = Array.isArray(d.menu) ? d.menu : [], items = [];
  for (const [key, q, nm] of (Array.isArray(b.items) ? b.items : []).filter(Array.isArray).slice(0, 40)) {
    const [si, ii] = String(key).split(".").map(Number), x = menu[si] && Array.isArray(menu[si].items) && menu[si].items[ii];
    const qty = Math.round(+q);
    if (!x || !x.n || x.so || !(qty >= 1 && qty <= 99) || (nm && clip(nm, 50) !== clip(x.n, 50))) continue; // menu changed since the page was opened
    const p = num(x.p); if (p == null) continue;
    items.push({ k: si + "." + ii, n: clip(x.n, 50), q: qty, p });
  }
  if (!items.length) return E(400, "Your order is empty.");
  const tot = items.reduce((t, x) => t + x.q * x.p, 0), phone = ph10(b.phone), now = Date.now();
  // Online store: the order is placed on the page itself (no WhatsApp), so a mobile number is needed to reach the customer.
  const direct = require("./_pay").storeOn(m) && b.direct === true;
  if (direct && !phone) return E(400, "Please add your 10-digit mobile number.");
  const o = { ref, at: now, items, tot, name: clip(b.name, 40), phone, mode: MODES.includes(b.mode) ? b.mode : "pickup", addr: clip(b.addr, 160), note: clip(b.note, 160), st: "new", ts: {}, ...(direct ? { direct: true, pay: b.pay === "upi" ? "upi" : "cod" } : {}) };
  if ((await db.cmd("SET", "bzo:" + b.id + ":" + ref, JSON.stringify(o), "NX", "EX", KEEP)) !== "OK") return { ok: true, ref, dup: true };
  await db.cmd("ZADD", "bzoz:" + b.id, now, ref);
  await db.cmd("ZREMRANGEBYRANK", "bzoz:" + b.id, 0, -(MAXO + 1));
  await touchCustomer(b.id, o, now);
  return { ok: true, ref, tot };
}

// Adds an order to the customer's record (orders, spend, last visit), if the order has a phone number.
async function touchCustomer(id, o, now) {
  if (!o.phone) return;
  const ck = "bzc:" + id + ":" + o.phone, c = (await db.getj(ck)) || { phone: o.phone, n: 0, spend: 0, first: now };
  if (c.n || +(await db.cmd("ZCARD", "bzcz:" + id)) < MAXC) {
    c.name = o.name || c.name || "Customer"; c.n++; c.spend += o.tot; c.last = now;
    await db.setj(ck, c); await db.cmd("ZADD", "bzcz:" + id, now, o.phone);
  }
}
const RA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const mkRef = () => Array.from(require("crypto").randomBytes(5), x => RA[x % RA.length]).join("");

// Keepsake Pro only. The owner records a sale made in the shop: { id, items: [["0.2", 2], …], custom: [{ n, q, p }], disc, pay, name, phone, note }.
// It is saved like any order, already Done, marked offline, so it counts in sales, top items and the customer list.
async function ownerSale(id, m, b) {
  if (!((m.proUntil || 0) > Date.now())) return E(402, "Add sale is part of Keepsake Pro. Start Pro on your dashboard.");
  if (await limit("bzsale-day:" + id, 400, 86400)) return E(429, "That's a lot of sales for one day. Try again tomorrow.");
  const menu = Array.isArray((m.data || {}).menu) ? m.data.menu : [], items = [];
  for (const [key, q] of (Array.isArray(b.items) ? b.items : []).filter(Array.isArray).slice(0, 40)) {
    const [si, ii] = String(key).split(".").map(Number), x = menu[si] && Array.isArray(menu[si].items) && menu[si].items[ii];
    const qty = Math.round(+q), p = x && num(x.p);
    if (!x || !x.n || p == null || !(qty >= 1 && qty <= 999)) continue;
    items.push({ k: si + "." + ii, n: clip(x.n, 50), q: qty, p });
  }
  for (const x of (Array.isArray(b.custom) ? b.custom : []).slice(0, 20)) {
    const n = clip(x && x.n, 50), qty = Math.round(+(x && x.q)), p = Math.round(+(x && x.p) * 100) / 100;
    if (n && qty >= 1 && qty <= 999 && p >= 0 && p <= 1e6) items.push({ n, q: qty, p });
  }
  if (!items.length) return E(400, "Add at least one item.");
  const sub = items.reduce((t, x) => t + x.q * x.p, 0), disc = Math.min(sub, Math.max(0, Math.round(+b.disc || 0))), tot = sub - disc, now = Date.now();
  const o = { at: now, items, tot, name: clip(b.name, 40), phone: ph10(b.phone), mode: "walkin", addr: "", note: clip(b.note, 160), st: "done", ts: { done: now }, offline: true, pay: ["cash", "upi", "card"].includes(b.pay) ? b.pay : "cash", ...(disc ? { disc } : {}) };
  for (let k = 0; k < 6; k++) {
    o.ref = mkRef();
    if ((await db.cmd("SET", "bzo:" + id + ":" + o.ref, JSON.stringify(o), "NX", "EX", KEEP)) !== "OK") continue;
    await db.cmd("ZADD", "bzoz:" + id, now, o.ref);
    await db.cmd("ZREMRANGEBYRANK", "bzoz:" + id, 0, -(MAXO + 1));
    await touchCustomer(id, o, now);
    return { ok: true, order: o };
  }
  return E(500, "Couldn't save the sale. Please try again.");
}

async function handle(b, ctx) {
  const a = String(b.action || "");
  if (a === "bz-order") return placeOrder(b, ctx.ip);
  // The customer's phone checks its order (only the status, nothing personal).
  if (a === "bz-status") {
    if (!ID.test(String(b.id || "")) || !REF.test(String(b.ref || ""))) return E(400, "Invalid order.");
    if (await limit("bzs-ip:" + ctx.ip, 240, 3600)) return E(429, "Too many requests.");
    const o = await db.getj("bzo:" + b.id + ":" + b.ref); return o ? { ok: true, st: o.st, tot: o.tot, at: o.at, mode: o.mode, items: (o.items || []).map(x => ({ n: x.n, q: x.q })), ...(o.direct ? { direct: true, pay: o.pay } : {}) } : E(404, "Order not found.");
  }
  // ---------- owner only ----------
  const m = await page(b.id);
  if (!m) return E(404, "This shop page wasn't found.");
  const u = await ctx.user();
  if (!u || u.id !== m.owner) return E(401, "Please log in as the owner of this page.");
  const id = String(b.id);
  if (a === "bz-own-orders") {
    // Newest first, last 30 days (at most 400): enough for today's list, the week's charts and top items.
    const refs = await db.cmd("ZRANGE", "bzoz:" + id, 0, 399, "REV"), since = Date.now() - 30 * 864e5;
    const os = refs.length ? (await db.cmd("MGET", ...refs.map(r => "bzo:" + id + ":" + r))).map(parse).filter(o => o && o.at >= since) : [];
    return { ok: true, orders: os, now: Date.now() };
  }
  if (a === "bz-own-order") {
    const ref = String(b.ref || ""), st = String(b.st || "");
    if (!REF.test(ref) || !ST.includes(st)) return E(400, "Invalid order.");
    const k = "bzo:" + id + ":" + ref, o = await db.getj(k);
    if (!o) return E(404, "That order wasn't found.");
    o.st = st; o.ts = o.ts || {}; o.ts[st] = Date.now();
    await db.cmd("SET", k, JSON.stringify(o), "EX", KEEP);
    return { ok: true, order: o };
  }
  if (a === "bz-own-sale") return ownerSale(id, m, b);
  if (a === "bz-own-customers") {
    const phones = await db.cmd("ZRANGE", "bzcz:" + id, 0, 1499, "REV");
    const cs = phones.length ? (await db.cmd("MGET", ...phones.map(p => "bzc:" + id + ":" + p))).map(parse).filter(Boolean) : [];
    return { ok: true, customers: cs };
  }
  return E(400, "Unknown action.");
}
module.exports = { handle };
