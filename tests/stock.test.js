// Run: node --test tests/*.test.js
// Stock counts: sales take items out, cancels and returns put them back; at 0 an item is sold out.
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
    case "ZRANGE": { const z = [...(zs.get(a[0]) || new Map())].sort((x, y) => x[1] - y[1]).map(x => x[0]); if (a.includes("REV")) z.reverse(); return z; }
    default: throw new Error("unmocked " + c);
  }
};
let n = 0;
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)), rid: (len = 6) => ("t" + (++n) + "abcdefghijkmnpqrstuvwxyz").slice(0, len) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
require.cache[path.resolve(__dirname, "../api/_hq.js")] = { id: "hq", filename: "hq", loaded: true, exports: { notify: async () => ({}) } };
const BZ = require("../api/_biz.js"), B = require("../api/_bill.js");
const PID = "shop12345", ctx = (u = { id: "u1" }) => ({ ip: "1.1.1.1", user: async () => u });
const SELLER = [..."0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(c => "08AAPFU0939F1Z" + c).find(G.gstinOk);
function reset() {
  kv.clear(); zs.clear();
  kv.set("customer-memory:" + PID, JSON.stringify({ kind: "biz", owner: "u1", paid: true, store: true, proUntil: Date.now() + 30 * 864e5,
    data: { t: "Sharma Store", ord: true, wa: "9876543210", menu: [{ n: "Daily", items: [{ n: "Atta 5 kg", p: "265", k: 3 }, { n: "Maggi", p: "14" }, { n: "Ghee 1L", p: "620", k: 1, so: false }] }] } }));
}
const item = i => JSON.parse(kv.get("customer-memory:" + PID)).data.menu[0].items[i];

test("a page order takes stock out; cancelling puts it back; reopening takes it again", async () => {
  reset();
  const o = await BZ.handle({ action: "bz-order", id: PID, ref: "ABCDE", items: [["0.0", 2, "Atta 5 kg"], ["0.1", 5, "Maggi"]], name: "Riya", phone: "9829012345", mode: "pickup", direct: true }, ctx(null));
  assert.equal(o.ok, true);
  assert.equal(item(0).k, 1); assert.equal(item(1).k, undefined); // Maggi isn't counted, so nothing changes
  await BZ.handle({ action: "bz-own-order", id: PID, ref: "ABCDE", st: "cancel" }, ctx());
  assert.equal(item(0).k, 3);
  await BZ.handle({ action: "bz-own-order", id: PID, ref: "ABCDE", st: "prep" }, ctx());
  assert.equal(item(0).k, 1);
  await BZ.handle({ action: "bz-own-order", id: PID, ref: "ABCDE", st: "done" }, ctx());
  assert.equal(item(0).k, 1);
});

test("a shop sale to zero marks the item sold out; a return brings it back", async () => {
  reset();
  await B.handle({ action: "bl-settings", id: PID, settings: { gst: "regular", gstin: SELLER, legal: "Sharma LLP", prefix: "SS", inc: true, rate: 5, hsn: "1101" } }, ctx());
  const s = await BZ.handle({ action: "bz-own-sale", id: PID, items: [["0.2", 1]], pay: "cash" }, ctx());
  assert.equal(s.ok, true); assert.equal(item(2).k, 0); assert.equal(item(2).so, true);
  const b = await B.handle({ action: "bl-create", id: PID, items: [{ n: "atta 5 kg", hsn: "1101", q: 2, p: 265, r: 5 }] }, ctx());
  assert.equal(b.ok, true); assert.equal(item(0).k, 1);
  const cn = await B.handle({ action: "bl-credit", id: PID, t: b.bill.t, items: [{ k: 0, q: 1 }] }, ctx());
  assert.equal(cn.ok, true); assert.equal(item(0).k, 2);
  await B.handle({ action: "bl-cancel", id: PID, t: cn.bill.t }, ctx()); // cancelling the return takes it out again
  assert.equal(item(0).k, 1);
  await B.handle({ action: "bl-cancel", id: PID, t: b.bill.t }, ctx()); // then the bill itself: both back
  assert.equal(item(0).k, 3);
  const est = await B.handle({ action: "bl-create", id: PID, est: true, items: [{ n: "Atta 5 kg", hsn: "1101", q: 1, p: 265, r: 5 }] }, ctx());
  assert.equal(est.ok, true); assert.equal(item(0).k, 3); // an estimate doesn't touch stock
});

test("an item sold out by hand stays sold out when stock comes back", async () => {
  reset();
  const m = JSON.parse(kv.get("customer-memory:" + PID)); m.data.menu[0].items[0].so = true; kv.set("customer-memory:" + PID, JSON.stringify(m));
  await require("../api/_stock.js").move(PID, [{ n: "Atta 5 kg", q: 2 }], 1);
  assert.equal(item(0).k, 5); assert.equal(item(0).so, true);
});
