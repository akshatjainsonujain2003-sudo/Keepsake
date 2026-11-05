// Run: node --test tests/*.test.js
// Cost prices and profit: owner only, kept out of the public page, saved with each sale, GST left out for registered shops.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const G = require("../assets/gst.v2.js");
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": return kv.delete(a[0]) ? 1 : 0;
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": case "ZREMRANGEBYRANK": return 1;
    case "ZCARD": return (zs.get(a[0]) || new Map()).size;
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZRANGE": { const all = [...(zs.get(a[0]) || new Map())].sort((x, y) => x[1] - y[1]);
      if (a.includes("BYSCORE")) { const r = all.filter(x => x[1] >= +a[1] && x[1] <= +a[2]).map(x => x[0]); const i = a.indexOf("LIMIT"); return i > 0 ? r.slice(+a[i + 1], +a[i + 1] + +a[i + 2]) : r; }
      const z = all.map(x => x[0]); if (a.includes("REV")) z.reverse(); const e = +a[2] < 0 ? z.length + +a[2] : +a[2]; return z.slice(+a[1], e + 1); }
    default: throw new Error("unmocked " + c);
  }
};
let n = 0;
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)), rid: (len = 6) => ("t" + (++n) + "abcdefghijkmnpqrstuvwxyz").slice(0, len) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
require.cache[path.resolve(__dirname, "../api/_hq.js")] = { id: "hq", filename: "hq", loaded: true, exports: { notify: async () => ({}) } };
const C = require("../api/_cost.js"), BZ = require("../api/_biz.js"), B = require("../api/_bill.js");
const PID = "shop12345", owner = { id: "u1" };
const ctx = (u = owner) => ({ ip: "1.1.1.1", user: async () => u });
const cs = (b, u) => C.handle({ id: PID, ...b }, ctx(u));
const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", SELLER = [...CH].map(c => "08AAPFU0939F1Z" + c).find(G.gstinOk);
function reset(o = {}) {
  kv.clear(); zs.clear();
  kv.set("customer-memory:" + PID, JSON.stringify({ kind: "biz", owner: "u1", paid: true, proUntil: o.pro === false ? 0 : Date.now() + 30 * 864e5,
    data: { t: "Sharma Store", ord: true, wa: "9876543210", menu: [{ n: "Daily", items: [{ n: "Atta 5 kg", p: "265" }, { n: "Maggi", p: "14" }, { n: "Kurta", p: "1050", v: [{ n: "M" }, { n: "XL", p: 50 }] }] }] } }));
}
const sale = (items, x = {}) => BZ.handle({ action: "bz-own-sale", id: PID, items, pay: "cash", ...x }, ctx());

test("only the owner reads costs, and saving them needs Pro", async () => {
  reset();
  assert.equal((await cs({ action: "cs-get" }, null)).status, 401);
  assert.equal((await cs({ action: "cs-get" }, { id: "u2" })).status, 401);
  reset({ pro: false });
  assert.equal((await cs({ action: "cs-get" })).ok, true);
  assert.equal((await cs({ action: "cs-set", items: [{ n: "Maggi", c: 11 }] })).status, 402);
  assert.equal((await cs({ action: "cs-profit" })).status, 402);
});

test("costs are kept apart from the public page", async () => {
  reset();
  const r = await cs({ action: "cs-set", items: [{ n: "Atta 5 kg", c: "240" }, { n: " maggi ", c: "₹11.50" }] });
  assert.deepEqual(r.costs, { "atta 5 kg": 240, maggi: 11.5 });
  assert.ok(!kv.get("customer-memory:" + PID).includes("240"));
  assert.equal((await cs({ action: "cs-set", items: [{ n: "Maggi", c: "abc" }] })).status, 400);
  // rename and clear
  await cs({ action: "cs-set", items: [{ n: "Atta 5kg pack", c: 240, from: "Atta 5 kg" }, { n: "Maggi", c: "" }] });
  assert.deepEqual((await cs({ action: "cs-get" })).costs, { "atta 5kg pack": 240 });
});

test("profit from shop sales: discount shared, old sales keep the cost they were sold at", async () => {
  reset();
  await cs({ action: "cs-set", items: [{ n: "Atta 5 kg", c: 240 }, { n: "Maggi", c: 11 }] });
  const r = await sale([["0.0", 2], ["0.1", 10]], { disc: 21 }); // 530 + 140 − 21 = 649
  assert.equal(r.ok, true); assert.equal(r.order.items[0].c, 240);
  await cs({ action: "cs-set", items: [{ n: "Atta 5 kg", c: 255 }] }); // cost goes up later
  await sale([["0.0", 1]]);
  const p = await cs({ action: "cs-profit", period: "today" });
  // sale 1: atta 530 − 21×530/670, maggi 140 − 21×140/670 → 649 − (480 + 110) = 59; sale 2: 265 − 255 = 10
  assert.equal(p.sales, 914); assert.equal(p.counted, 914); assert.equal(p.cost, 845); assert.equal(p.profit, 69);
  assert.equal(p.items.find(x => x.name === "Atta 5 kg").qty, 3);
  assert.equal(p.missing.length, 0);
});

test("items without a cost are listed and left out of profit; options use the item's cost", async () => {
  reset();
  await cs({ action: "cs-set", items: [{ n: "Kurta", c: 700 }] });
  kv.set("customer-memory:" + PID, kv.get("customer-memory:" + PID)); // Pro store order with an option
  const m = JSON.parse(kv.get("customer-memory:" + PID)); m.store = true; kv.set("customer-memory:" + PID, JSON.stringify(m));
  const o = await BZ.handle({ action: "bz-order", id: PID, ref: "ABCDE", items: [["0.2", 1, "Kurta", { v: 1 }], ["0.1", 3, "Maggi"]], name: "Riya", phone: "9829012345", mode: "pickup", direct: true }, ctx(null));
  assert.equal(o.ok, true);
  assert.equal(JSON.parse(kv.get("bzo:" + PID + ":ABCDE")).items[0].c, 700);
  const st = await BZ.handle({ action: "bz-status", id: PID, ref: "ABCDE" }, ctx(null)); // what the customer sees: no cost
  assert.ok(!JSON.stringify(st).includes("700"));
  const p = await cs({ action: "cs-profit", period: "today" });
  assert.equal(p.sales, 1142); assert.equal(p.counted, 1100); assert.equal(p.profit, 400); assert.equal(p.margin, 36.4);
  assert.deepEqual(p.missing, [{ name: "Maggi", qty: 3, sales: 42 }]);
});

test("GST shops: bills count the taxable value, returns take profit back, the bill link shows no cost", async () => {
  reset();
  await B.handle({ action: "bl-settings", id: PID, settings: { gst: "regular", gstin: SELLER, legal: "Sharma LLP", prefix: "SS", inc: true, rate: 5, hsn: "6211" } }, ctx());
  await cs({ action: "cs-set", items: [{ n: "Kurta set", c: 2000 }] });
  const r = await B.handle({ action: "bl-create", id: PID, items: [{ n: "Kurta set", hsn: "6211", q: 2, p: 3150, r: 5 }] }, ctx());
  assert.equal(r.ok, true);
  const doc = JSON.parse(kv.get("bl:" + r.bill.t)); assert.deepEqual(doc.cs, [2000]);
  assert.ok(!JSON.stringify((await B.handle({ action: "bl-get", t: r.bill.t }, ctx(null))).bill).includes("2000"));
  let p = await cs({ action: "cs-profit", period: "today" });
  assert.equal(p.gst, "regular"); assert.equal(p.sales, 6000); assert.equal(p.profit, 2000); // 6300 incl. 5% GST → 6000
  await cs({ action: "cs-set", items: [{ n: "Kurta set", c: 2500 }] });
  const cn = await B.handle({ action: "bl-credit", id: PID, t: r.bill.t, items: [{ k: 0, q: 1 }] }, ctx());
  assert.equal(cn.ok, true);
  p = await cs({ action: "cs-profit", period: "today" });
  assert.equal(p.sales, 3000); assert.equal(p.cost, 2000); assert.equal(p.profit, 1000); // the return uses the 2000 it was sold at
  // a shop sale in a GST shop has GST taken out at the item's rate (from bills) or the default rate
  await cs({ action: "cs-set", items: [{ n: "Maggi", c: 10 }] });
  await sale([["0.1", 21]]); // 294 incl. 5% → 280
  p = await cs({ action: "cs-profit", period: "today" });
  assert.equal(p.items.find(x => x.name === "Maggi").sales, 280); assert.equal(p.items.find(x => x.name === "Maggi").profit, 70);
});
