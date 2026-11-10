// Run: node --test tests/*.test.js
// Linking a blank business QR board to a page that already exists (owner from the dashboard, salesperson for their shops).
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), sets = new Map(), zs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": kv.delete(a[0]); return 1;
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "DECR": { const n = (+kv.get(a[0]) || 0) - 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": return 1;
    case "SADD": { const s = sets.get(a[0]) || new Set(); s.add(a[1]); sets.set(a[0], s); return 1; }
    case "SREM": { (sets.get(a[0]) || new Set()).delete(a[1]); return 1; }
    case "SCARD": return (sets.get(a[0]) || new Set()).size;
    case "SMEMBERS": return [...(sets.get(a[0]) || new Set())];
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZSCORE": { const z = zs.get(a[0]); return z && z.has(a[1]) ? String(z.get(a[1])) : null; }
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)), rid: () => "batch001" };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
const P = require("../api/_prepaid.js");

const PAGE = "shop12345", OTHER = "shop99999", owner = { id: "u1" };
const ctx = (u = owner) => ({ ip: "1.2.3.4", user: async () => u });
const code = n => "KSAAAAAAA" + "ABCDEFGH"[n];
const board = (n, o = {}) => kv.set("pcode:" + code(n), JSON.stringify({ code: code(n), pin: "123456", tier: "biz", batch: "b1", status: "new", ...o }));
const page = (id, o = {}) => { kv.set("customer-memory:" + id, JSON.stringify({ kind: "biz", owner: "u1", title: "Sharma Kirana", data: {}, ...o })); const s = sets.get("customer-memories:u1") || new Set(); s.add(id); sets.set("customer-memories:u1", s); };
const reset = () => { kv.clear(); sets.clear(); zs.clear(); page(PAGE); for (let i = 0; i < 7; i++) board(i); };
const own = (b, u) => P.ownerHandle({ id: PAGE, ...b }, ctx(u));

test("owner links a blank board to their live page, by code or by the scanned link", async () => {
  reset();
  const r = await own({ action: "qr-link", qr: "https://getkeepsake.in/k/" + code(0).toLowerCase() });
  assert.equal(r.ok, true); assert.equal(r.boards.length, 1); assert.equal(r.url, "/b/" + PAGE);
  const rec = JSON.parse(kv.get("pcode:" + code(0)));
  assert.equal(rec.status, "claimed"); assert.equal(rec.memory, PAGE); assert.equal(rec.kind, "biz"); assert.equal(rec.linkedBy, "owner");
  assert.equal((await own({ action: "qr-link", qr: code(0) })).already, true);
  assert.equal((await own({ action: "qr-boards" })).boards[0].code, code(0));
});

test("a board can't be taken by someone else, linked twice, or linked to an unpaid page", async () => {
  reset();
  assert.equal((await own({ action: "qr-link", qr: code(0) }, null)).status, 401);
  assert.equal((await own({ action: "qr-link", qr: code(0) }, { id: "u2" })).status, 404);
  await own({ action: "qr-link", qr: code(0) });
  page(OTHER);
  assert.equal((await P.ownerHandle({ id: OTHER, action: "qr-link", qr: code(0) }, ctx())).status, 409);
  page(OTHER, { paid: false });
  assert.equal((await P.ownerHandle({ id: OTHER, action: "qr-link", qr: code(1) }, ctx())).status, 402);
  board(2, { tier: "card" }); assert.equal((await own({ action: "qr-link", qr: code(2) })).status, 400);
  board(3, { locked: true }); assert.equal((await own({ action: "qr-link", qr: code(3) })).status, 423);
  assert.equal((await own({ action: "qr-link", qr: "KSZZZZZZZZ" })).status, 404);
  assert.equal((await own({ action: "qr-link", qr: "hello" })).status, 400);
});

test("at most 5 boards per page; removing one makes it blank again", async () => {
  reset();
  for (let i = 0; i < 5; i++) assert.equal((await own({ action: "qr-link", qr: code(i) })).ok, true);
  assert.equal((await own({ action: "qr-link", qr: code(5) })).status, 409);
  const r = await own({ action: "qr-unlink", qr: code(1) });
  assert.equal(r.boards.length, 4);
  assert.equal(JSON.parse(kv.get("pcode:" + code(1))).status, "new");
  assert.equal((await own({ action: "qr-link", qr: code(5) })).ok, true);
  assert.equal((await own({ action: "qr-unlink", qr: code(6) })).status, 404);
});

test("a salesperson links boards only for shops they signed up", async () => {
  reset();
  const sp = { code: "SPABCD" };
  assert.equal((await P.salesLink(sp, { qr: code(0), page: "/b/" + PAGE }, "1.1.1.1")).status, 403);
  await cmd("ZADD", "sp-shops:SPABCD", Date.now(), PAGE);
  const r = await P.salesLink(sp, { qr: code(0), page: "/b/" + PAGE }, "1.1.1.1");
  assert.equal(r.ok, true); assert.equal(r.title, "Sharma Kirana");
  assert.equal(JSON.parse(kv.get("pcode:" + code(0))).linkedBy, "sp:SPABCD");
  assert.equal((await P.salesLink(sp, { qr: code(1), page: "" }, "1.1.1.1")).status, 400);
});

test("scanning a blank board: an owner with a live page is offered that page", async () => {
  reset();
  assert.equal(await P.ownerPage(owner), PAGE);
  assert.equal(await P.ownerPage(null), "");
  page(PAGE, { paid: false }); assert.equal(await P.ownerPage(owner), "");
});
