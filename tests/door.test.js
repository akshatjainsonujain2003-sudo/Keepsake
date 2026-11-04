// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path");
const D = require("../api/_door.js");
const SECRET = "test-door-secret-123456";

// middleware.js is an ES module for Vercel; load a copy as .mjs here.
let mw;
test.before(async () => { const f = path.join(os.tmpdir(), "ks-mw-" + process.pid + ".mjs"); fs.copyFileSync(path.join(__dirname, "../middleware.js"), f); mw = await import(f); });
const req = (u, cookie) => new Request("https://getkeepsake.in" + u, { headers: cookie ? { cookie } : {} });
global.fetch = async () => new Response("<h1>Page not found</h1>", { status: 200 }); // the 404 page

test("admin pages are hidden without the door, and the door sets a cookie", async () => {
  delete process.env.ADMIN_DOOR;
  assert.equal((await mw.default(req("/hq"))).status, 404, "no ADMIN_DOOR set: hidden");
  process.env.ADMIN_DOOR = SECRET;
  assert.equal((await mw.default(req("/hq"))).status, 404);
  assert.equal((await mw.default(req("/admin.html"))).status, 404);
  assert.equal((await mw.default(req("/hq?door=wrong-door-guess"))).status, 404);
  const r = await mw.default(req("/hq?door=" + SECRET));
  assert.equal(r.status, 302); assert.equal(r.headers.get("location"), "/hq");
  const ck = r.headers.get("set-cookie"); assert.match(ck, /HttpOnly/); assert.match(ck, /Secure/);
  const c = ck.split(";")[0];
  assert.equal(c, "ks_door=" + D.token(SECRET), "edge and server tokens match");
  const ok = await mw.default(req("/hq", c)); assert.equal(ok.headers.get("x-middleware-next"), "1");
  assert.equal((await mw.default(req("/hq", "ks_door=" + "0".repeat(64)))).status, 404);
});

test("admin API answers 404 without the door cookie", () => {
  process.env.ADMIN_DOOR = SECRET;
  assert.equal(D.open({ headers: {} }), false);
  assert.equal(D.open({ headers: { cookie: "ks_door=abc" } }), false);
  assert.equal(D.open({ headers: { cookie: "a=1; ks_door=" + D.token(SECRET) + "; b=2" } }), true);
  process.env.ADMIN_DOOR = "short";
  assert.equal(D.open({ headers: { cookie: "ks_door=" + D.token("short") } }), false, "a too-short door never opens");
});
