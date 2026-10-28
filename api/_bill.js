// GST bills for business pages (Keepsake Pro; 10 free bills on Start). Not a route: api/qr.js passes bl-* actions here.
//   blset:<page>          = { gst: "regular"|"none", gstin, legal, addr, state, prefix, inc, rate, terms }
//   blno:<page>:<fy>      = last invoice number issued in that financial year (INCR, so numbers never repeat)
//   blcnt:<page>          = bills made in total (for the free bills on Start)
//   bl:<token>            = the bill: seller snapshot, customer, lines, totals, paid state. The token is the public link.
//   blz:<page>            = sorted set of bill tokens by time (newest 5000 kept)
// Totals are always worked out here with assets/gst.v1.js, never taken from the phone.
const db = require("./_db");
const G = require("../assets/gst.v1.js");
const { ph10 } = require("./_loyal");

const ID = /^[a-z0-9]{8,16}$/i, TOK = /^[a-z0-9]{12,20}$/;
const FREE = 10, MAXB = 5000;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error) => ({ status, error });
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }
async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const isPro = m => (m.proUntil || 0) > Date.now();

function cleanSettings(b) {
  const gst = b.gst === "none" ? "none" : "regular", gstin = clip(b.gstin, 15).toUpperCase().replace(/\s/g, "");
  if (gst === "regular" && !G.gstinOk(gstin)) return E(400, "That GSTIN doesn't look right. Check the 15 characters.");
  const state = gst === "regular" ? gstin.slice(0, 2) : (G.STATES[String(b.state || "")] ? String(b.state) : "08");
  const prefix = clip(b.prefix || "INV", 5).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "INV";
  const rate = G.RATES.includes(+b.rate) ? +b.rate : 18;
  return { gst, gstin: gst === "regular" ? gstin : "", legal: clip(b.legal, 80), addr: clip(b.addr, 200), state, prefix, inc: b.inc !== false, rate, terms: clip(b.terms, 300) };
}

function cleanLines(items) {
  const out = [];
  for (const x of (Array.isArray(items) ? items : []).slice(0, 60)) {
    if (!x) continue;
    const n = clip(x.n, 80), q = Math.round(+x.q * 1000) / 1000, p = Math.round(+x.p * 100) / 100, r = +x.r, dp = Math.round(+x.dp * 100) / 100 || 0;
    if (!n || !(q > 0 && q <= 99999) || !(p >= 0 && p <= 1e8) || !G.RATES.includes(r) || dp < 0 || dp > 100) continue;
    out.push({ n, hsn: clip(x.hsn, 8).replace(/[^0-9]/g, ""), q, p, r, dp, u: clip(x.u, 8) });
  }
  return out;
}

// The public part of a bill: what the customer's link shows.
const pub = b => ({ t: b.t, no: b.no, at: b.at, kind: b.kind, seller: b.seller, cust: b.cust, inc: b.inc, calc: b.calc, terms: b.terms, note: b.note, paid: !!b.paid, cancel: !!b.cancel });

async function create(id, m, b) {
  const set = await db.getj("blset:" + id);
  if (!set) return E(409, "Add your GST details first.");
  const used = +(await db.cmd("GET", "blcnt:" + id)) || 0;
  if (!isPro(m) && used >= FREE) return E(402, "You've used your " + FREE + " free bills. Start Keepsake Pro for unlimited bills.");
  if (await limit("bl-day:" + id, 500, 86400)) return E(429, "That's a lot of bills for one day. Try again tomorrow.");
  const lines = cleanLines(b.items);
  if (!lines.length) return E(400, "Add at least one item.");
  const c = b.cust || {}, cg = clip(c.gstin, 15).toUpperCase().replace(/\s/g, "");
  if (cg && !G.gstinOk(cg)) return E(400, "The customer's GSTIN doesn't look right.");
  const cust = { name: clip(c.name, 80), phone: ph10(c.phone), gstin: cg, addr: clip(c.addr, 200), state: cg ? cg.slice(0, 2) : (G.STATES[String(c.state || "")] ? String(c.state) : set.state) };
  const gst = set.gst === "regular", inc = typeof b.inc === "boolean" ? b.inc : set.inc;
  const calc = G.calc(lines, { gst, inc, seller: set.state, pos: cust.state });
  if (!(calc.total > 0)) return E(400, "The bill total is zero.");
  const d = m.data || {}, now = Date.now(), fy = G.fy(now), n = await db.cmd("INCR", "blno:" + id + ":" + fy);
  const no = set.prefix + "/" + fy.slice(2) + "/" + String(n).padStart(4, "0"); // ≤ 16 characters, as GST rules ask
  const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? { id: d.upi.id, name: clip(d.upi.name || d.t, 60) } : null;
  const seller = { name: clip(d.t, 80), legal: set.legal, gstin: set.gstin, state: set.state, addr: set.addr || clip(d.addr, 200), phone: ph10(d.wa || d.phone), logo: /^\/api\/img\?id=|^https:\/\//.test(d.logo || "") ? d.logo : "", upi, page: id };
  const bill = { t: "", page: id, no, at: now, kind: gst ? "tax" : "supply", seller, cust, inc, lines, calc, terms: set.terms, note: clip(b.note, 200), paid: b.paid === true ? { at: now, mode: ["cash", "upi", "card", "bank"].includes(b.mode) ? b.mode : "cash" } : null, cancel: null };
  for (let k = 0; k < 5; k++) {
    bill.t = db.rid(14);
    if ((await db.cmd("SET", "bl:" + bill.t, JSON.stringify(bill), "NX")) !== "OK") continue;
    await db.cmd("ZADD", "blz:" + id, now, bill.t);
    await db.cmd("ZREMRANGEBYRANK", "blz:" + id, 0, -(MAXB + 1));
    await db.cmd("INCR", "blcnt:" + id);
    return { ok: true, bill: pub(bill), used: used + 1 };
  }
  return E(500, "Couldn't save the bill. Please try again.");
}

async function handle(b, ctx) {
  const a = String(b.action || "");
  // Anyone with the link sees the bill (the token is long and random).
  if (a === "bl-get") {
    if (!TOK.test(String(b.t || ""))) return E(400, "Invalid bill link.");
    if (await limit("blg-ip:" + ctx.ip, 300, 3600)) return E(429, "Too many requests.");
    const bill = await db.getj("bl:" + b.t);
    return bill ? { ok: true, bill: pub(bill) } : E(404, "This bill wasn't found.");
  }
  // ---------- owner only ----------
  const m = await page(b.id);
  if (!m) return E(404, "This shop page wasn't found.");
  const u = await ctx.user();
  if (!u || u.id !== m.owner) return E(401, "Please log in as the owner of this page.");
  const id = String(b.id);
  if (a === "bl-home") {
    const set = await db.getj("blset:" + id), used = +(await db.cmd("GET", "blcnt:" + id)) || 0;
    const ts = await db.cmd("ZRANGE", "blz:" + id, 0, 499, "REV");
    const bills = ts.length ? (await db.cmd("MGET", ...ts.map(t => "bl:" + t))).map(parse).filter(Boolean).map(x => ({ t: x.t, no: x.no, at: x.at, name: x.cust.name, phone: x.cust.phone, total: x.calc.total, tax: x.calc.tax, paid: !!x.paid, cancel: !!x.cancel })) : [];
    return { ok: true, settings: set, used, free: FREE, pro: isPro(m), bills };
  }
  if (a === "bl-settings") {
    const s = cleanSettings(b.settings || {}); if (s.error) return s;
    await db.setj("blset:" + id, s);
    return { ok: true, settings: s };
  }
  if (a === "bl-create") return create(id, m, b);
  if (a === "bl-paid" || a === "bl-cancel") {
    const t = String(b.t || ""); if (!TOK.test(t)) return E(400, "Invalid bill.");
    const bill = await db.getj("bl:" + t);
    if (!bill || bill.page !== id) return E(404, "That bill wasn't found.");
    if (a === "bl-paid") bill.paid = b.paid === false ? null : { at: Date.now(), mode: ["cash", "upi", "card", "bank"].includes(b.mode) ? b.mode : "cash" };
    else bill.cancel = b.cancel === false ? null : { at: Date.now() }; // a GST invoice is never deleted, only marked cancelled
    await db.setj("bl:" + t, bill);
    return { ok: true, bill: pub(bill) };
  }
  return E(400, "Unknown action.");
}
module.exports = { handle, cleanLines, cleanSettings, FREE };
