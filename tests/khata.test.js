// Run: node --test tests/*.test.js
// Smart Udhaar: the shop's khata, customer confirmation and payment claims, reminders, limits and the Pro gate.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": kv.set(a[0], a[1]); return "OK";
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": return 1;
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZCARD": return (zs.get(a[0]) || new Map()).size;
    case "ZRANGE": return [...(zs.get(a[0]) || new Map()).entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]);
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
const stamps = [];
const ph10 = p => { const d = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? d : ""; };
require.cache[path.resolve(__dirname, "../api/_loyal.js")] = { id: "loyal", filename: "loyal", loaded: true, exports: { ph10, orderStamp: async (id, p, n) => { stamps.push(p); return { s: 3, n: 10, r: "Free tea" }; } } };
const K = require("../api/_khata.js");

const ID = "shop12345", owner = { id: "u1" };
const ctx = (u = owner) => ({ ip: "1.2.3.4", user: async () => u });
const setShop = (o = {}) => kv.set("customer-memory:" + ID, JSON.stringify({ kind: "biz", owner: "u1", proUntil: Date.now() + 864e5, data: { t: "Sharma Kirana", wa: "9876500000", upi: { id: "sharma@okaxis" } }, ...o }));
const own = (b, u) => K.handle({ id: ID, ...b }, ctx(u));
const reset = () => { kv.clear(); zs.clear(); stamps.length = 0; setShop(); };

test("udhaar is added, the customer gets a WhatsApp message with their own link, and the balance adds up", async () => {
  reset();
  const r = await own({ action: "kh-own-add", phone: "+91 98290 11111", name: "Ramesh", amount: "450", note: "atta, oil" });
  assert.equal(r.ok, true); assert.equal(r.customer.bal, 450); assert.equal(r.customer.name, "Ramesh");
  assert.match(r.link, /^https:\/\/getkeepsake\.in\/u\/[a-f0-9]{16}$/);
  const msg = decodeURIComponent(r.wa.split("?text=")[1]);
  assert.match(r.wa, /^https:\/\/wa\.me\/919829011111\?/); assert.match(msg, /Ramesh ji/); assert.match(msg, /₹450 udhaar/); assert.match(msg, /Kul baaki: ₹450/); assert.ok(msg.includes(r.link));
  await own({ action: "kh-own-add", phone: "9829011111", amount: 200 });
  const p = await own({ action: "kh-own-add", phone: "9829011111", amount: 300, kind: "pay", note: "UPI" });
  assert.equal(p.customer.bal, 350); assert.match(decodeURIComponent(p.wa), /₹300 ka payment mil gaya/);
  const L = await own({ action: "kh-own-list" });
  assert.equal(L.sum.pending, 350); assert.equal(L.sum.due, 1); assert.equal(L.sum.recovered, 300); assert.equal(L.customers[0].open, 2);
});

test("only the owner sees the khata; bad numbers and amounts are refused", async () => {
  reset();
  assert.equal((await own({ action: "kh-own-list" }, { id: "someone" })).status, 401);
  assert.equal((await own({ action: "kh-own-list" }, null)).status, 401);
  assert.equal((await own({ action: "kh-own-add", phone: "12345", amount: 10 })).status, 400);
  assert.equal((await own({ action: "kh-own-add", phone: "9829011111", amount: "abc" })).status, 400);
  assert.equal((await own({ action: "kh-own-add", phone: "9829011111", amount: 10, kind: "pay" })).status, 404); // nothing to pay yet
  await own({ action: "kh-own-add", phone: "9829011111", amount: 100 });
  assert.equal((await own({ action: "kh-own-add", phone: "9829011111", amount: 150, kind: "pay" })).status, 400); // more than owed
});

test("the customer link shows only their khata; they confirm entries and say they've paid", async () => {
  reset();
  const a = await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 500 });
  await own({ action: "kh-own-add", phone: "9829022222", name: "Sita", amount: 900 });
  const tok = a.link.split("/u/")[1];
  const v = await K.handle({ action: "kh-view", tok }, ctx(null));
  assert.equal(v.khata.bal, 500); assert.equal(v.khata.e.length, 1); assert.equal(v.khata.shop.upi.id, "sharma@okaxis"); assert.equal(v.khata.shop.name, "Sharma Kirana");
  assert.ok(!JSON.stringify(v).includes("Sita") && !JSON.stringify(v).includes("9829022222"));
  const c = await K.handle({ action: "kh-confirm", tok, eid: v.khata.e[0].id }, ctx(null));
  assert.equal(c.khata.e[0].ok, true);
  await own({ action: "kh-own-add", phone: "9829011111", amount: 50, force: true }); await own({ action: "kh-own-add", phone: "9829011111", amount: 60, force: true });
  assert.ok((await K.handle({ action: "kh-confirm", tok, eid: "all" }, ctx(null))).khata.e.every(x => x.ok));
  await own({ action: "kh-own-add", phone: "9829011111", amount: 110, kind: "pay" });
  assert.equal((await K.handle({ action: "kh-claim", tok, amount: 900 }, ctx(null))).status, 400);
  const cl = await K.handle({ action: "kh-claim", tok, amount: 500 }, ctx(null));
  assert.equal(cl.khata.claims[0].a, 500); assert.equal(cl.khata.bal, 500); // the balance changes only when the shop accepts
  const g = await own({ action: "kh-own-get", phone: "9829011111" });
  assert.equal(g.customer.claims, 1); assert.ok(g.customer.e.filter(x => x.a > 0).every(x => x.ok));
  const acc = await own({ action: "kh-own-add", phone: "9829011111", amount: 500, kind: "pay", claim: g.customer.c[0].id });
  assert.equal(acc.customer.bal, 0); assert.equal(acc.customer.claims, 0);
  assert.equal((await K.handle({ action: "kh-view", tok: "0000000000000000" }, ctx(null))).status, 404);
  assert.equal((await K.handle({ action: "kh-view", tok: "../../x" }, ctx(null))).status, 404);
});

test("reminders get firmer each time and are counted", async () => {
  reset();
  await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 1200 });
  const t = [];
  for (let i = 0; i < 4; i++) t.push((await own({ action: "kh-own-remind", phone: "9829011111" })).text);
  assert.match(t[0], /chhoti si yaad/); assert.match(t[1], /is hafte/); assert.match(t[2], /aaj hi/); assert.match(t[3], /aaj hi/);
  assert.ok(t.every(x => x.includes("₹1,200") && x.includes("/u/")));
  const g = await own({ action: "kh-own-get", phone: "9829011111" });
  assert.equal(g.customer.nr, 4);
  await own({ action: "kh-own-add", phone: "9829011111", amount: 1200, kind: "pay" });
  assert.equal((await own({ action: "kh-own-remind", phone: "9829011111" })).status, 400);
});

test("limits and long-pending udhaar ask before adding more; force goes ahead; same order isn't added twice", async () => {
  reset();
  await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 800 });
  await own({ action: "kh-own-limit", phone: "9829011111", lim: 1000 });
  const w = await own({ action: "kh-own-add", phone: "9829011111", amount: 300 });
  assert.equal(w.ok, false); assert.match(w.warn, /above the limit of ₹1,000/);
  assert.equal((await own({ action: "kh-own-add", phone: "9829011111", amount: 300, force: true })).customer.bal, 1100);
  const o = await own({ action: "kh-own-add", phone: "9829033333", name: "Mohan", amount: 250, src: "order:AB12", force: true });
  assert.equal(o.ok, true);
  assert.equal((await own({ action: "kh-own-add", phone: "9829033333", amount: 250, src: "order:AB12", force: true })).status, 409);
  // 50-day-old udhaar
  const c = JSON.parse(kv.get("kh:" + ID + ":9829033333")); c.e[0].t -= 50 * 864e5; kv.set("kh:" + ID + ":9829033333", JSON.stringify(c));
  assert.match((await own({ action: "kh-own-add", phone: "9829033333", amount: 50 })).warn, /for 50 days/);
  assert.equal(K.age(c), 50);
});

test("Pro is needed to add udhaar; after Pro ends the shop can still collect", async () => {
  reset();
  await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 600 });
  setShop({ proUntil: Date.now() - 1000 });
  const g = await own({ action: "kh-own-add", phone: "9829011111", amount: 100 });
  assert.equal(g.status, 402);
  assert.equal((await own({ action: "kh-own-list" })).pro, false);
  assert.ok((await own({ action: "kh-own-remind", phone: "9829011111" })).wa);
  assert.equal((await own({ action: "kh-own-add", phone: "9829011111", amount: 600, kind: "pay" })).customer.bal, 0);
});

test("clearing the khata within 30 days earns a loyalty stamp; late payers don't", async () => {
  reset();
  await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 300 });
  const p = await own({ action: "kh-own-add", phone: "9829011111", amount: 300, kind: "pay" });
  assert.deepEqual(p.stamp, { s: 3, n: 10, r: "Free tea" }); assert.deepEqual(stamps, ["9829011111"]);
  await own({ action: "kh-own-add", phone: "9829044444", name: "Late", amount: 300 });
  const c = JSON.parse(kv.get("kh:" + ID + ":9829044444")); c.e[0].t -= 40 * 864e5; kv.set("kh:" + ID + ":9829044444", JSON.stringify(c));
  assert.equal((await own({ action: "kh-own-add", phone: "9829044444", amount: 300, kind: "pay" })).stamp, null);
  // a part payment doesn't earn one either
  await own({ action: "kh-own-add", phone: "9829055555", name: "Part", amount: 300 });
  assert.equal((await own({ action: "kh-own-add", phone: "9829055555", amount: 100, kind: "pay" })).stamp, null);
  assert.equal(stamps.length, 1);
});

test("entries can be deleted, and the oldest unpaid udhaar sets the age", async () => {
  reset();
  const a = await own({ action: "kh-own-add", phone: "9829011111", name: "Ramesh", amount: 300 });
  const d = await own({ action: "kh-own-del", phone: "9829011111", eid: a.entry.id });
  assert.equal(d.customer.bal, 0);
  const now = Date.now();
  assert.equal(K.age({ e: [{ t: now - 20 * 864e5, a: 100 }, { t: now - 5 * 864e5, a: 100 }, { t: now - 864e5, a: -100 }] }, now), 5);
  assert.equal(K.age({ e: [{ t: now - 20 * 864e5, a: 100 }, { t: now, a: -100 }] }, now), 0);
});
