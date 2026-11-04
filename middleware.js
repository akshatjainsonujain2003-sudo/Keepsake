// Hides the admin pages (HQ, admin, print codes) from everyone who hasn't come in through the secret door.
// Open https://getkeepsake.in/hq?door=<ADMIN_DOOR> once on a device: it sets a long-lived cookie and the pages work there.
// Without the cookie these addresses show the normal "page not found", so nobody can tell they exist.
// ADMIN_DOOR lives only in Vercel's environment variables. If it isn't set, the pages stay hidden (fail closed).
export const config = { matcher: ["/hq", "/hq.html", "/hq/:path*", "/hq-sw.js", "/hq.webmanifest", "/admin", "/admin.html", "/print-codes", "/print-codes.html"] };

const enc = new TextEncoder();
async function token(secret) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode("ks-hq-door-v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const cookieOf = (req, name) => { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")); return m ? m[1] : ""; };

async function notFound(req) {
  let body = "<!doctype html><title>Page not found</title><h1>Page not found</h1>";
  try { const r = await fetch(new URL("/404.html", req.url)); if (r.ok) body = await r.text(); } catch (e) {}
  return new Response(body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

export default async function middleware(req) {
  const secret = process.env.ADMIN_DOOR || "";
  if (secret.length < 12) return notFound(req);
  const want = await token(secret), url = new URL(req.url), door = url.searchParams.get("door");
  if (door != null) {
    if (!same(await token(door), want)) return notFound(req);
    url.searchParams.delete("door");
    return new Response(null, { status: 302, headers: { location: url.pathname + url.search, "cache-control": "no-store",
      "set-cookie": `ks_door=${want}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` } });
  }
  if (!same(cookieOf(req, "ks_door"), want)) return notFound(req);
  return new Response(null, { headers: { "x-middleware-next": "1" } }); // let the page through
}
