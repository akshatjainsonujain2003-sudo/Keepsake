// Smart Udhaar (Keepsake Pro): the shop's credit book, with customer confirmation, UPI reminders and recovery totals.
// Not a route: api/qr.js passes kh-* actions here.
//   kh:<page>:<phone>  = { name, phone, lim, tok, e: [{ id, t, a, note, src, ok, by }], nr: reminders sent, lr: last reminder, at, last }
//                        a > 0: udhaar given (customer owes more); a < 0: payment received. Balance = sum of a.
//                        ok = time the customer confirmed the entry on their own phone (proof for the shop).
//                        claims (customer says "I've paid") are kept in c: [{ id, t, a }] until the shop accepts or rejects them.
//   khz:<page>         = sorted set of customer phones by last activity
//   khc:<token>        = "<page>:<phone>", the customer's private khata link (/u/<token>)
// The shop needs Pro to add new udhaar. When Pro ends it can still see the book, record payments and send reminders.
const crypto = require("crypto");
const db = require("./_db");
const { ph10 } = require("./_loyal");

const ID = /^[a-z0-9]{8,16}$/i, TOK = /^[a-f0-9]{16}$/, EID = /^[a-z0-9]{6,12}$/;
const MAXC = 3000, MAXE = 200, DAY = 864e5, DUE_DAYS = 30;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error) => ({ status, error });
const money = n => "₹" + Math.round(n).toLocaleString("en-IN");
const amt = v => { const x = Math.round(+String(v == null ? "" : v).replace(/[^\d.]/g, "")); return x >= 1 && x <= 1000000 ? x : 0; };
const rid = () => crypto.randomBytes(5).toString("hex").slice(0, 8);
const key = (id, p) => "kh:" + id + ":" + p;
const isPro = m => (m.proUntil || 0) > Date.now();
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }
async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const bal = c => (c.e || []).reduce((t, x) => t + x.a, 0);
// Days since the oldest udhaar that isn't paid off yet (payments clear the oldest entries first).
function age(c, now = Date.now()) {
  let paid = -(c.e || []).filter(x => x.a < 0).reduce((t, x) => t + x.a, 0);
  for (const x of (c.e || []).filter(x => x.a > 0).sort((a, b) => a.t - b.t)) { if (paid >= x.a) { paid -= x.a; continue; } return Math.floor((now - x.t) / DAY); }
  return 0;
}
const summary = c => ({ name: c.name, phone: c.phone, bal: bal(c), lim: c.lim || 0, age: age(c), nr: c.nr || 0, lr: c.lr || 0, last: c.last || 0, tok: c.tok,
  open: (c.e || []).filter(x => x.a > 0 && !x.ok).length, claims: (c.c || []).length });
const customerView = (c, shop) => ({ shop: { name: clip(shop.data && shop.data.t, 60) || "Shop", upi: shop.data && shop.data.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(shop.data.upi.id || "") ? { id: shop.data.upi.id, name: clip(shop.data.upi.name || shop.data.t, 60) } : null, logo: /^\/api\/img\?id=|^https:\/\//.test((shop.data || {}).logo || "") ? shop.data.logo : "", wa: ph10((shop.data || {}).wa || (shop.data || {}).phone) },
  name: c.name, bal: bal(c), e: (c.e || []).slice(-60).reverse().map(x => ({ id: x.id, t: x.t, a: x.a, note: x.note, ok: !!x.ok })), claims: (c.c || []).map(x => ({ t: x.t, a: x.a })) });

// The WhatsApp messages: the shop taps once and WhatsApp opens with the message ready (no paid API).
function message(kind, c, shop, link, extra) {
  const n = c.name && c.name !== "Customer" ? c.name + " ji" : "ji", s = clip(shop.data && shop.data.t, 60) || "hamari dukaan", b = money(bal(c)), d = age(c);
  if (kind === "entry") return `Namaste ${n} 🙏\n${s} mein ${money(extra.a)} udhaar likha gaya hai${extra.note ? " (" + extra.note + ")" : ""}.\nKul baaki: ${b}\n\nSahi hai toh yahan ek tap mein confirm karein, aur jab chahein UPI se pay karein:\n${link}`;
  if (kind === "paid") return `Namaste ${n} 🙏\n${s} mein aapka ${money(-extra.a)} ka payment mil gaya. Dhanyavaad!\n${bal(c) > 0 ? "Ab baaki: " + b : "Aapka khata poora clear hai."}\n\nAapka khata: ${link}`;
  const lvl = Math.min(3, (c.nr || 0) + 1);
  if (lvl === 1) return `Namaste ${n} 🙏\n${s} se ek chhoti si yaad: aapka ${b} baaki hai.\nJab suvidha ho, yahan se UPI se pay kar dein:\n${link}\n\nDhanyavaad!`;
  if (lvl === 2) return `Namaste ${n},\n${s} mein aapka ${b}${d ? " " + d + " din se" : ""} baaki hai. Kripya is hafte pay kar dein:\n${link}\n\nKoi sawaal ho toh isi number pe message karein.`;
  return `Namaste ${n},\n${s} mein ${b} ka bhugtan abhi tak baaki hai${d ? " (" + d + " din)" : ""}. Kripya aaj hi pay karein, ya humse baat karein:\n${link}`;
}

async function load(id, phone) { return await db.getj(key(id, phone)); }
async function save(id, c) { c.last = Date.now(); await db.setj(key(id, c.phone), c); await db.cmd("ZADD", "khz:" + id, c.last, c.phone); }
async function create(id, phone, name) {
  if (+(await db.cmd("ZCARD", "khz:" + id)) >= MAXC) return null;
  const tok = crypto.randomBytes(8).toString("hex");
  await db.cmd("SET", "khc:" + tok, id + ":" + phone);
  return { name: clip(name, 40) || "Customer", phone, lim: 0, tok, e: [], c: [], nr: 0, lr: 0, at: Date.now() };
}
const link = (base, c) => base + "/u/" + c.tok;

// A full payment within 30 days of the oldest udhaar earns a loyalty stamp (if the shop's loyalty card is on).
async function onTimeStamp(id, shop, c, before, ageBefore) {
  if (before <= 0 || bal(c) > 0 || ageBefore > DUE_DAYS) return null;
  if (shop.data && shop.data.loy && shop.data.loy.kh === false) return null;
  try { return await require("./_loyal").orderStamp(id, c.phone, c.name); } catch (e) { return null; }
}

async function handle(b, ctx) {
  const a = String(b.action || ""), base = "https://getkeepsake.in";
  // ---------- customer, from their private link ----------
  if (a === "kh-view" || a === "kh-confirm" || a === "kh-claim") {
    const tok = String(b.tok || ""); if (!TOK.test(tok)) return E(404, "This khata link isn't valid.");
    if (await limit("khv-ip:" + ctx.ip, 300, 3600)) return E(429, "Too many requests. Please wait a little.");
    const ref = await db.cmd("GET", "khc:" + tok); if (!ref) return E(404, "This khata link isn't valid any more.");
    const [id, phone] = String(ref).split(":"); const shop = await page(id), c = shop && await load(id, phone);
    if (!c || c.tok !== tok) return E(404, "This khata link isn't valid any more.");
    if (a === "kh-confirm") {
      const all = b.eid === "all", xs = (c.e || []).filter(y => y.a > 0 && !y.ok && (all || y.id === String(b.eid || "")));
      if (!all && !xs.length && !(c.e || []).some(y => y.id === String(b.eid || "") && y.a > 0)) return E(404, "That entry wasn't found.");
      if (xs.length) { const t = Date.now(); xs.forEach(y => { y.ok = t; }); await save(id, c); }
    }
    if (a === "kh-claim") { // "I've paid": waits for the shop to accept it
      const v = amt(b.amount); if (!v) return E(400, "Enter the amount you paid.");
      if (v > bal(c)) return E(400, "That's more than what's pending (" + money(bal(c)) + ").");
      if ((c.c || []).length >= 5) return E(429, "The shop hasn't checked your last payments yet.");
      c.c = [...(c.c || []), { id: rid(), t: Date.now(), a: v }]; await save(id, c);
    }
    return { ok: true, khata: customerView(c, shop) };
  }

  // ---------- shop owner ----------
  const m = await page(b.id); if (!m) return E(404, "This shop page wasn't found.");
  const u = await ctx.user(); if (!u || u.id !== m.owner) return E(401, "Please log in as the owner of this page.");
  const id = String(b.id), pro = isPro(m);
  if (a === "kh-own-list") {
    const phones = await db.cmd("ZRANGE", "khz:" + id, 0, MAXC - 1, "REV");
    const cs = [];
    for (let i = 0; i < phones.length; i += 200) (await db.cmd("MGET", ...phones.slice(i, i + 200).map(p => key(id, p)))).forEach(v => { try { if (v) cs.push(JSON.parse(v)); } catch (e) {} });
    const now = Date.now(), m0 = new Date(now + 5.5 * 3600e3); m0.setUTCDate(1); m0.setUTCHours(0, 0, 0, 0); const monthStart = m0.getTime() - 5.5 * 3600e3;
    const list = cs.map(summary);
    const recovered = cs.reduce((t, c) => t + (c.e || []).filter(x => x.a < 0 && x.t >= monthStart).reduce((s, x) => s - x.a, 0), 0);
    return { ok: true, pro, customers: list, sum: { pending: list.reduce((t, x) => t + Math.max(0, x.bal), 0), due: list.filter(x => x.bal > 0).length, overdue: list.filter(x => x.bal > 0 && x.age > DUE_DAYS).length, recovered, claims: list.reduce((t, x) => t + x.claims, 0) } };
  }
  const phone = ph10(b.phone); if (!phone) return E(400, "Enter the customer's 10-digit mobile number.");
  let c = await load(id, phone);
  if (a === "kh-own-get") { if (!c) return E(404, "No khata for this number yet."); return { ok: true, customer: { ...summary(c), e: (c.e || []).slice().reverse(), c: c.c || [] }, link: link(base, c) }; }
  if (a === "kh-own-add") {
    const give = b.kind !== "pay", v = amt(b.amount); if (!v) return E(400, "Enter the amount.");
    if (give && !pro) return E(402, "Adding new udhaar is part of Keepsake Pro. You can still record payments and send reminders.");
    if (!c) { if (!give) return E(404, "This customer has no udhaar to pay."); if (!(c = await create(id, phone, b.name))) return E(429, "Your khata has reached its customer limit."); }
    if (b.name && (c.name === "Customer" || b.rename)) c.name = clip(b.name, 40);
    if (!give && v > bal(c)) return E(400, "That's more than what's pending (" + money(bal(c)) + ").");
    // Credit limit and long-pending warnings: the shop sees them and can go ahead anyway.
    if (give && !b.force) {
      if (c.lim && bal(c) + v > c.lim) return { ok: false, warn: `${c.name} will owe ${money(bal(c) + v)}, above the limit of ${money(c.lim)}. Give it anyway?` };
      if (bal(c) > 0 && age(c) > 45) return { ok: false, warn: `${c.name} already owes ${money(bal(c))} for ${age(c)} days. Give more udhaar anyway?` };
    }
    const before = bal(c), ageBefore = age(c), src = clip(b.src, 40);
    if (src && (c.e || []).some(x => x.src === src && x.a > 0) && give) return E(409, "This is already in the khata.");
    const x = { id: rid(), t: Date.now(), a: give ? v : -v, note: clip(b.note, 80), ...(src ? { src } : {}), by: "shop" };
    c.e = [...(c.e || []), x].slice(-MAXE);
    if (!give && b.claim) c.c = (c.c || []).filter(y => y.id !== String(b.claim));
    const stamp = give ? null : await onTimeStamp(id, m, c, before, ageBefore);
    await save(id, c);
    const l = link(base, c);
    return { ok: true, customer: summary(c), entry: x, link: l, stamp, wa: "https://wa.me/91" + phone + "?text=" + encodeURIComponent(message(give ? "entry" : "paid", c, m, l, x)) };
  }
  if (!c) return E(404, "No khata for this number yet.");
  if (a === "kh-own-remind") {
    if (bal(c) <= 0) return E(400, c.name + " has nothing pending.");
    const text = message("remind", c, m, link(base, c));
    c.nr = (c.nr || 0) + 1; c.lr = Date.now(); await save(id, c);
    return { ok: true, customer: summary(c), wa: "https://wa.me/91" + phone + "?text=" + encodeURIComponent(text), text };
  }
  if (a === "kh-own-limit") { const v = Math.round(+b.lim); c.lim = v >= 1 && v <= 1000000 ? v : 0; if (b.name) c.name = clip(b.name, 40); await save(id, c); return { ok: true, customer: summary(c) }; }
  if (a === "kh-own-del") {
    const i = (c.e || []).findIndex(x => x.id === String(b.eid || "")); if (i < 0) return E(404, "That entry wasn't found.");
    c.e.splice(i, 1); await save(id, c); return { ok: true, customer: summary(c) };
  }
  if (a === "kh-own-reject") { c.c = (c.c || []).filter(y => y.id !== String(b.claim || "")); await save(id, c); return { ok: true, customer: summary(c) }; }
  return E(400, "Unknown action.");
}
module.exports = { handle, message, age, bal };
