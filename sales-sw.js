// GetKeepsake Sales app: notification when a shop goes live with the salesperson's code.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => e.waitUntil((async () => {
  let title = "🎉 A shop just went live with your code", body = "Tap to see your earnings", tag = "ks-sale";
  try {
    const c = await caches.open("sales"), r = await c.match("/sp-auth"), a = r && JSON.parse(await r.text());
    if (a && a.code) {
      const j = await (await fetch("/api/qr?spme=" + encodeURIComponent(a.code) + "&t=" + encodeURIComponent(a.tok), { cache: "no-store" })).json();
      const s = (j.shopsList || [])[0];
      if (s) { title = "🎉 " + s.name + " is live!"; body = (j.comm ? "+₹" + j.comm + " for you · " : "") + j.shops + " shop" + (j.shops === 1 ? "" : "s") + " so far" + (j.owed ? " · ₹" + j.owed + " coming to you" : ""); tag = "sale-" + s.url; }
    }
  } catch (x) {}
  await self.registration.showNotification(title, { body, tag, icon: "/assets/icon-192.png", badge: "/assets/icon-192.png", vibrate: [80, 60, 80] });
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.includes("/sales")) { w.focus(); return w.navigate ? w.navigate("/sales#earn") : null; }
    return self.clients.openWindow("/sales#earn");
  }));
});
