// Run: node --test tests/*.test.js
// Pro Store orders: options, colours and add-ons priced on the server, delivery charge, stock, loyalty stamp when done.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": return kv.delete(a[0]) ? 1 : 0;
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": case "ZREMRANGEBYRANK": return 1;
    case "EXISTS": return kv.has(a[0]) ? 1 : 0;
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZCARD": return (zs.get(a[0]) || new Map()).size;
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
require.cache[path.resolve(__dirname, "../api/_hq.js")] = { id: "hq", filename: "hq", loaded: true, exports: { notify: async () => {} } };
const B = require("../api/_biz.js");
const PID = "shop12345", owner = { id: "u1" };
const ctx = (u = null, ip = "1.1.1.1") => ({ ip, user: async () => u });
let refN = 0; const REF = () => { const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let n = ++refN, r = ""; for (let i = 0; i < 5; i++) { r += A[n % 31]; n = Math.floor(n / 31) + 7; } return r; };
function shop(o = {}) {
  kv.set("customer-memory:" + PID, JSON.stringify({ kind: "biz", owner: "u1", paid: true, loyalty: true, proUntil: o.pro === false ? 0 : Date.now() + 30 * 864e5,
    data: { t: "Brew & Bloom", ord: true, wa: "9876543210", dfee: 30, fd: 500, loy: { on: true, n: 8, r: "A free coffee", ...(o.loy || {}) },
      menu: [{ n: "Coffee", items: [
        { n: "Iced Latte", p: "210", v: [{ n: "Regular" }, { n: "Large", p: 40 }, { n: "Huge", p: 90, so: true }], a: [{ n: "Extra shot", p: 30 }, { n: "Oat milk", p: 50 }] },
        { n: "Kurta", p: "3490", c: ["Ivory", "Rose"], k: 2 },
        { n: "Croissant", p: "140", k: 0 }] }] } }));
}
const order = (items, x = {}) => B.handle({ action: "bz-order", id: PID, ref: REF(), items, name: "Riya", phone: "9829012345", mode: "pickup", direct: true, ...x }, ctx(null, "9.9.9." + refN));

test("options and add-ons are priced from the shop's product, not the phone", async () => {
  shop();
  const r = await order([["0.0", 2, "Iced Latte", { v: 1, a: [0, 0, 1] }]]);
  assert.equal(r.ok, true); assert.equal(r.tot, 2 * (210 + 40 + 30 + 50));
  const o = await fake.getj("bzo:" + PID + ":" + r.ref);
  assert.equal(o.items[0].n, "Iced Latte (Large, Extra shot, Oat milk)"); assert.equal(o.items[0].p, 330);
});

test("a sold-out option is refused; no option picked means the first in stock", async () => {
  shop();
  assert.equal((await order([["0.0", 1, "Iced Latte", { v: 2 }]])).status, 400);
  const r = await order([["0.0", 1, "Iced Latte"]]); assert.equal(r.tot, 210);
});

test("colours are recorded, stock caps the quantity, zero stock is refused", async () => {
  shop();
  const r = await order([["0.1", 5, "Kurta", { c: 1 }], ["0.2", 1, "Croissant"]]);
  const o = await fake.getj("bzo:" + PID + ":" + r.ref);
  assert.deepEqual(o.items.map(x => [x.n, x.q]), [["Kurta (Rose)", 2]]); assert.equal(r.tot, 6980);
});

test("delivery charge below the free-delivery amount only", async () => {
  shop();
  const a = await order([["0.0", 1, "Iced Latte", { v: 0 }]], { mode: "delivery", addr: "C-Scheme" });
  assert.equal(a.tot, 240); assert.equal((await fake.getj("bzo:" + PID + ":" + a.ref)).fee, 30);
  const b = await order([["0.0", 3, "Iced Latte", { v: 0 }]], { mode: "delivery", addr: "C-Scheme" });
  assert.equal(b.tot, 630);
  const c = await order([["0.0", 1, "Iced Latte", { v: 0 }]]); assert.equal(c.tot, 210); // pickup: no charge
});

test("without Pro the extras are ignored (catalogue mode on WhatsApp)", async () => {
  shop({ pro: false });
  const r = await B.handle({ action: "bz-order", id: PID, ref: REF(), items: [["0.0", 1, "Iced Latte", { v: 1, a: [0] }]], name: "Riya", mode: "pickup" }, ctx(null, "8.8.8.8"));
  assert.equal(r.tot, 210);
});

test("marking an online order done adds one loyalty stamp, once, and the customer sees it", async () => {
  shop();
  const r = await order([["0.0", 1, "Iced Latte", { v: 0 }]]);
  const d = await B.handle({ action: "bz-own-order", id: PID, ref: r.ref, st: "done" }, ctx(owner));
  assert.deepEqual(d.order.loy, { s: 1, n: 8, r: "A free coffee" });
  const again = await B.handle({ action: "bz-own-order", id: PID, ref: r.ref, st: "done" }, ctx(owner));
  assert.equal(again.order.loy.s, 1);
  const card = await fake.getj("loy:" + PID + ":9829012345"); assert.equal(card.s, 1); assert.equal(card.h[0].by, "order");
  const s = await B.handle({ action: "bz-status", id: PID, ref: r.ref }, ctx());
  assert.equal(s.loy.s, 1);
});

test("the shop can switch order stamps off", async () => {
  kv.clear(); zs.clear(); shop({ loy: { ord: false } });
  const r = await order([["0.0", 1, "Iced Latte", { v: 0 }]]);
  const d = await B.handle({ action: "bz-own-order", id: PID, ref: r.ref, st: "done" }, ctx(owner));
  assert.equal(d.order.loy, undefined); assert.equal(kv.has("loy:" + PID + ":9829012345"), false);
});
