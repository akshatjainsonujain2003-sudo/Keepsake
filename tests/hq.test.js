// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), zs = [];
const cmd = async (c, ...a) => {
  if (c === "ZRANGE") return zs.slice().sort((x, y) => y[0] - x[0]).map(x => x[1]).slice(+a[1], +a[2] + 1);
  if (c === "MGET") return a.map(k => kv.has(k) ? kv.get(k) : null);
  if (c === "SCAN") return ["0", [...kv.keys()].filter(k => new RegExp("^" + a[2].replace("*", ".*") + "$").test(k))];
  if (c === "SCARD") return 0;
  throw new Error("unmocked " + c);
};
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: { cmd, getj: async k => kv.has(k) ? JSON.parse(kv.get(k)) : null } };
const H = require("../api/_hq.js");
const now = Date.now(), put = (k, v) => kv.set(k, JSON.stringify(v));
put("order:o1", { kind: "biz", plan: "digital", amount: 1000, paidAt: now - 1000, owner: "aaaaaaaaaaaaaaaa" }); zs.push([now - 1000, "o1"]);
put("order:o2", { kind: "site", plan: "digital", amount: 499, paidAt: now - 500, owner: "bbbbbbbbbbbbbbbb" }); zs.push([now - 500, "o2"]);
put("order:o3", { kind: "biz", plan: "pro", upgrade: true, amount: 199, paidAt: now - 200, owner: "aaaaaaaaaaaaaaaa" }); zs.push([now - 200, "o3"]);
put("order:o4", { kind: "card", plan: "frameQr", amount: 399, paidAt: now - 100, owner: "bbbbbbbbbbbbbbbb" }); zs.push([now - 100, "o4"]);
put("customer-memory:shop12345", { kind: "biz", owner: "aaaaaaaaaaaaaaaa", title: "Maison Noor", paid: true, data: {} });
put("customer-memory:gift12345", { kind: "site", owner: "bbbbbbbbbbbbbbbb", title: "Riya", paid: true, data: {} });
put("customer:aaaaaaaaaaaaaaaa", { name: "Shop owner", email: "s@x.in" });
put("customer:bbbbbbbbbbbbbbbb", { name: "Gift buyer", email: "g@x.in" });

test("HQ shows only business orders, pages and owners", async () => {
  const os = await H.orders();
  assert.deepEqual(os.map(o => o.id), ["o3", "o1"]);
  const s = await H.summary();
  assert.equal(s.all.rev, 1199); assert.equal(s.all.n, 2); assert.equal(s.toShip, 0);
  assert.deepEqual(s.mix, { page: 1000, store: 0, pro: 199, extra: 0 });
  const ps = await H.pages(); assert.deepEqual(ps.map(p => p.id), ["shop12345"]);
  const pp = await H.people(); assert.deepEqual(pp.map(p => p.name), ["Shop owner"]);
  assert.equal((await H.latest()).id, "o3");
});
