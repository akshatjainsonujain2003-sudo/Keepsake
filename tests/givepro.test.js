// Run: node --test tests/*.test.js
// HQ: give Pro free to shops, or end it.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map();
const cmd = async (c, ...a) => { if (c === "GET") return kv.has(a[0]) ? kv.get(a[0]) : null; if (c === "SET") { kv.set(a[0], a[1]); return "OK"; } throw new Error("unmocked " + c); };
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
const H = require("../api/_hq.js"), P = require("../api/_pay.js");
const DAY = 864e5, put = (id, m) => kv.set("customer-memory:" + id, JSON.stringify({ kind: "biz", owner: "u-" + id, paid: true, title: id, data: { t: id }, ...m })), get = id => JSON.parse(kv.get("customer-memory:" + id));

test("gives days of Pro to many shops, adds to days they have, skips drafts", async () => {
  put("shopaaaa1", {}); put("shopbbbb2", { proUntil: Date.now() + 10 * DAY, storeAt: 1 }); put("shopcccc3", { paid: false });
  const r = await H.givePro(["shopaaaa1", "shopbbbb2", "shopcccc3", "bad id", "shopaaaa1"], 30, "Diwali <giveaway>");
  assert.deepEqual(r.done.map(x => x.id), ["shopaaaa1", "shopbbbb2"]);
  assert.deepEqual(r.skipped.map(x => [x.id, x.why]), [["shopcccc3", "draft, not live yet"]]);
  const a = get("shopaaaa1"), b = get("shopbbbb2");
  assert.ok(Math.abs(a.proUntil - (Date.now() + 30 * DAY)) < 5000); assert.ok(Math.abs(b.proUntil - (Date.now() + 40 * DAY)) < 5000);
  assert.equal(P.storeOn(a), true); assert.equal(a.data.ord, true); assert.equal(b.data.ord, undefined); // store switched on only the first time
  assert.equal(a.proGifts[0].note, "Diwali giveaway"); assert.equal(kv.get("store-user:u-shopaaaa1"), "1");
});

test("checks the number of days and the shop list", async () => {
  assert.match((await H.givePro([], 30)).error, /at least one/);
  assert.match((await H.givePro(["shopaaaa1"], 0)).error, /between 1 and 730/);
  assert.match((await H.givePro(["shopaaaa1"], 1000)).error, /between 1 and 730/);
});

test("ends Pro now, keeps the page", async () => {
  put("shopdddd4", { proUntil: Date.now() + 20 * DAY });
  assert.equal((await H.endPro("shopdddd4")).ok, true);
  const m = get("shopdddd4"); assert.equal(P.isPro(m), false); assert.equal(m.data.t, "shopdddd4");
  assert.match((await H.endPro("shopdddd4")).error, /isn't on/);
});
