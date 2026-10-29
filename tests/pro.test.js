// Run: node --test tests/*.test.js
// Keepsake Pro: monthly and yearly, with the online store included.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");

const kv = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": return kv.delete(a[0]) ? 1 : 0;
    case "ZADD": return 1;
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
require.cache[path.resolve(__dirname, "../api/_hq.js")] = { id: "hq", filename: "hq", loaded: true, exports: { notify: async () => {} } };
delete process.env.PRICE_PRO; delete process.env.PRICE_PRO_YEAR;
const P = require("../api/_pay.js");
const DAY = 864e5;
const live = (o = {}) => ({ kind: "biz", owner: "u1", paid: true, data: { t: "Maison Noor" }, ...o });

test("prices: Pro ₹299 a month, ₹2,999 a year; no separate store", () => {
  const c = P.catalog();
  assert.equal(c.pro.price, 299); assert.equal(c.pro.days, 30);
  assert.equal(c.proYear.price, 2999); assert.equal(c.proYear.days, 365);
  assert.equal(c.store, undefined);
  assert.deepEqual(P.amountFor(live(), "pro"), { rupees: 299, upgrade: true });
  assert.deepEqual(P.amountFor(live(), "proYear"), { rupees: 2999, upgrade: true });
  assert.match(P.amountFor(live(), "store").error, /comes with Keepsake Pro/);
  assert.equal(P.describe(live(), "proYear", true), "Keepsake Pro · 1 year");
});

test("Pro needs a live page online; cash in HQ can make it live with Pro", () => {
  const draft = live({ paid: false });
  assert.match(P.amountFor(draft, "pro").error, /Activate your page first/);
  assert.deepEqual(P.amountFor(draft, "proYear", { cash: true }), { rupees: 1000 + 2999, upgrade: false });
  assert.match(P.amountFor({ kind: "site" }, "pro").error, /business pages/);
});

test("renewing: allowed in the last 45 days only", () => {
  assert.ok(!P.amountFor(live({ proUntil: Date.now() + 20 * DAY }), "proYear").error);
  assert.match(P.amountFor(live({ proUntil: Date.now() + 200 * DAY }), "pro").error, /already paid until/);
});

test("store is on with Pro, and with the old one-time store; off when Pro ends", () => {
  assert.equal(P.storeOn(live({ proUntil: Date.now() + DAY })), true);
  assert.equal(P.storeOn(live({ proUntil: Date.now() - DAY })), false);
  assert.equal(P.storeOn(live({ store: true })), true);
  assert.equal(P.storeOn(live()), false);
});

async function pay(id, plan, memory) {
  kv.set("customer-memory:" + id, JSON.stringify(memory));
  kv.set("order:o_" + id + plan, JSON.stringify({ memory: id, owner: "u1", kind: "biz", plan, upgrade: true, amount: 1, status: "created" }));
  await P.markPaid("o_" + id + plan, "pay_1");
  return fake.getj("customer-memory:" + id);
}

test("paying for a year adds 365 days, switches the store on and turns orders on once", async () => {
  const m = await pay("p1", "proYear", live());
  assert.ok(Math.abs(m.proUntil - (Date.now() + 365 * DAY)) < 5000);
  assert.ok(m.storeAt); assert.equal(m.data.ord, true); assert.equal(P.storeOn(m), true);
  assert.equal(kv.get("store-user:u1"), "1");
  // an owner who later switched orders off keeps them off on renewal
  m.data.ord = false; m.proUntil = Date.now() + 10 * DAY;
  const r = await pay("p1", "pro", m);
  assert.equal(r.data.ord, false);
  assert.ok(Math.abs(r.proUntil - (Date.now() + 40 * DAY)) < 5000);
});

test("after Pro ends the page keeps its catalogue allowance", async () => {
  kv.clear();
  const CM = path.resolve(__dirname, "../api/customer-memories.js");
  delete require.cache[CM];
  const src = require("fs").readFileSync(CM, "utf8");
  assert.match(src, /bigPage = memory => !!memory && \(!!memory\.store \|\| !!memory\.storeAt/);
});
