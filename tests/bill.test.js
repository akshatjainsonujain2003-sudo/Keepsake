// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const G = require("../assets/gst.v1.js");
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

test("Start plan: 10 free bills, then Pro is needed", async () => {
  for (let i = (+kv.get("blcnt:" + PID)); i < B.FREE; i++) assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).ok, true);
  assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).status, 402);
  shop(true);
  assert.equal((await call({ action: "bl-create", items: [item({ p: 10 })] })).ok, true);
});

test("only the owner can list or change bills; anyone can open a bill link", async () => {
  assert.equal((await call({ action: "bl-home" }, stranger)).status, 401);
  const h = await call({ action: "bl-home" });
  assert.equal(h.bills.length, 11); assert.ok(h.bills[0].no.endsWith("/0011")); assert.equal(h.used, 11);
  assert.equal(h.months[0].n, 11);
  const t = h.bills[h.bills.length - 1].t;
  const pubBill = await B.handle({ action: "bl-get", t }, ctx(null));
  assert.equal(pubBill.ok, true); assert.equal(pubBill.bill.page, undefined);
  assert.equal((await call({ action: "bl-paid", t, mode: "upi" }, stranger)).status, 401);
  assert.equal((await call({ action: "bl-paid", t, mode: "upi" })).bill.paid, true);
  assert.equal((await call({ action: "bl-cancel", t })).bill.cancel, true);
});

test("month report has every bill of the month, cancelled ones flagged", async () => {
  const ym = G.ym(Date.now()), r = await call({ action: "bl-month", ym });
  assert.equal(r.bills.length, 11); assert.equal(r.bills.filter(b => b.cancel).length, 1);
  assert.ok(r.bills[0].at <= r.bills[10].at); assert.equal(r.shop.gstin, SELLER);
  assert.equal((await call({ action: "bl-month", ym: "2026-13" })).status, 400);
});

test("CA link: read-only reports, can be turned off", async () => {
  const on = await call({ action: "bl-ca" });
  assert.ok(on.ca.length >= 12);
  const home = await B.handle({ action: "bl-ca-home", k: on.ca }, ctx(null));
  assert.equal(home.ok, true); assert.equal(home.shop.name, "Maison Noor"); assert.equal(home.months[0].n, 11);
  const mo = await B.handle({ action: "bl-ca-month", k: on.ca, ym: G.ym(Date.now()) }, ctx(null));
  assert.equal(mo.bills.length, 11);
  // the CA can't change anything: owner actions with the CA token still need the owner's login
  assert.equal((await B.handle({ action: "bl-cancel", id: PID, k: on.ca, t: mo.bills[0].t }, ctx(null))).status, 401);
  await call({ action: "bl-ca", on: false });
  assert.equal((await B.handle({ action: "bl-ca-home", k: on.ca }, ctx(null))).status, 404);
});

test("bad lines are dropped; empty bill refused", async () => {
  const r = await call({ action: "bl-create", items: [{ n: "", q: 1, p: 10, r: 5, hsn: "1234" }, { n: "Y", q: -1, p: 10, r: 5, hsn: "1234" }, { n: "Z", q: 1, p: 10, r: 7, hsn: "1234" }] });
  assert.equal(r.status, 400);
});

test("bill of supply shop: no GST, no HSN needed", async () => {
  await call({ action: "bl-settings", settings: { gst: "none", state: "08", prefix: "BS" } });
  const r = await call({ action: "bl-create", items: [{ n: "Tea", q: 2, p: 15, r: 5 }] });
  assert.equal(r.ok, true); assert.equal(r.bill.kind, "supply"); assert.equal(r.bill.calc.tax, 0); assert.equal(r.bill.calc.total, 30);
});
