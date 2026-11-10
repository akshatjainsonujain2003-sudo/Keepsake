// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const G = require("../assets/gst.v2.js");
const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const gstin = (st, pan = "AAPFU0939F") => [...CH].map(c => st + pan + "1Z" + c).find(G.gstinOk);

// In-memory stand-in for the Upstash database used by api/_db.js.
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": return kv.delete(a[0]) ? 1 : 0;
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": return 1;
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "ZADD": { const z = zs.get(a[0]) || []; z.push([+a[1], a[2]]); zs.set(a[0], z); return 1; }
    case "ZCARD": return (zs.get(a[0]) || []).length;
    case "ZREMRANGEBYRANK": return 0;
    case "ZRANGE": { const z = [...(zs.get(a[0]) || [])].sort((x, y) => x[0] - y[0]).map(x => x[1]); if (a.includes("REV")) z.reverse(); const e = +a[2] < 0 ? z.length + +a[2] : +a[2]; return z.slice(+a[1], e + 1); }
    default: throw new Error("unmocked " + c);
  }
};
let n = 0;
const fake = {
  ok: () => true, cmd,
  getj: async k => { const v = await cmd("GET", k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  setj: (k, v) => cmd("SET", k, JSON.stringify(v)),
  rid: (len = 6) => ("tok" + (++n) + "abcdefghijkmnpqrstuvwxyz").slice(0, len)
};
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
const B = require("../api/_bill.js");

const PID = "shop12345";
const owner = { id: "u1" }, stranger = { id: "u2" };
const ctx = u => ({ ip: "1.2.3.4", user: async () => u });
function shop(pro) {
  kv.set("customer-memory:" + PID, JSON.stringify({ kind: "biz", owner: "u1", proUntil: pro ? Date.now() + 864e5 : 0, data: { t: "Maison Noor", upi: { id: "maison@okhdfc" }, wa: "9876543210", addr: "MI Road, Jaipur" } }));
}
const call = (b, u = owner) => B.handle({ id: PID, ...b }, ctx(u));
const SELLER = gstin("08");
const SET = { gst: "regular", gstin: SELLER, legal: "Maison Noor LLP", prefix: "MN", inc: true, rate: 5, hsn: "6211" };
const item = (o = {}) => ({ n: "Kurta set", hsn: "6211", q: 1, p: 3490, r: 5, ...o });

test("settings: GSTIN is checked, its state is used, HSN needs 4 digits", async () => {
  shop(false);
  assert.equal((await call({ action: "bl-settings", settings: { ...SET, gstin: SELLER.slice(0, 14) + (SELLER[14] === "A" ? "B" : "A") } })).status, 400);
  assert.equal((await call({ action: "bl-settings", settings: { ...SET, hsn: "62" } })).status, 400);
  const r = await call({ action: "bl-settings", settings: SET });
  assert.equal(r.ok, true); assert.equal(r.settings.state, "08"); assert.equal(r.settings.prefix, "MN"); assert.equal(r.settings.u, "NOS");
});

test("create: server works out totals and ignores a tampered total", async () => {
  const r = await call({ action: "bl-create", cust: { name: "Riya", phone: "+91 98290 00000" }, items: [item({ u: "SET" })], total: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.bill.calc.total, 3490); assert.equal(r.bill.calc.taxable, 3323.81); assert.equal(r.bill.calc.cgst, 83.1); assert.equal(r.bill.calc.roff, -0.01);
  assert.match(r.bill.no, /^MN\/\d{2}-\d{2}\/0001$/); assert.ok(r.bill.no.length <= 16);
  assert.equal(r.bill.calc.lines[0].u, "SET"); assert.equal(r.bill.cust.phone, "9829000000");
});

test("GST bills need HSN on every line", async () => {
  const r = await call({ action: "bl-create", items: [item(), { n: "Dupatta", q: 1, p: 800, r: 5 }] });
  assert.equal(r.status, 400); assert.match(r.error, /Dupatta/);
});

test("numbers go up and never repeat; item HSN is remembered", async () => {
  const r = await call({ action: "bl-create", items: [item({ n: "Dupatta", hsn: "6214", q: 2, p: 800 })] });
  assert.match(r.bill.no, /\/0002$/);
  const h = await call({ action: "bl-home" });
  assert.equal(h.mem["dupatta"].h, "6214"); assert.equal(h.mem["kurta set"].u, "SET");
});

test("business customer: GSTIN gives IGST across states; name and address required; own GSTIN refused", async () => {
  const mh = gstin("27");
  assert.equal((await call({ action: "bl-create", cust: { name: "Shop B", gstin: mh }, items: [item()] })).status, 400);
  assert.equal((await call({ action: "bl-create", cust: { name: "Me", addr: "x", gstin: SELLER }, items: [item()] })).status, 400);
  const r = await call({ action: "bl-create", inc: false, cust: { name: "Shop B", addr: "Andheri, Mumbai", gstin: mh }, items: [item({ n: "Lehenga", hsn: "6204", p: 10000 })] });
  assert.equal(r.bill.calc.intra, false); assert.equal(r.bill.calc.igst, 500); assert.equal(r.bill.calc.total, 10500); assert.equal(r.bill.cust.state, "27");
});

test("unregistered sale of ₹50,000 or more needs name and address", async () => {
  const big = [item({ n: "Bridal lehenga", hsn: "6204", p: 60000 })];
  const r = await call({ action: "bl-create", cust: { name: "Riya" }, items: big });
  assert.equal(r.status, 400); assert.match(r.error, /50,000/);
  assert.equal((await call({ action: "bl-create", cust: { name: "Riya", addr: "C-Scheme, Jaipur" }, items: big })).ok, true);
});

test("Start plan: 5 free bills, then Pro is needed", async () => {
  for (let i = (+kv.get("blcnt:" + PID)); i < B.FREE; i++) assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).ok, true);
  assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).status, 402);
  shop(true);
  assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).ok, true);
});

test("only the owner can list or change bills; anyone can open a bill link", async () => {
  assert.equal((await call({ action: "bl-home" }, stranger)).status, 401);
  const h = await call({ action: "bl-home" });
  assert.equal(h.bills.length, 6); assert.ok(h.bills[0].no.endsWith("/0006")); assert.equal(h.used, 6);
  assert.equal(h.months[0].n, 6);
  const t = h.bills[h.bills.length - 1].t;
  const pubBill = await B.handle({ action: "bl-get", t }, ctx(null));
  assert.equal(pubBill.ok, true); assert.equal(pubBill.bill.page, undefined);
  assert.equal((await call({ action: "bl-paid", t, mode: "upi" }, stranger)).status, 401);
  assert.equal((await call({ action: "bl-paid", t, mode: "upi" })).bill.paid, true);
  assert.equal((await call({ action: "bl-cancel", t })).bill.cancel, true);
});

test("month report has every bill of the month, cancelled ones flagged", async () => {
  const ym = G.ym(Date.now()), r = await call({ action: "bl-month", ym });
  assert.equal(r.bills.length, 6); assert.equal(r.bills.filter(b => b.cancel).length, 1);
  assert.ok(r.bills[0].at <= r.bills[5].at); assert.equal(r.shop.gstin, SELLER);
  assert.equal((await call({ action: "bl-month", ym: "2026-13" })).status, 400);
});

test("CA link: read-only reports, can be turned off", async () => {
  const on = await call({ action: "bl-ca" });
  assert.ok(on.ca.length >= 12);
  const home = await B.handle({ action: "bl-ca-home", k: on.ca }, ctx(null));
  assert.equal(home.ok, true); assert.equal(home.shop.name, "Maison Noor"); assert.equal(home.months[0].n, 6);
  const mo = await B.handle({ action: "bl-ca-month", k: on.ca, ym: G.ym(Date.now()) }, ctx(null));
  assert.equal(mo.bills.length, 6);
  // the CA can't change anything: owner actions with the CA token still need the owner's login
  assert.equal((await B.handle({ action: "bl-cancel", id: PID, k: on.ca, t: mo.bills[0].t }, ctx(null))).status, 401);
  await call({ action: "bl-ca", on: false });
  assert.equal((await B.handle({ action: "bl-ca-home", k: on.ca }, ctx(null))).status, 404);
});

test("bad lines are dropped; empty bill refused", async () => {
  const r = await call({ action: "bl-create", items: [{ n: "", q: 1, p: 10, r: 5, hsn: "1234" }, { n: "Y", q: -1, p: 10, r: 5, hsn: "1234" }, { n: "Z", q: 1, p: 10, r: 7, hsn: "1234" }] });
  assert.equal(r.status, 400);
});

test("shop not registered for GST: a plain bill (cash memo), no GST, no HSN needed", async () => {
  await call({ action: "bl-settings", settings: { gst: "none", state: "08", prefix: "BS" } });
  const r = await call({ action: "bl-create", items: [{ n: "Tea", q: 2, p: 15, r: 5 }] });
  assert.equal(r.ok, true); assert.equal(r.bill.kind, "cash"); assert.equal(r.bill.calc.tax, 0); assert.equal(r.bill.calc.total, 30);
});

test("composition dealer: bill of supply with GSTIN, no tax charged", async () => {
  assert.equal((await call({ action: "bl-settings", settings: { gst: "composition", gstin: "bad" } })).status, 400);
  const s = await call({ action: "bl-settings", settings: { gst: "composition", gstin: SELLER, legal: "Maison Noor LLP" } });
  assert.equal(s.settings.gstin, SELLER);
  const r = await call({ action: "bl-create", items: [{ n: "Kurta", q: 1, p: 1000, r: 5 }] });
  assert.equal(r.bill.kind, "supply"); assert.equal(r.bill.calc.tax, 0); assert.equal(r.bill.seller.gtype, "composition"); assert.equal(r.bill.seller.gstin, SELLER);
});

test("bill discount, delivery charge, split and part payments", async () => {
  shop(true); kv.delete("blcnt:" + PID);
  await call({ action: "bl-settings", settings: { ...SET, design: "t58" } });
  const r = await call({ action: "bl-create", items: [item({ p: 1000 }), item({ n: "Dupatta", p: 500, r: 18 })], bd: 150, del: 50, pay: { mode: "split", split: { cash: 400, upi: 1000 } } });
  assert.equal(r.ok, true); assert.equal(r.bill.calc.bd, 150); assert.equal(r.bill.calc.total, 1400); assert.equal(r.bill.design, "t58");
  const dl = r.bill.calc.lines.find(l => l.x === "del"); assert.equal(dl.r, 5); assert.equal(dl.hsn, "6211");
  assert.equal(r.bill.paid, true); assert.deepEqual(r.bill.split, { cash: 400, upi: 1000 });
  assert.equal((await call({ action: "bl-create", items: [item()], pay: { mode: "split", split: { cash: 10 } } })).status, 400);
  const p = await call({ action: "bl-create", cust: { name: "Riya", phone: "9829000000" }, items: [item({ p: 1000 })], pay: { mode: "part", amt: 400 } });
  assert.equal(p.bill.paid, false); assert.equal(p.bill.rcv, 400);
  assert.equal((await call({ action: "bl-create", items: [item()], pay: { mode: "part", amt: 0 } })).status, 400);
  // the customer's details come back next time
  const c = await call({ action: "bl-cust", phone: "+91 98290 00000" }); assert.equal(c.cust.name, "Riya");
});

test("estimates: own series, not in reports, converted into a bill once", async () => {
  const e = await call({ action: "bl-create", est: true, cust: { name: "Aman" }, items: [item({ p: 2000 })], bd: 100 });
  assert.equal(e.bill.kind, "est"); assert.match(e.bill.no, /^EST\//);
  const ym = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
  assert.ok(!(await call({ action: "bl-month", ym })).bills.some(x => x.kind === "est"));
  const b = await call({ action: "bl-convert", t: e.bill.t, pay: { mode: "upi" } });
  assert.equal(b.bill.kind, "tax"); assert.equal(b.bill.calc.total, 1900); assert.match(b.bill.no, /^MN\//);
  assert.equal((await call({ action: "bl-convert", t: e.bill.t })).status, 409);
});

test("credit note: returns part of a bill at the price charged, own series, can't return more than sold", async () => {
  const b = await call({ action: "bl-create", items: [item({ q: 2, p: 1000 }), item({ n: "Dupatta", p: 500 })], bd: 250, pay: { mode: "cash" } });
  const c = await call({ action: "bl-credit", t: b.bill.t, items: [{ k: 0, q: 1 }], reason: "Size issue" });
  assert.equal(c.ok, true); assert.equal(c.bill.kind, "credit"); assert.match(c.bill.no, /^CN\/\d{2}-\d{2}\/0001$/);
  assert.equal(c.bill.ref.no, b.bill.no); assert.equal(c.bill.calc.total, 900); assert.equal(c.orig.ret[0], 1);
  assert.equal((await call({ action: "bl-credit", t: b.bill.t, items: [{ k: 0, q: 2 }] })).status, 400);
  const ym = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
  assert.ok((await call({ action: "bl-month", ym })).bills.some(x => x.kind === "credit"));
});

test("balance goes into the udhaar khata (Pro); marking the bill paid records the payment there once", async () => {
  shop(true); await call({ action: "bl-settings", settings: { gst: "none", state: "08" } });
  const r = await call({ action: "bl-create", items: [{ n: "Saree", q: 1, p: 1000 }], cust: { name: "Pappu", phone: "9829011111" }, pay: { mode: "part", amt: 400 } });
  assert.equal(r.bill.kind, "cash"); assert.equal(r.bill.rcv, 400); assert.equal(r.khata.bal, 600);
  const kh = () => JSON.parse(kv.get("kh:" + PID + ":9829011111"));
  const before = kh().e.length;
  const p = await call({ action: "bl-paid", t: r.bill.t, paid: true, mode: "upi" });
  assert.equal(p.bill.paid, true);
  assert.equal(kh().e.length, before + 1);
  await call({ action: "bl-paid", t: r.bill.t, paid: false });
  await call({ action: "bl-paid", t: r.bill.t, paid: true, mode: "cash" });
  assert.equal(kh().e.length, before + 1, "the khata payment is recorded only once");
  const none = await call({ action: "bl-create", items: [{ n: "Blouse", q: 1, p: 300 }], cust: { phone: "9829011111" }, pay: { mode: "cash" } });
  assert.equal(none.khata, undefined);
});

test("cancelling: a bill with returns is blocked; a cancelled credit note frees its items; udhaar is reversed", async () => {
  shop(true); await call({ action: "bl-settings", settings: { gst: "none", state: "08" } });
  const r = await call({ action: "bl-create", items: [{ n: "Shirt", q: 2, p: 500 }], cust: { name: "Mohan", phone: "9829044444" }, pay: { mode: "due" } });
  const kh = () => JSON.parse(kv.get("kh:" + PID + ":9829044444"));
  const cn = await call({ action: "bl-credit", t: r.bill.t, items: [{ k: 0, q: 2 }] });
  assert.ok(cn.bill.no.startsWith("CN/"));
  const blocked = await call({ action: "bl-cancel", t: r.bill.t });
  assert.equal(blocked.status, 409);
  await call({ action: "bl-cancel", t: cn.bill.t });
  const again = await call({ action: "bl-credit", t: r.bill.t, items: [{ k: 0, q: 1 }] });
  assert.ok(again.ok, "items are free to return again");
  await call({ action: "bl-cancel", t: again.bill.t });
  const n0 = kh().e.length;
  const ok = await call({ action: "bl-cancel", t: r.bill.t });
  assert.equal(ok.bill.cancel, true);
  assert.equal(kh().e.length, n0 + 1, "the udhaar entry is reversed");
  const est = await call({ action: "bl-create", est: true, items: [{ n: "Shirt", q: 1, p: 500 }] });
  await call({ action: "bl-cancel", t: est.bill.t });
  assert.equal((await call({ action: "bl-convert", t: est.bill.t, pay: { mode: "cash" } })).status, 400);
});

test("the bill list carries what was sold (for top items), not for estimates", async () => {
  shop(true); await call({ action: "bl-settings", settings: { gst: "none", state: "08" } });
  await call({ action: "bl-create", items: [{ n: "Chai", q: 3, p: 15 }, { n: "Samosa", q: 2, p: 20 }], pay: { mode: "cash" } });
  await call({ action: "bl-create", est: true, items: [{ n: "Party order", q: 1, p: 900 }] });
  const h = await call({ action: "bl-home" }), [est, sale] = h.bills;
  assert.equal(est.it, undefined);
  assert.deepEqual(sale.it, [["Chai", 3, 45], ["Samosa", 2, 40]]);
});
