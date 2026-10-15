/* Shows live prices (and the launch offer, when one is on) wherever a page has [data-price="card|site|frameQr|frameNfc"].
   Adds a slim offer banner at the top of the page unless <body data-no-sale-bar>. Prices come from /api/checkout. */
(function () {
  var rs = function (n) { return "₹" + Number(n).toLocaleString("en-IN"); };
  fetch("/api/checkout").then(function (r) { return r.json(); }).then(function (j) {
    var p = j.products || {}, d = j.delivery || {}, s = j.sale;
    var v = { card: p.card, site: p.site, frameQr: d.frameQr, frameNfc: d.frameNfc };
    document.querySelectorAll("[data-price]").forEach(function (e) {
      var x = v[e.dataset.price]; if (!x) return;
      var plus = e.hasAttribute("data-plus") ? "+" : "";
      e.innerHTML = x.was && x.was > x.price ? '<s class="ks-was-p">' + rs(x.was) + "</s> " + plus + rs(x.price) : plus + rs(x.price);
    });
    if (!s || document.body.hasAttribute("data-no-sale-bar") || document.querySelector(".ks-salebar")) return;
    var st = document.createElement("style");
    st.textContent = ".ks-salebar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 12px;padding:9px 14px;background:linear-gradient(90deg,#42070f,#7a1424,#42070f);color:#f8ecd2;font:500 13.5px/1.35 system-ui,-apple-system,sans-serif;text-align:center;position:relative;z-index:60}" +
      ".ks-salebar b{color:#f2d27a;font-weight:700}.ks-salebar a{color:#f2d27a;font-weight:600;text-decoration:underline;text-underline-offset:3px}" +
      ".ks-was-p{opacity:.6;font-weight:400;text-decoration-thickness:1.5px;margin-right:2px}";
    document.head.appendChild(st);
    var ends = s.ends ? " · till " + new Date(s.ends + "T12:00:00+05:30").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
    var bar = document.createElement("div"); bar.className = "ks-salebar"; bar.setAttribute("role", "note");
    bar.innerHTML = "<span>🎉 <b>" + s.name.replace(/[<>&]/g, "") + ": " + s.percent + "% off</b> every keepsake" + ends + "</span>" +
      "<span>Websites " + (p.site ? "<s class=\"ks-was-p\">" + rs(p.site.was) + "</s> " + rs(p.site.price) : "") + " · Cards " + (p.card ? "<s class=\"ks-was-p\">" + rs(p.card.was) + "</s> " + rs(p.card.price) : "") + "</span>";
    document.body.insertBefore(bar, document.body.firstChild);
  }).catch(function () {});
})();
