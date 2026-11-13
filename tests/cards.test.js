// Run: node --test tests/*.test.js
// Physical gift cards: designs, print runs, stock stages, cancelling a card, and that a card still activates like a prepaid code.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), z = new Map(), h = new Map();
const cmd = async (c, ...a) => {
  if (c === "GET") return kv.has(a[0]) ? kv.get(a[0]) : null;
  if (c === "MGET") return a.map(k => kv.has(k) ? kv.get(k) : null);
  if (c === "SET") { if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], String(a[1])); return "OK"; }
  if (c === "DEL") return kv.delete(a[0]) ? 1 : 0;
  if (c === "INCR") { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
  if (c === "EXPIRE") return 1;
  if (c === "ZADD") { const m = z.get(a[0]) || new Map(); m.set(a[2], +a[1]); z.set(a[0], m); return 1; }
  if (c === "ZRANGE") { const r = [...(z.get(a[0]) || new Map())].sort((x, y) => x[1] - y[1]).map(x => x[0]); if (a.includes("REV")) r.reverse(); return r.slice(+a[1], +a[2] < 0 ? undefined : +a[2] + 1); }
  if (c === "HSET") { const m = h.get(a[0]) || new Map(); for (let i = 1; i < a.length; i += 2) m.set(a[i], String(a[i + 1])); h.set(a[0], m); return 1; }
  if (c === "HGETALL") return [...(h.get(a[0]) || new Map())].flat();
  throw new Error("unmocked " + c);
};
let seq = 0;
const fake = { ok: () => true, cmd, rid: n => "id" + String(++seq).padStart(Math.max(4, n - 2), "0"), getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v, ...x) => cmd("SET", k, JSON.stringify(v), ...x) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
const C = require("../api/_cards.js"), P = require("../api/_prepaid.js");

let design, run;
test("saves a design and checks its fields", async () => {
  assert.match((await C.saveDesign({ name: "W", tier: "site" })).error, /name/);
  assert.match((await C.saveDesign({ name: "Wildflower", tier: "gold" })).error, /unlocks/);
  assert.match((await C.saveDesign({ name: "Wildflower", tier: "site", qrSize: 80 })).error, /12 and 40/);
  const r = await C.saveDesign({ name: "Wild<b>flower", tier: "site", qrSize: 22, front: "javascript:alert(1)", back: "https://example.com/back.pdf" });
  design = r.design;
  assert.equal(design.name, "Wildbflower"); assert.equal(design.front, ""); assert.equal(design.back, "https://example.com/back.pdf"); assert.equal(design.qrSize, 22);
  const e = await C.saveDesign({ id: design.id, name: "Wildflower", tier: "site" });
  assert.equal(e.design.id, design.id); assert.equal((await C.designs()).length, 1);
});

test("a print run makes codes with PINs, numbered in print order", async () => {
  assert.match((await C.createRun({ design: "nope00", count: 5 })).error, /design/);
  assert.match((await C.createRun({ design: design.id, count: 0 })).error, /between 1 and 200/);
  run = (await C.createRun({ design: design.id, count: 6, note: "first order" })).run;
  const x = await C.runCards(run.id);
  assert.equal(x.cards.length, 6); assert.deepEqual(x.cards.map(c => c.n), [1, 2, 3, 4, 5, 6]);
  assert.ok(x.cards.every(c => /^KS[A-Z2-9]{8}$/.test(c.code) && /^\d{6}$/.test(c.pin) && c.stage === "printing" && c.status === "new"));
  assert.equal(new Set(x.cards.map(c => c.pin)).size, 6);
  assert.deepEqual(C.tally(x.cards), { made: 6, printing: 6, stock: 0, shop: 0, sold: 0, active: 0, void: 0 });
});

test("cards move from the printer to stock, to a shop and to direct sales", async () => {
  assert.equal((await C.move({ run: run.id, to: "stock", from: "printing", count: "all" })).moved, 6);
  assert.match((await C.move({ run: run.id, to: "shop", from: "stock", count: 2 })).error, /shop's name/);
  assert.match((await C.move({ run: run.id, to: "shop", from: "stock", count: 9, where: "Bloom Florist" })).error, /Only 6 cards/);
  assert.equal((await C.move({ run: run.id, to: "shop", from: "stock", count: 3, where: "Bloom Florist" })).moved, 3);
  const x = await C.runCards(run.id);
  assert.deepEqual(x.cards.map(c => c.stage), ["shop", "shop", "shop", "stock", "stock", "stock"]);
  assert.equal((await C.move({ run: run.id, to: "sold", codes: [x.cards[5].code], where: "Instagram" })).moved, 1);
  assert.deepEqual(C.tally((await C.runCards(run.id)).cards), { made: 6, printing: 0, stock: 2, shop: 3, sold: 1, active: 0, void: 0 });
});

test("a cancelled card can't be activated, and can be brought back", async () => {
  const x = await C.runCards(run.id), c = x.cards[3];
  kv.set("customer-memory:memory0001", JSON.stringify({ kind: "site", owner: "u1", title: "Us" }));
  assert.equal((await C.setVoid(c.code, true)).void, true);
  const r = await P.claim({ code: c.code, pin: c.pin, id: "memory0001", user: { id: "u1" }, ip: "1.1.1.1" });
  assert.equal(r.status, 423);
  assert.match((await C.unlock(c.code)).error, /cancelled/);
  assert.equal((await C.lookup(c.code)).card.status, "void");
  assert.equal((await C.setVoid(c.code, false)).void, false);
  assert.equal((await C.lookup("https://getkeepsake.in/k/" + c.code.toLowerCase())).card.status, "new");
});

test("a card activates with its PIN and shows up in the counts", async () => {
  const x = await C.runCards(run.id), c = x.cards[0];
  const r = await P.claim({ code: c.code, pin: c.pin, id: "memory0001", user: { id: "u1" }, ip: "2.2.2.2" });
  assert.equal(r.ok, true); assert.equal(r.url, "/s/memory0001");
  const f = (await C.lookup(c.code)).card;
  assert.equal(f.status, "active"); assert.equal(f.n, 1); assert.equal(f.page, "/s/memory0001"); assert.equal(f.run.id, run.id); assert.equal(f.where, "Bloom Florist");
  assert.match((await C.setVoid(c.code, true)).error, /already activated/);
  assert.match((await C.move({ run: run.id, to: "stock", codes: [c.code] })).error, /No cards/);
  const s = await C.summary();
  assert.deepEqual(s.total, { made: 6, printing: 0, stock: 2, shop: 2, sold: 1, active: 1, void: 0 });
  assert.deepEqual(s.shops, [{ name: "Bloom Florist", given: 3, active: 1 }]);
  assert.equal(s.days.length, 30); assert.equal(s.days[29].n, 1);
  assert.equal(s.designs[0].made, 6); assert.equal(s.runs[0].active, 1);
});

test("the admin route answers cards actions", async () => {
  assert.equal((await C.handle({ action: "cards-run", id: "missing1" })).status, 404);
  assert.equal((await C.handle({ action: "cards-find", q: "hello" })).status, 400);
  assert.equal((await C.handle({ action: "cards-run", id: run.id })).tally.made, 6);
  assert.match((await C.handle({ action: "cards-nope" })).error, /Unknown/);
});
