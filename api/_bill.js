// GST bills for business pages (Keepsake Pro; 10 free bills on Start). Not a route: api/qr.js passes bl-* actions here.
//   blset:<page>          = { gst: "regular"|"none", gstin, legal, addr, state, prefix, inc, rate, hsn, u, terms }
//   blno:<page>:<fy>      = last invoice number issued in that financial year (INCR, so numbers never repeat)
//   blcnt:<page>          = bills made in total (for the free bills on Start)
//   bl:<token>            = the bill: seller snapshot, customer, lines, totals, paid state. The token is the public link.
//   blz:<page>            = sorted set of bill tokens by time (newest 50000 kept), for the bill list
//   blm:<page>:<YYYY-MM>  = sorted set of the month's bill tokens (Indian time), never trimmed: the CA's reports read these
//   blmem:<page>          = { "<item name>": { h: HSN, r: rate, u: unit } } so an item's HSN is typed only once
//   blcak:<page> / blca:<token> = the private link a shop gives its CA (read-only reports)
// Totals are always worked out here with assets/gst.v1.js, never taken from the phone.
// Invoice fields follow Rule 46 of the CGST Rules: serial number unique per financial year (≤ 16 characters),
// HSN/SAC on tax invoices, recipient name and address for registered buyers and for unregistered sales of ₹50,000 or more.
const db = require("./_db");
const G = require("../assets/gst.v1.js");
const { ph10 } = require("./_loyal");

const ID = /^[a-z0-9]{8,16}$/i, TOK = /^[a-z0-9]{12,20}$/, YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const FREE = 10, MAXB = 50000, MAXMEM = 3000, B2C_ADDR = 50000;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error) => ({ status, error });
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const hsnOf = v => String(v == null ? "" : v).replace(/[^0-9]/g, "").slice(0, 8);
const unitOf = (v, h) => G.UQC[String(v || "").toUpperCase()] ? String(v).toUpperCase() : (G.isService(h) ? "NA" : "NOS");
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
  const rate = G.RATES.includes(+b.rate) ? +b.rate : 18, hsn = hsnOf(b.hsn);
  if (hsn && hsn.length < 4) return E(400, "The HSN/SAC code needs at least 4 digits.");
  return { gst, gstin: gst === "regular" ? gstin : "", legal: clip(b.legal, 80), addr: clip(b.addr, 200), state, prefix, inc: b.inc !== false, rate, hsn, u: unitOf(b.u, hsn), terms: clip(b.terms, 300) };
}

function cleanLines(items) {
  const out = [];
  for (const x of (Array.isArray(items) ? items : []).slice(0, 60)) {
    if (!x) continue;
    const n = clip(x.n, 80), q = Math.round(+x.q * 1000) / 1000, p = Math.round(+x.p * 100) / 100, r = +x.r, dp = Math.round(+x.dp * 100) / 100 || 0, hsn = hsnOf(x.hsn);
    if (!n || !(q > 0 && q <= 99999) || !(p >= 0 && p <= 1e8) || !G.RATES.includes(r) || dp < 0 || dp > 100) continue;
    out.push({ n, hsn, q, p, r, dp, u: unitOf(x.u, hsn) });
  }
  return out;
}

// The public part of a bill: what the customer's link and the CA's reports show.
const pub = b => ({ t: b.t, no: b.no, at: b.at, kind: b.kind, seller: b.seller, cust: b.cust, inc: b.inc, calc: b.calc, terms: b.terms, note: b.note, paid: !!b.paid, pmode: b.paid ? b.paid.mode : "", cancel: !!b.cancel, cancelAt: b.cancel ? b.cancel.at : 0 });

async function create(id, m, b) {
  const set = await db.getj("blset:" + id);
  if (!set) return E(409, "Add your GST details first.");
  const used = +(await db.cmd("GET", "blcnt:" + id)) || 0;
  if (!isPro(m) && used >= FREE) return E(402, "You've used your " + FREE + " free bills. Start Keepsake Pro for unlimited bills.");
  if (await limit("bl-day:" + id, 500, 86400)) return E(429, "That's a lot of bills for one day. Try again tomorrow.");
  const lines = cleanLines(b.items);
  if (!lines.length) return E(400, "Add at least one item.");
  const gst = set.gst === "regular";
  if (gst) { const miss = lines.find(x => x.hsn.length < 4); if (miss) return E(400, `Add the HSN/SAC code (at least 4 digits) for "${miss.n}". GST bills need it.`); }
  const c = b.cust || {}, cg = clip(c.gstin, 15).toUpperCase().replace(/\s/g, "");
  if (cg && !G.gstinOk(cg)) return E(400, "The customer's GSTIN doesn't look right.");
  if (cg && cg === set.gstin) return E(400, "The customer's GSTIN is your own GSTIN.");
  const cust = { name: clip(c.name, 80), phone: ph10(c.phone), gstin: gst ? cg : "", addr: clip(c.addr, 200), state: gst && cg ? cg.slice(0, 2) : (G.STATES[String(c.state || "")] ? String(c.state) : set.state) };
  if (cust.gstin && (!cust.name || !cust.addr)) return E(400, "For a business customer, add their name and address.");
  const inc = typeof b.inc === "boolean" ? b.inc : set.inc;
  const calc = G.calc(lines, { gst, inc, seller: set.state, pos: cust.state });
  if (!(calc.total > 0)) return E(400, "The bill total is zero.");
  if (gst && !cust.gstin && calc.taxable >= B2C_ADDR && (!cust.name || !cust.addr)) return E(400, "For a sale of ₹50,000 or more, add the customer's name and address. GST rules ask for it.");
  const d = m.data || {}, now = Date.now(), fy = G.fy(now), n = await db.cmd("INCR", "blno:" + id + ":" + fy);
  const no = set.prefix + "/" + fy.slice(2) + "/" + String(n).padStart(4, "0"); // ≤ 16 characters, as GST rules ask
  const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? { id: d.upi.id, name: clip(d.upi.name || d.t, 60) } : null;
  const seller = { name: clip(d.t, 80), legal: set.legal, gstin: set.gstin, state: set.state, addr: set.addr || clip(d.addr, 200), phone: ph10(d.wa || d.phone), logo: /^\/api\/img\?id=|^https:\/\//.test(d.logo || "") ? d.logo : "", upi };
  const bill = { t: "", page: id, no, at: now, kind: gst ? "tax" : "supply", seller, cust, inc, lines, calc, terms: set.terms, note: clip(b.note, 200), paid: b.paid === true ? { at: now, mode: ["cash", "upi", "card", "bank"].includes(b.mode) ? b.mode : "cash" } : null, cancel: null };
  for (let k = 0; k < 5; k++) {
    bill.t = db.rid(14);
    if ((await db.cmd("SET", "bl:" + bill.t, JSON.stringify(bill), "NX")) !== "OK") continue;
    await db.cmd("ZADD", "blz:" + id, now, bill.t);
    await db.cmd("ZADD", "blm:" + id + ":" + G.ym(now), now, bill.t);
    await db.cmd("ZREMRANGEBYRANK", "blz:" + id, 0, -(MAXB + 1));
    await db.cmd("INCR", "blcnt:" + id);
    await remember(id, lines);
    return { ok: true, bill: pub(bill), used: used + 1 };
  }
  return E(500, "Couldn't save the bill. Please try again.");
}

async function remember(id, lines) {
  const k = "blmem:" + id, mem = (await db.getj(k)) || {};
  for (const x of lines) { const key = x.n.toLowerCase(); delete mem[key]; mem[key] = { h: x.hsn, r: x.r, u: x.u }; }
  const keys = Object.keys(mem); for (const key of keys.slice(0, Math.max(0, keys.length - MAXMEM))) delete mem[key];
  await db.setj(k, mem);
}

async function monthBills(id, ym) {
  const ts = await db.cmd("ZRANGE", "blm:" + id + ":" + ym, 0, -1);
  const out = [];
  for (let i = 0; i < ts.length; i += 200) out.push(...(await db.cmd("MGET", ...ts.slice(i, i + 200).map(t => "bl:" + t))).map(parse).filter(Boolean));
  return out.sort((a, b) => a.at - b.at).map(pub);
}
// The last 18 months with how many bills each has (the current month always listed).
async function months(id) {
  const out = [], x = G.ist(Date.now());
  for (let i = 0; i < 18; i++) {
    let y = x.y, mo = x.m - i; while (mo < 1) { mo += 12; y--; }
    const ym = y + "-" + String(mo).padStart(2, "0"), n = +(await db.cmd("ZCARD", "blm:" + id + ":" + ym)) || 0;
    if (n || i === 0) out.push({ ym, n });
  }
  return out;
}
const shopInfo = async (id, m) => { const s = (await db.getj("blset:" + id)) || {}; return { name: clip((m.data || {}).t, 80), legal: s.legal || "", gstin: s.gstin || "", state: s.state || "", gst: s.gst || "regular" }; };

async function handle(b, ctx) {
  const a = String(b.action || "");
  // Anyone with the link sees the bill (the token is long and random).
  if (a === "bl-get") {
    if (!TOK.test(String(b.t || ""))) return E(400, "Invalid bill link.");
    if (await limit("blg-ip:" + ctx.ip, 300, 3600)) return E(429, "Too many requests.");
    const bill = await db.getj("bl:" + b.t);
    return bill ? { ok: true, bill: pub(bill) } : E(404, "This bill wasn't found.");
  }
  // The shop's CA: read-only reports through the private link the owner shared.
  if (a === "bl-ca-home" || a === "bl-ca-month") {
    if (!TOK.test(String(b.k || ""))) return E(400, "Invalid link.");
    if (await limit("blca-ip:" + ctx.ip, 300, 3600)) return E(429, "Too many requests.");
    const pid = await db.cmd("GET", "blca:" + b.k), m = pid && await page(pid);
    if (!m) return E(404, "This link was turned off by the shop.");
    if (a === "bl-ca-home") return { ok: true, shop: await shopInfo(pid, m), months: await months(pid) };
    if (!YM.test(String(b.ym || ""))) return E(400, "Pick a month.");
    return { ok: true, shop: await shopInfo(pid, m), ym: b.ym, bills: await monthBills(pid, b.ym) };
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
    return { ok: true, settings: set, used, free: FREE, pro: isPro(m), bills, mem: (await db.getj("blmem:" + id)) || {}, ca: (await db.cmd("GET", "blcak:" + id)) || "", months: await months(id) };
  }
  if (a === "bl-settings") {
    const s = cleanSettings(b.settings || {}); if (s.error) return s;
    await db.setj("blset:" + id, s);
    return { ok: true, settings: s };
  }
  if (a === "bl-create") return create(id, m, b);
  if (a === "bl-month") { if (!YM.test(String(b.ym || ""))) return E(400, "Pick a month."); return { ok: true, shop: await shopInfo(id, m), ym: b.ym, bills: await monthBills(id, b.ym) }; }
  if (a === "bl-ca") {
    const old = await db.cmd("GET", "blcak:" + id);
    if (old) { await db.cmd("DEL", "blca:" + old); await db.cmd("DEL", "blcak:" + id); }
    if (b.on === false) return { ok: true, ca: "" };
    const k = db.rid(16); await db.cmd("SET", "blca:" + k, id); await db.cmd("SET", "blcak:" + id, k);
    return { ok: true, ca: k };
  }
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
