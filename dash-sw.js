// GetKeepsake Business app (the shop dashboard). Makes it open fast and work on a weak connection:
// - the dashboard page: shown from this phone's copy at once, then refreshed in the background
// - versioned files in /assets and fonts: kept after the first download
// - everything else (logins, orders, bills, /api): always from the network, never stored
const V = "gkd-1", SHELL = "/shops/dashboard";
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.add(SHELL)).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith("gkd-") && k !== V) await caches.delete(k); await self.clients.claim(); })()));
const assetLike = u => (u.origin === location.origin && /^\/assets\/.+\.v\d+\.(js|css)$|^\/assets\/brand\//.test(u.pathname)) || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || (u.hostname === "cdnjs.cloudflare.com");
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin && u.pathname.startsWith("/api/")) return;
  if (r.mode === "navigate" && u.origin === location.origin && u.pathname === SHELL) {
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(SHELL);
      const net = fetch(r).then(res => { if (res.ok && res.type === "basic") c.put(SHELL, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    })());
    return;
  }
  if (assetLike(u)) {
    e.respondWith(caches.open(V).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }));
  }
});
