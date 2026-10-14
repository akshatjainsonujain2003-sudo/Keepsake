/* Meta (Facebook) Pixel for measuring ads. Turns on only when META_PIXEL_ID is set in Vercel.
   Never runs on keepsake pages that recipients open (/s/, /m/, /c/): those people aren't our customers.
   Events: PageView everywhere, ViewContent when someone starts from a design; ks-checkout sends InitiateCheckout and Purchase. */
(function () {
  if (/^\/(s|m|c)\//.test(location.pathname)) return;
  fetch("/api/config").then(r => r.json()).then(c => {
    if (!c || !c.pixel || window.fbq) return;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", c.pixel); fbq("track", "PageView");
    const tpl = new URLSearchParams(location.search).get("tpl");
    if (/^\/(builder|studio)/.test(location.pathname)) fbq("track", "ViewContent", { content_type: "product", content_ids: [tpl || (location.pathname.startsWith("/studio") ? "card" : "site")] });
  }).catch(() => {});
})();
