// GetKeepsake HQ: shows a phone notification for every paid order (Web Push, no payload).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => e.waitUntil((async () => {
  let title = "New order on GetKeepsake 🎉", body = "Tap to open HQ", tag = "ks-order";
  try {
    const c = await caches.open("hq"), r = await c.match("/hq-key"), key = r && await r.text();
    if (key) {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ action: "push-latest" }) });
      const o = (await res.json()).order;
      if (o) { title = "₹" + Number(o.amount || 0).toLocaleString("en-IN") + " · " + o.what; body = (o.title ? o.title + " · " : "") + (o.ship ? "Needs printing & shipping" : "Paid just now"); tag = o.id; }
    }
  } catch (x) {}
  await self.registration.showNotification(title, { body, tag, icon: "/assets/icon-192.png", badge: "/assets/icon-192.png", vibrate: [80, 60, 80], data: { url: "/hq#orders" } });
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.includes("/hq")) { w.focus(); return w.navigate ? w.navigate("/hq#orders") : null; }
    return self.clients.openWindow("/hq#orders");
  }));
});
