// Run: node --test tests/*.test.js
// Loyalty card with the staff PIN switched off: only the owner stamps, customers see their card update.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": kv.set(a[0], a[1]); return "OK";
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": case "DEL": return 1;
    case "EXISTS": return kv.has(a[0]) ? 1 : 0;
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZCARD": return (zs.get(a[0]) || new Map()).size;
    case "ZRANGE": return [...(zs.get(a[0]) || new Map()).keys()];
    default: throw new Error("unmocked " + c);
  }
};
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) } };
const L = require("../api/_loyal.js");
const ID = "shop12345", ctx = u => ({ ip: "1.1.1.1", user: async () => u });
const setShop = loy => kv.set("customer-memory:" + ID, JSON.stringify({ kind: "biz", owner: "u1", paid: true, loyalty: true, data: { t: "Chai Adda", loy: { on: true, n: 5, r: "Free chai", ...loy } } }));

test("PIN off: customers can't stamp themselves; the owner stamps and their card shows it", async () => {
  kv.clear(); zs.clear(); setShop({ pin: false });
  const j = await L.handle({ action: "loy-join", id: ID, name: "Riya", phone: "9829011111" }, ctx(null));
  assert.equal(j.card.pin, false);
  const self = await L.handle({ action: "loy-stamp", id: ID, phone: "9829011111", tok: j.tok, pin: "1234" }, ctx(null));
  assert.equal(self.status, 409); assert.match(self.error, /counter/);
  const o = await L.handle({ action: "loy-own-stamp", id: ID, phone: "9829011111" }, ctx({ id: "u1" }));
  assert.equal(o.card.s, 1);
  const c = await L.handle({ action: "loy-card", id: ID, phone: "9829011111", tok: j.tok }, ctx(null));
  assert.equal(c.card.s, 1); assert.equal(c.card.today, true);
  assert.equal((await L.handle({ action: "loy-own-list", id: ID }, ctx({ id: "u1" }))).cfg.pin, false);
});

test("PIN on (default): the counter PIN still works", async () => {
  kv.clear(); zs.clear(); setShop({});
  await L.handle({ action: "loy-own-pin", id: ID, pin: "4826" }, ctx({ id: "u1" }));
  const j = await L.handle({ action: "loy-join", id: ID, name: "Riya", phone: "9829011111" }, ctx(null));
  assert.equal(j.card.pin, true);
  const s = await L.handle({ action: "loy-stamp", id: ID, phone: "9829011111", tok: j.tok, pin: "4826" }, ctx(null));
  assert.equal(s.card.s, 1);
});
