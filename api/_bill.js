// Keepsake Billing: GST bills, bills of supply, cash memos, estimates and credit notes for business pages
// (Keepsake Pro; 10 free bills on Start). Not a route: api/qr.js passes bl-* actions here.
//   blset:<page>          = { gst: "regular"|"composition"|"none", gstin, legal, addr, state, prefix, inc, rate, hsn, u, terms,
//                             big: turnover over ₹5 crore (6-digit HSN), design: "a4m"|"a4c"|"t58"|"t80", bank: { name, acc, ifsc }, sign }
//   blno:<page>:<fy>      = last bill number issued in that financial year (INCR, so numbers never repeat)
//   blcn:<page>:<fy>      = last credit note number;  bleno:<page>:<fy> = last estimate number
//   blcnt:<page>          = bills made in total (for the free bills on Start; estimates and credit notes don't count)
//   bl:<token>            = the document: seller snapshot, customer, lines, totals, payment. The token is the public link.
//   blz:<page>            = sorted set of document tokens by time (newest 50000 kept), for the list
//   blm:<page>:<YYYY-MM>  = sorted set of the month's bills and credit notes (Indian time), never trimmed: the CA's reports read these
//   blmem:<page>          = { "<item name>": { h: HSN, r: rate, u: unit } } so an item's HSN is typed only once
//   blcu:<page>           = { "<phone>": { name, addr, gstin, state } } so a customer's details are typed only once
//   blcak:<page> / blca:<token> = the private link a shop gives its CA (read-only reports)
// Totals are always worked out here with assets/gst.v2.js, never taken from the phone.
// Rule 46 of the CGST Rules: serial number unique per financial year (≤ 16 characters), HSN/SAC on tax invoices
// (6 digits above ₹5 crore turnover), recipient name and address for registered buyers and for unregistered sales of ₹50,000 or more.
// Rule 49: a composition dealer issues a bill of supply that says it can't collect tax. Rule 53: credit notes for returns.
// A shop that isn't registered for GST issues a plain bill (cash memo) with no GST at all.
const db = require("./_db");
const G = require("../assets/gst.v2.js");
const { ph10 } = require("./_loyal");

const ID = /^[a-z0-9]{8,16}$/i, TOK = /^[a-z0-9]{12,20}$/, YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const FREE = 10, MAXB = 50000, MAXMEM = 3000, B2C_ADDR = 50000;
const KIND = { regular: "tax", composition: "supply", none: "cash" };
const MODES = ["cash", "upi", "card", "bank"];
const DESIGNS = ["a4m", "a4c", "t58", "t80"];
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error) => ({ status, error });
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const hsnOf = v => String(v == null ? "" : v).replace(/[^0-9]/g, "").slice(0, 8);
const unitOf = (v, h) => G.UQC[String(v || "").toUpperCase()] ? String(v).toUpperCase() : (G.isService(h) ? "NA" : "NOS");
const r2 = G.r2;
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }
async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const isPro = m => (m.proUntil || 0) > Date.now();
const imgOk = v => /^\/api\/img\?id=[\w-]{6,64}$/.test(String(v || ""));

function cleanSettings(b) {
  const gst = ["regular", "composition", "none"].includes(b.gst) ? b.gst : "regular", gstin = clip(b.gstin, 15).toUpperCase().replace(/\s/g, "");
  if (gst !== "none" && !G.gstinOk(gstin)) return E(400, "That GSTIN doesn't look right. Check the 15 characters.");
  const state = gst !== "none" ? gstin.slice(0, 2) : (G.STATES[String(b.state || "")] ? String(b.state) : "08");
  const prefix = clip(b.prefix || "INV", 5).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "INV";
  const rate = G.RATES.includes(+b.rate) ? +b.rate : 18, hsn = hsnOf(b.hsn);
  if (hsn && hsn.length < 4) return E(400, "The HSN/SAC code needs at least 4 digits.");
  const bk = b.bank || {}, bank = { name: clip(bk.name, 60), acc: clip(bk.acc, 24).replace(/[^0-9A-Za-z]/g, ""), ifsc: clip(bk.ifsc, 11).toUpperCase().replace(/[^0-9A-Z]/g, "") };
  if (bank.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc)) return E(400, "The IFSC code doesn't look right (11 characters, like SBIN0001234).");
  return { gst, gstin: gst !== "none" ? gstin : "", legal: clip(b.legal, 80), addr: clip(b.addr, 200), state, prefix, inc: b.inc !== false, rate, hsn, u: unitOf(b.u, hsn), terms: clip(b.terms, 300),
    big: gst === "regular" && b.big === true, design: DESIGNS.includes(b.design) ? b.design : "a4m", bank: bank.acc || bank.ifsc || bank.name ? bank : null, sign: imgOk(b.sign) ? b.sign : "" };
}

function cleanLines(items) {
  const out = [];
  for (const x of (Array.isArray(items) ? items : []).slice(0, 80)) {
    if (!x) continue;
    const n = clip(x.n, 80), q = Math.round(+x.q * 1000) / 1000, p = Math.round(+x.p * 100) / 100, r = x.r == null || x.r === "" ? 0 : +x.r, dp = Math.round(+x.dp * 100) / 100 || 0, hsn = hsnOf(x.hsn);
    if (!n || !(q > 0 && q <= 99999) || !(p >= 0 && p <= 1e8) || !G.RATES.includes(r) || dp < 0 || dp > 100) continue;
    out.push({ n, hsn, q, p, r, dp, u: unitOf(x.u, hsn) });
  }
  return out;
}

// The public part of a document: what the customer's link and the CA's reports show.
const pub = b => ({ t: b.t, no: b.no, at: b.at, kind: b.kind, seller: b.seller, cust: b.cust, inc: b.inc, calc: b.calc, terms: b.terms, note: b.note,
  paid: !!b.paid, pmode: b.paid ? b.paid.mode : b.pay ? b.pay.mode : "", rcv: b.pay ? b.pay.amt : b.paid ? b.calc.total : 0, split: b.pay && b.pay.split || null, pvia: b.pay && b.pay.via || "",
  cancel: !!b.cancel, cancelAt: b.cancel ? b.cancel.at : 0, ref: b.ref || null, design: b.design || "a4m", conv: b.conv || "", ret: b.ret || null });
// it: what was sold, for top items (bills from the last 35 days): [name, qty, amount]
const recentItems = x => x.at >= Date.now() - 35 * 864e5 && x.kind !== "est" ? (x.calc.lines || []).filter(l => !l.x).map(l => [l.n, l.q, l.amt]) : undefined;
const row = x => ({ t: x.t, no: x.no, at: x.at, kind: x.kind || "tax", it: recentItems(x), name: x.cust.name, phone: x.cust.phone, total: x.calc.total, tax: x.calc.tax, paid: !!x.paid,
  rcv: x.pay ? x.pay.amt : x.paid ? x.calc.total : 0, cancel: !!x.cancel, ref: x.ref ? x.ref.no : "", conv: x.conv || "" });

function sellerOf(m, set) {
  const d = m.data || {};
  const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? { id: d.upi.id, name: clip(d.upi.name || d.t, 60) } : null;
  return { name: clip(d.t, 80), legal: set.legal, gstin: set.gstin, state: set.state, gtype: set.gst || "regular", addr: set.addr || clip(d.addr, 200), phone: ph10(d.wa || d.phone),
    logo: /^\/api\/img\?id=|^https:\/\//.test(d.logo || "") ? d.logo : "", upi, bank: set.bank || null, sign: set.sign || "" };
}
// Payment: how much was received now and how. Anything not received is the balance (it can go into the Udhaar khata).
function payOf(b, total) {
  const p = b.pay || (b.paid === true ? { mode: b.mode || "cash" } : b.paid === false ? { mode: "due" } : { mode: "cash" });
  const mode = ["cash", "upi", "card", "bank", "split", "part", "due"].includes(p.mode) ? p.mode : "cash";
  if (MODES.includes(mode)) return { mode, amt: total };
  if (mode === "due") return { mode, amt: 0 };
  if (mode === "split") {
    const sp = {}; let s = 0; for (const k of MODES) { const v = r2(Math.max(0, +((p.split || {})[k]) || 0)); if (v) { sp[k] = v; s += v; } }
    if (Math.abs(r2(s) - total) > 0.5) return { error: "The split adds up to ₹" + r2(s) + ", but the bill is ₹" + total + "." };
    return { mode, amt: total, split: sp };
  }
  const amt = r2(+p.amt || 0); // part paid
  if (!(amt > 0) || amt >= total) return { error: "Enter the amount received now (less than ₹" + total + ")." };
  return { mode, amt, via: MODES.includes(p.via) ? p.via : "cash" };
}

async function build(id, m, set, b, kind) {
  const lines = cleanLines(b.items);
  if (!lines.length) return E(400, "Add at least one item.");
  const gst = kind === "tax" || (kind === "est" && set.gst === "regular");
  if (gst) {
    const need = set.big ? 6 : 4, miss = lines.find(x => x.hsn.length < need);
    if (miss) return E(400, `Add the HSN/SAC code (at least ${need} digits) for "${miss.n}". GST bills need it.`);
  } else lines.forEach(x => { x.r = 0; });
  // Delivery charge: a line of its own, taxed like the main item on the bill (a composite supply).
  const del = r2(Math.max(0, +b.del || 0));
  if (del > 0) { const main = lines.slice().sort((a, c) => c.q * c.p - a.q * a.p)[0]; lines.push({ n: "Delivery charges", hsn: main.hsn, q: 1, p: del, r: gst ? main.r : 0, dp: 0, u: "OTH", x: "del" }); }
  const c = b.cust || {}, cg = clip(c.gstin, 15).toUpperCase().replace(/\s/g, "");
  if (cg && !G.gstinOk(cg)) return E(400, "The customer's GSTIN doesn't look right.");
  if (cg && cg === set.gstin) return E(400, "The customer's GSTIN is your own GSTIN.");
  const cust = { name: clip(c.name, 80), phone: ph10(c.phone), gstin: set.gst !== "none" ? cg : "", addr: clip(c.addr, 200), ship: clip(c.ship, 200),
    state: gst && cg ? cg.slice(0, 2) : (G.STATES[String(c.state || "")] ? String(c.state) : set.state) };
  if (cust.gstin && (!cust.name || !cust.addr)) return E(400, "For a business customer, add their name and address.");
  const inc = typeof b.inc === "boolean" ? b.inc : set.inc;
  const calc = G.calc(lines, { gst, inc, seller: set.state, pos: cust.state, bd: b.bd });
  if (!(calc.total > 0)) return E(400, "The bill total is zero.");
  if (gst && !cust.gstin && calc.taxable >= B2C_ADDR && (!cust.name || !cust.addr)) return E(400, "For a sale of ₹50,000 or more, add the customer's name and address. GST rules ask for it.");
  return { lines, cust, inc, calc };
}

async function save(id, doc, inMonth) {
  for (let k = 0; k < 5; k++) {
    doc.t = db.rid(14);
    if ((await db.cmd("SET", "bl:" + doc.t, JSON.stringify(doc), "NX")) !== "OK") continue;
    await db.cmd("ZADD", "blz:" + id, doc.at, doc.t);
    if (inMonth) await db.cmd("ZADD", "blm:" + id + ":" + G.ym(doc.at), doc.at, doc.t);
    await db.cmd("ZREMRANGEBYRANK", "blz:" + id, 0, -(MAXB + 1));
    return true;
  }
  return false;
}

async function create(id, m, b, ctx, from) {
  const set = await db.getj("blset:" + id);
  if (!set) return E(409, "Choose your GST type first.");
  const est = b.est === true && !from, kind = est ? "est" : KIND[set.gst || "regular"];
  const used = +(await db.cmd("GET", "blcnt:" + id)) || 0;
  if (!est && !isPro(m) && used >= FREE) return E(402, "You've used your " + FREE + " free bills. Start Keepsake Pro for unlimited bills.");
  if (await limit("bl-day:" + id, 500, 86400)) return E(429, "That's a lot of bills for one day. Try again tomorrow.");
  const x = await build(id, m, set, b, kind); if (x.error) return x;
  const pay = est ? null : payOf(b, x.calc.total); if (pay && pay.error) return E(400, pay.error);
  const now = Date.now(), fy = G.fy(now), n = await db.cmd("INCR", (est ? "bleno:" : "blno:") + id + ":" + fy);
  const no = (est ? "EST" : set.prefix) + "/" + fy.slice(2) + "/" + String(n).padStart(4, "0"); // ≤ 16 characters, as GST rules ask
  const doc = { t: "", page: id, no, at: now, kind, seller: sellerOf(m, set), cust: x.cust, inc: x.inc, lines: x.lines, calc: x.calc, terms: set.terms, note: clip(b.note, 200),
    design: DESIGNS.includes(b.design) ? b.design : set.design || "a4m", pay, paid: pay && pay.amt >= x.calc.total ? { at: now, mode: pay.mode === "split" ? "split" : pay.mode } : null, cancel: null, ...(from ? { from } : {}) };
  if (!est) { const cs = await require("./_cost").lineCosts(id, x.calc.lines); if (cs) doc.cs = cs; } // cost of each line at the time of sale (owner only, never in the bill link)
  if (!est) doc.stk = 1; // the items' counted stock goes down (back up if the bill is cancelled)
  if (!(await save(id, doc, !est))) return E(500, "Couldn't save the bill. Please try again.");
  if (!est) await require("./_stock").move(id, doc.lines, -1);
  if (!est) await db.cmd("INCR", "blcnt:" + id);
  await remember(id, x.lines.filter(l => !l.x));
  if (x.cust.phone) await rememberCust(id, x.cust);
  // Balance not paid: put it in the customer's Udhaar khata (Pro), so reminders and UPI links work from there.
  let kh = null;
  if (pay && pay.amt < x.calc.total && x.cust.phone && b.khata !== false && isPro(m)) {
    try { const r = await require("./_khata").handle({ action: "kh-own-add", id, phone: x.cust.phone, name: x.cust.name, amount: r2(x.calc.total - pay.amt), note: "Bill " + no, src: "bill:" + no, force: true }, ctx);
      if (!r.error) { kh = { bal: r.customer.bal, wa: r.wa }; doc.kh = r2(x.calc.total - pay.amt); await db.setj("bl:" + doc.t, doc); } } catch (e) { console.error("bill khata", e.message); }
  }
  return { ok: true, bill: pub(doc), used: est ? used : used + 1, ...(kh ? { khata: kh } : {}) };
}

// A return: a credit note for some or all of a bill's items, numbered in its own series and linked to the bill.
async function credit(id, m, b) {
  const t = String(b.t || ""); if (!TOK.test(t)) return E(400, "Invalid bill.");
  const bill = await db.getj("bl:" + t);
  if (!bill || bill.page !== id) return E(404, "That bill wasn't found.");
  if (!["tax", "supply", "cash"].includes(bill.kind || "tax")) return E(400, "Only a bill can be returned.");
  if (bill.cancel) return E(400, "This bill is cancelled.");
  const ret = bill.ret || {}, lines = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 80)) {
    const k = +it.k, L = bill.calc.lines[k], q = Math.round(+it.q * 1000) / 1000; if (!L || !(q > 0)) continue;
    if (q > r2(L.q - (ret[k] || 0))) return E(400, `Only ${r2(L.q - (ret[k] || 0))} of "${L.n}" can be returned.`);
    // Price per unit as actually charged on the bill (after the line and bill discounts), so the credit is exact.
    const per = r2(((L.net || L.q * L.p) - (L.bd || 0)) / L.q);
    lines.push({ k, n: L.n, hsn: L.hsn, q, p: per, r: L.r, dp: 0, u: L.u });
  }
  if (!lines.length) return E(400, "Pick what's being returned.");
  const calc = G.calc(lines, { gst: bill.kind === "tax", inc: bill.inc, seller: bill.seller.state, pos: bill.calc.pos });
  const now = Date.now(), fy = G.fy(now), n = await db.cmd("INCR", "blcn:" + id + ":" + fy);
  const doc = { t: "", page: id, no: "CN/" + fy.slice(2) + "/" + String(n).padStart(4, "0"), at: now, kind: "credit", seller: bill.seller, cust: bill.cust, inc: bill.inc,
    lines: lines.map(({ k, ...x }) => x), rk: lines.map(l => [l.k, l.q]), calc, terms: "", note: clip(b.reason, 120) || "Goods returned", design: bill.design || "a4m",
    ref: { t: bill.t, no: bill.no, at: bill.at, kind: bill.kind || "tax" }, refund: MODES.includes(b.mode) ? b.mode : "cash", paid: { at: now, mode: MODES.includes(b.mode) ? b.mode : "cash" }, cancel: null };
  if (bill.cs) doc.cs = lines.map(l => bill.cs[l.k] != null ? bill.cs[l.k] : null); // returned goods carry the cost they were sold at
  doc.stk = 1; // returned goods go back into stock
  if (!(await save(id, doc, true))) return E(500, "Couldn't save the credit note. Please try again.");
  await require("./_stock").move(id, doc.lines, 1);
  for (const l of lines) ret[l.k] = r2((ret[l.k] || 0) + l.q);
  bill.ret = ret; await db.setj("bl:" + t, bill);
  return { ok: true, bill: pub(doc), orig: pub(bill) };
}

async function remember(id, lines) {
  const k = "blmem:" + id, mem = (await db.getj(k)) || {};
  for (const x of lines) { const key = x.n.toLowerCase(); delete mem[key]; mem[key] = { h: x.hsn, r: x.r, u: x.u }; }
  const keys = Object.keys(mem); for (const key of keys.slice(0, Math.max(0, keys.length - MAXMEM))) delete mem[key];
  await db.setj(k, mem);
}
async function rememberCust(id, c) {
  const k = "blcu:" + id, mem = (await db.getj(k)) || {};
  delete mem[c.phone]; mem[c.phone] = { name: c.name, addr: c.addr, gstin: c.gstin, state: c.state };
  const keys = Object.keys(mem); for (const key of keys.slice(0, Math.max(0, keys.length - MAXMEM))) delete mem[key];
  await db.setj(k, mem);
}

async function monthBills(id, ym) {
  const ts = await db.cmd("ZRANGE", "blm:" + id + ":" + ym, 0, -1);
  const out = [];
  for (let i = 0; i < ts.length; i += 200) out.push(...(await db.cmd("MGET", ...ts.slice(i, i + 200).map(t => "bl:" + t))).map(parse).filter(Boolean));
  return out.filter(b => b.kind !== "est").sort((a, b) => a.at - b.at).map(pub);
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
    const bills = ts.length ? (await db.cmd("MGET", ...ts.map(t => "bl:" + t))).map(parse).filter(Boolean).map(row) : [];
    return { ok: true, settings: set, used, free: FREE, pro: isPro(m), bills, mem: (await db.getj("blmem:" + id)) || {}, ca: (await db.cmd("GET", "blcak:" + id)) || "", months: await months(id) };
  }
  if (a === "bl-settings") {
    const s = cleanSettings(b.settings || {}); if (s.error) return s;
    await db.setj("blset:" + id, s);
    return { ok: true, settings: s };
  }
  if (a === "bl-cust") {
    const p = ph10(b.phone); if (!p) return { ok: true, cust: null };
    const mem = (await db.getj("blcu:" + id)) || {};
    return { ok: true, cust: mem[p] ? { phone: p, ...mem[p] } : null };
  }
  if (a === "bl-create") return create(id, m, b, ctx);
  if (a === "bl-convert") { // an estimate becomes a bill
    const t = String(b.t || ""); if (!TOK.test(t)) return E(400, "Invalid estimate.");
    const e = await db.getj("bl:" + t); if (!e || e.page !== id || e.kind !== "est") return E(404, "That estimate wasn't found.");
    if (e.cancel) return E(400, "This estimate is cancelled.");
    if (e.conv) return E(409, "This estimate is already bill " + e.conv + ".");
    const del = e.calc.lines.find(l => l.x === "del");
    const r = await create(id, m, { items: e.lines.filter(l => !l.x), cust: e.cust, inc: e.inc, bd: e.calc.bd, del: del ? del.p : 0, pay: b.pay, note: e.note, design: e.design, khata: b.khata }, ctx, e.no);
    if (r.error) return r;
    e.conv = r.bill.no; await db.setj("bl:" + t, e);
    return r;
  }
  if (a === "bl-credit") return credit(id, m, b);
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
    if (a === "bl-paid" && b.paid !== false && !bill.paid && bill.kh && !bill.khPaid && bill.cust.phone) {
      // The balance was in the customer's udhaar khata: record the payment there too, so it isn't owed twice.
      try { const r = await require("./_khata").handle({ action: "kh-own-add", id, kind: "pay", phone: bill.cust.phone, name: bill.cust.name, amount: bill.kh, note: "Bill " + bill.no + " paid", src: "bill:" + bill.no, force: true }, ctx); if (!r.error) bill.khPaid = Date.now(); } catch (e) { console.error("bill khata pay", e.message); }
    }
    if (a === "bl-paid") { bill.paid = b.paid === false ? null : { at: Date.now(), mode: MODES.includes(b.mode) ? b.mode : "cash" }; bill.pay = bill.paid ? { mode: bill.paid.mode, amt: bill.calc.total } : { mode: "due", amt: 0 }; }
    else {
      if (bill.kind === "credit" && b.cancel === false) return E(400, "A cancelled credit note stays cancelled. Make a new one.");
      if (b.cancel !== false && !bill.cancel) {
        if (bill.ret && Object.values(bill.ret).some(q => q > 0)) return E(409, "This bill has returns. Cancel its credit notes first.");
        // A cancelled credit note frees its items to be returned again.
        if (bill.kind === "credit" && bill.ref && bill.rk) { const o = await db.getj("bl:" + bill.ref.t); if (o && o.ret) { for (const [k, q] of bill.rk) o.ret[k] = Math.max(0, r2((o.ret[k] || 0) - q)); await db.setj("bl:" + o.t, o); } }
        // The balance went into the udhaar khata: take it out again.
        if (bill.kh && !bill.khPaid && !bill.paid && bill.cust.phone) {
          try { const r = await require("./_khata").handle({ action: "kh-own-add", id, kind: "pay", phone: bill.cust.phone, name: bill.cust.name, amount: bill.kh, note: "Bill " + bill.no + " cancelled", src: "bill:" + bill.no, force: true }, ctx); if (!r.error) bill.khPaid = Date.now(); } catch (e) { console.error("bill khata cancel", e.message); }
        }
      }
      // Stock follows: a cancelled bill puts its items back (a cancelled credit note takes them out again), and undoing it reverses that.
      const sgn = bill.kind === "credit" ? -1 : 1;
      if (b.cancel !== false && !bill.cancel && bill.stk) { await require("./_stock").move(id, bill.lines, sgn); bill.stk = 0; }
      else if (b.cancel === false && bill.cancel && bill.stk === 0) { await require("./_stock").move(id, bill.lines, -sgn); bill.stk = 1; }
      bill.cancel = b.cancel === false ? null : bill.cancel || { at: Date.now() };
    } // a GST document is never deleted, only marked cancelled
    await db.setj("bl:" + t, bill);
    return { ok: true, bill: pub(bill) };
  }
  return E(400, "Unknown action.");
}
module.exports = { handle, cleanLines, cleanSettings, payOf, FREE };
