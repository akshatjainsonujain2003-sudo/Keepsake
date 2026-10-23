// GetKeepsake shop pages (/b/…): shows offers from shops a customer chose to hear from (Web Push, no payload).
// The push wakes this worker; it asks the server for the latest offer meant for this phone and shows it.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => e.waitUntil((async () => {
  let title = "New offer near you", body = "Tap to see it", url = "/shops", tag = "gk-offer";
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub) {
      const r = await fetch("/api/geofence/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      const m = (await r.json()).msg;
      if (m) { title = m.title; body = m.body; url = m.url || url; tag = "gk-" + (m.url || "") + m.at; }
    }
  } catch (x) {}
  await self.registration.showNotification(title, { body, tag, icon: "/assets/icon-192.png", badge: "/assets/icon-192.png", data: { url } });
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/shops";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (new URL(w.url).pathname === url) return w.focus();
    return self.clients.openWindow(url);
  }));
});
