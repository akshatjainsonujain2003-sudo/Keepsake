// Run: node --test tests/
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");

// In-memory stand-in for the Upstash database used by api/_db.js.
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": return 1;
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "ZADD": { const z = zs.get(a[0]) || []; z.push([+a[1], a[2]]); zs.set(a[0], z); return 1; }
    case "ZREMRANGEBYRANK": return 0;
    case "ZRANGE": { const z = [...(zs.get(a[0]) || [])].sort((x, y) => x[0] - y[0]).map(x => x[1]); if (a.includes("REV")) z.reverse(); return z.slice(+a[1], +a[2] + 1); }
    default: throw new Error("unmocked " + c);
  }
};
let n = 0;
const fake = {
  ok: () => true, cmd,
  getj: async k => { const v = await cmd("GET", k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  setj: (k, v) => cmd("SET", k, JSON.stringify(v)),
  rid: (len = 6) => ("tok" + (++n) + "abcdefghijkmnpqrst").slice(0, len)
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
const SET = { gst: "regular", gstin: "08AAPFU0939F1ZU", legal: "Maison Noor LLP", prefix: "MN", inc: true, rate: 5 };

test("settings: GSTIN is checked and its state is used", async () => {
  shop(false);
  const bad = await call({ action: "bl-settings", settings: { ...SET, gstin: "08AAPFU0939F1ZX" } });
  assert.equal(bad.status, 400);
  // build a GSTIN with a correct check digit for state 08
  const G = require("../assets/gst.v1.js"), CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const good = [...CH].map(c => "08AAPFU0939F1Z" + c).find(G.gstinOk);
  SET.gstin = good;
  const r = await call({ action: "bl-settings", settings: SET });
  assert.equal(r.ok, true); assert.equal(r.settings.state, "08"); assert.equal(r.settings.prefix, "MN");
});

test("create: server works out totals and ignores a tampered total", async () => {
  const r = await call({ action: "bl-create", cust: { name: "Riya", phone: "+91 98290 00000" }, items: [{ n: "Kurta set", q: 1, p: 3490, r: 5 }], total: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.bill.calc.total, 3490); assert.equal(r.bill.calc.taxable, 3323.81); assert.equal(r.bill.calc.cgst, 83.1); assert.equal(r.bill.calc.tax, 166.2); assert.equal(r.bill.calc.roff, -0.01);
  assert.match(r.bill.no, /^MN\/\d{2}-\d{2}\/0001$/); assert.ok(r.bill.no.length <= 16);
  assert.equal(r.bill.seller.upi.id, "maison@okhdfc"); assert.equal(r.bill.cust.phone, "9829000000");
});

test("numbers go up and never repeat", async () => {
  const r = await call({ action: "bl-create", items: [{ n: "Dupatta", q: 2, p: 800, r: 5 }] });
  assert.match(r.bill.no, /\/0002$/);
});

test("inter-state customer GSTIN gives IGST", async () => {
  const G = require("../assets/gst.v1.js"), CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const mh = [...CH].map(c => "27AAPFU0939F1Z" + c).find(G.gstinOk);
  const r = await call({ action: "bl-create", inc: false, cust: { name: "Shop B", gstin: mh }, items: [{ n: "Lehenga", q: 1, p: 10000, r: 5 }] });
  assert.equal(r.bill.calc.intra, false); assert.equal(r.bill.calc.igst, 500); assert.equal(r.bill.calc.total, 10500);
});

test("Start plan: 10 free bills, then Pro is needed", async () => {
  for (let i = (+kv.get("blcnt:" + PID)); i < B.FREE; i++) assert.equal((await call({ action: "bl-create", items: [{ n: "X", q: 1, p: 10, r: 0 }] })).ok, true);
  const r = await call({ action: "bl-create", items: [{ n: "X", q: 1, p: 10, r: 0 }] });
  assert.equal(r.status, 402);
  shop(true);
  assert.equal((await call({ action: "bl-create", items: [{ n: "X", q: 1, p: 10, r: 0 }] })).ok, true);
});

test("only the owner can list or change bills; anyone can open a bill link", async () => {
  assert.equal((await call({ action: "bl-home" }, stranger)).status, 401);
  const h = await call({ action: "bl-home" });
  assert.equal(h.ok, true); assert.equal(h.bills.length, 11); assert.equal(h.bills[0].no.endsWith("/0011"), true); assert.equal(h.used, 11);
  const t = h.bills[h.bills.length - 1].t;
  const pubBill = await B.handle({ action: "bl-get", t }, ctx(null));
  assert.equal(pubBill.ok, true); assert.equal(pubBill.bill.page, undefined);
  assert.equal((await call({ action: "bl-paid", t, mode: "upi" }, stranger)).status, 401);
  const p = await call({ action: "bl-paid", t, mode: "upi" });
  assert.equal(p.bill.paid, true);
  const c = await call({ action: "bl-cancel", t });
  assert.equal(c.bill.cancel, true);
});

test("bad lines are dropped; empty bill refused", async () => {
  const r = await call({ action: "bl-create", items: [{ n: "", q: 1, p: 10, r: 5 }, { n: "Y", q: -1, p: 10, r: 5 }, { n: "Z", q: 1, p: 10, r: 7 }] });
  assert.equal(r.status, 400);
});
