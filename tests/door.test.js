// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict");
const D = require("../api/_door.js");
const SECRET = "test-door-secret-123456";
const res = () => { const r = { statusCode: 0, h: {}, body: "", setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(b) { this.body = String(b || ""); } }; return r; };
const get = (page, q = {}, cookie) => { const r = res(); const done = D.serve({ query: { page, ...q }, headers: cookie ? { cookie } : {} }, r); return { done, r }; };

test("admin pages are hidden without the door; the door sets a cookie that opens them", () => {
  delete process.env.ADMIN_DOOR;
  assert.equal(get("hq").r.statusCode, 404, "no ADMIN_DOOR set: hidden");
  process.env.ADMIN_DOOR = SECRET;
  for (const p of ["hq", "admin", "print-codes", "hq-sw", "hq-manifest"]) { const { done, r } = get(p); assert.ok(done); assert.equal(r.statusCode, 404, p); assert.doesNotMatch(r.body, /x-admin-key/); }
  assert.equal(get("hq", { door: "wrong-door-guess" }).r.statusCode, 404);
  const { r } = get("hq", { door: SECRET });
  assert.equal(r.statusCode, 302); assert.equal(r.h.location, "/hq");
  assert.match(r.h["set-cookie"], /HttpOnly/); assert.match(r.h["set-cookie"], /Secure/);
  const c = r.h["set-cookie"].split(";")[0];
  const ok = get("hq", {}, c).r; assert.equal(ok.statusCode, 200); assert.match(ok.body, /x-admin-key/, "the real HQ page");
  assert.equal(get("hq-sw", {}, c).r.h["content-type"].split(";")[0], "application/javascript");
  assert.equal(get("hq", {}, "ks_door=" + "0".repeat(64)).r.statusCode, 404);
  assert.equal(get("other").done, false, "other GETs fall through to the API");
});

test("admin API answers 404 without the door cookie", () => {
  process.env.ADMIN_DOOR = SECRET;
  assert.equal(D.open({ headers: {} }), false);
  assert.equal(D.open({ headers: { cookie: "ks_door=abc" } }), false);
  assert.equal(D.open({ headers: { cookie: "a=1; ks_door=" + D.token(SECRET) + "; b=2" } }), true);
  process.env.ADMIN_DOOR = "short";
  assert.equal(D.open({ headers: { cookie: "ks_door=" + D.token("short") } }), false, "a too-short door never opens");
});
