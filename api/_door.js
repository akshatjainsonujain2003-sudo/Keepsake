// The secret door for the admin pages and API. The pages live in api/_pages (never served as files) and are
// handed out by api/admin.js only to a browser that came in through the door once:
//   open https://getkeepsake.in/hq?door=<ADMIN_DOOR>  → sets a long-lived HttpOnly cookie on that device.
// Everyone else gets the normal "page not found", for the pages and for the API. ADMIN_DOOR lives only in
// Vercel's environment variables; if it isn't set (or is shorter than 12 characters) everything stays hidden.
const crypto = require("crypto"), fs = require("fs"), path = require("path");
const PAGES = { hq: ["hq.html", "text/html; charset=utf-8"], admin: ["admin.html", "text/html; charset=utf-8"], "print-codes": ["print-codes.html", "text/html; charset=utf-8"],
  "hq-sw": ["hq-sw.js", "application/javascript; charset=utf-8"], "hq-manifest": ["hq.webmanifest", "application/manifest+json"] };
const token = secret => crypto.createHmac("sha256", String(secret)).update("ks-hq-door-v1").digest("hex");
const secret = () => { const s = process.env.ADMIN_DOOR || ""; return s.length >= 12 ? s : ""; };
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function open(req) {
  const s = secret(); if (!s) return false;
  const m = String((req.headers || {}).cookie || "").match(/(?:^|;\s*)ks_door=([^;]+)/);
  return same(m ? m[1] : "", token(s));
}
function notFound(res) {
  let body = "<!doctype html><title>Page not found</title><h1>Page not found</h1>";
  try { body = fs.readFileSync(path.join(__dirname, "..", "404.html"), "utf8"); } catch (e) {}
  res.statusCode = 404; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex, nofollow"); res.end(body);
}
// GET /hq, /admin, /print-codes, /hq-sw.js, /hq.webmanifest (rewritten to /api/admin?page=...). Returns true when handled.
function serve(req, res) {
  const q = req.query || {}, name = String(q.page || ""), pg = PAGES[name];
  if (!pg) return false;
  const s = secret();
  if (q.door != null) {
    if (!s || !same(token(String(q.door)), token(s))) { notFound(res); return true; }
    res.statusCode = 302; res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", `ks_door=${token(s)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
    res.setHeader("Location", name === "hq" ? "/hq" : "/" + name); res.end(); return true;
  }
  if (!open(req)) { notFound(res); return true; }
  res.statusCode = 200; res.setHeader("Content-Type", pg[1]); res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow"); res.setHeader("X-Frame-Options", "SAMEORIGIN"); res.setHeader("Referrer-Policy", "no-referrer");
  res.end(fs.readFileSync(path.join(__dirname, "_pages", pg[0]))); return true;
}
module.exports = { open, token, serve, PAGES };
