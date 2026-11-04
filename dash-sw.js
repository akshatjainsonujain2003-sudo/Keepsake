// GetKeepsake Business app (the shop dashboard). Makes it open fast and work on a weak connection:
// - the dashboard page: shown from this phone's copy at once, then refreshed in the background
// - versioned files in /assets and fonts: kept after the first download
// - everything else (logins, orders, bills, /api): always from the network, never stored
const V = "gkd-2", SHELL = "/shops/dashboard";
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

// ---------- order alerts ----------
// A new order sends an empty push. Ask the server (with this phone's login) for the shop's newest order and show it.
const money = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
self.addEventListener("push", e => e.waitUntil((async () => {
  let title = "New order", body = "Open GetKeepsake Business to see it.", tag = "gk-order";
  try {
    const c = await caches.open("gkd-id"), r = await c.match("/__gkd-id"), id = r ? await r.text() : "";
    if (id) {
      const res = await fetch("/api/qr", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bz-own-orders", id }) });
      const j = await res.json(), o = (j.orders || []).filter(x => x.st === "new").sort((a, b) => b.at - a.at)[0];
      if (o) { title = "New order · " + money(o.tot); body = (o.name || "A customer") + ": " + (o.items || []).map(x => x.q + "× " + x.n).join(", ").slice(0, 120); tag = "gk-order-" + o.ref; }
    }
  } catch (err) {}
  await self.registration.showNotification(title, { body, tag, renotify: true, icon: "/assets/brand/icon-192.png", badge: "/assets/brand/icon-192.png", vibrate: [120, 60, 120], data: { url: "/shops/dashboard#orders" } });
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/shops/dashboard#orders";
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of all) if (new URL(w.url).pathname === "/shops/dashboard") { await w.focus(); if ("navigate" in w) w.navigate(url).catch(() => {}); return; }
    await clients.openWindow(url);
  })());
});
