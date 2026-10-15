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
    if (!document.querySelector('link[href*="Parisienne"]')) { var fl = document.createElement("link"); fl.rel = "stylesheet"; fl.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&family=Parisienne&display=swap"; document.head.appendChild(fl); }
    var st = document.createElement("style");
    st.textContent =
      ".ks-salebar{position:relative;z-index:60;overflow:hidden;color:#f8f0df;background:linear-gradient(180deg,#3a060ee6,#24030ae8),url(/assets/redletter/velvet.webp) center/cover #42070f;padding:10px 16px 11px;font-family:'DM Sans',system-ui,sans-serif}" +
      ".ks-salebar::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,#e4c680 20%,#f6e3ae 50%,#e4c680 80%,transparent)}" +
      ".ks-salebar::before{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,#f6e3ae18 50%,transparent 60%);transform:translateX(-100%);pointer-events:none}" +
      "@media (prefers-reduced-motion:no-preference){.ks-salebar::before{animation:kssheen 6s ease-in-out 1s infinite}}" +
      "@keyframes kssheen{0%{transform:translateX(-100%)}45%,100%{transform:translateX(100%)}}" +
      ".ks-sb-in{position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 18px;max-width:1100px;margin:0 auto}" +
      ".ks-sb-head{display:flex;align-items:center;gap:10px}" +
      ".ks-sb-seal{width:34px;height:34px;flex:none;filter:drop-shadow(0 2px 4px #0007)}" +
      ".ks-sb-script{font:400 24px/1 Parisienne,cursive;color:#f2d27a;white-space:nowrap;text-shadow:0 1px 10px #e4c68033}" +
      ".ks-sb-line{font:italic 500 18px/1.15 'Cormorant Garamond',Georgia,serif;color:#f8f0df;white-space:nowrap}" +
      ".ks-sb-line b{font-weight:600;color:#f6e3ae}" +
      ".ks-sb-meta{display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:10.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#e9dcc4}" +
      ".ks-sb-meta s{opacity:.55;font-weight:400;margin-right:3px}" +
      ".ks-sb-meta .ks-sb-dot{width:3px;height:3px;border-radius:50%;background:#e4c68099}" +
      ".ks-sb-clock{display:inline-flex;align-items:center;gap:4px;padding-left:14px;border-left:1px solid #e4c68055}" +
      ".ks-sb-clock i{font-style:normal;min-width:30px;padding:3px 5px;border:1px solid #e4c68066;border-radius:6px;background:#ffffff0d;text-align:center;color:#f6e3ae;font-variant-numeric:tabular-nums;letter-spacing:.06em}" +
      ".ks-sb-clock i small{font-size:8.5px;opacity:.75;margin-left:1px;text-transform:lowercase}" +
      ".ks-was-p{opacity:.6;font-weight:400;text-decoration-thickness:1.5px;margin-right:2px}" +
      "@media(max-width:560px){.ks-salebar{padding:9px 12px 10px}.ks-sb-in{gap:6px 10px}.ks-sb-seal{width:28px;height:28px}.ks-sb-script{font-size:21px}.ks-sb-line{font-size:16px}.ks-sb-meta{gap:5px 10px;letter-spacing:.12em}.ks-sb-clock{flex-basis:100%;justify-content:center;padding-left:0;border-left:0}}";
    document.head.appendChild(st);
    var endAt = s.ends ? Date.parse(s.ends + "T23:59:59+05:30") : 0;
    var name = s.name.replace(/[<>&]/g, "");
    var bar = document.createElement("div"); bar.className = "ks-salebar"; bar.setAttribute("role", "note");
    bar.innerHTML = '<div class="ks-sb-in">' +
      '<div class="ks-sb-head"><img class="ks-sb-seal" src="/assets/sale-seal.webp" alt="" aria-hidden="true"><span class="ks-sb-script">' + name + '</span><span class="ks-sb-line"><b>' + s.percent + "% off</b> every keepsake</span></div>" +
      '<div class="ks-sb-meta">' +
        (p.site ? "<span>Websites <s>" + rs(p.site.was) + "</s>" + rs(p.site.price) + "</span>" : "") + '<span class="ks-sb-dot"></span>' +
        (p.card ? "<span>Cards <s>" + rs(p.card.was) + "</s>" + rs(p.card.price) + "</span>" : "") +
        (endAt ? '<span class="ks-sb-clock" aria-label="Time left">Ends in <i class="ks-d"></i><i class="ks-h"></i><i class="ks-m"></i></span>' : "") +
      "</div></div>";
    document.body.insertBefore(bar, document.body.firstChild);
    if (endAt) {
      var q = function (c) { return bar.querySelector(c); };
      var tick = function () {
        var ms = endAt - Date.now(); if (ms <= 0) { bar.remove(); return; }
        var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
        q(".ks-d").hidden = !d; q(".ks-d").innerHTML = d + "<small>d</small>";
        q(".ks-h").innerHTML = String(h).padStart(2, "0") + "<small>h</small>";
        q(".ks-m").innerHTML = String(mm).padStart(2, "0") + "<small>m</small>";
      };
      tick(); setInterval(tick, 20000);
    }
  }).catch(function () {});
})();
