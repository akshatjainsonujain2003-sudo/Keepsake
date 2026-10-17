/* KSBiz: renders a GetKeepsake business page (shops, cafes, salons) from its saved data.
   Used by /b/:id (live page) and /business-studio (live preview while editing).
   KSBiz.render(root, data, { preview, url })  ·  KSBiz.THEMES  ·  KSBiz.blank() */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; };
  const safeImg = u => { u = String(u || "").trim(); return /^\/api\/img\?id=[\w-]{1,80}$/.test(u) || /^\/assets\/[\w\/.-]+$/.test(u) || /^https:\/\/[^\s"'<>()]+$/i.test(u) ? u : ""; };
  const digits = s => String(s || "").replace(/\D/g, "");
  const phone10 = s => { const d = digits(s); return d.length === 10 ? "91" + d : d; };
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const THEMES = {
    espresso: { name: "Espresso", bg: "#1f1611", sf: "#2a1f18", sf2: "#352820", tx: "#f4ebde", mu: "#c2ad96", ac: "#d9a066", on: "#1f1611", dark: 1 },
    noir:     { name: "Noir",     bg: "#0e0e0d", sf: "#181816", sf2: "#22211e", tx: "#f2ede4", mu: "#a9a296", ac: "#c9a96a", on: "#0e0e0d", dark: 1 },
    linen:    { name: "Linen",    bg: "#f5efe5", sf: "#fffcf6", sf2: "#efe6d8", tx: "#2a2018", mu: "#7d6e60", ac: "#b4562f", on: "#fffcf6" },
    sage:     { name: "Sage",     bg: "#eef1e9", sf: "#fbfcf8", sf2: "#e3e8dc", tx: "#1e2a20", mu: "#66746a", ac: "#4d6b4b", on: "#fbfcf8" },
    blush:    { name: "Blush",    bg: "#f8ecea", sf: "#fffaf9", sf2: "#f2dfdc", tx: "#3a1f24", mu: "#8c6a6f", ac: "#b2475b", on: "#fffaf9" },
    ocean:    { name: "Ocean",    bg: "#0d1726", sf: "#142238", sf2: "#1b2c47", tx: "#eef3fb", mu: "#9fb0c8", ac: "#7fb3ff", on: "#0d1726", dark: 1 }
  };
  const CATS = { cafe: "Café", restaurant: "Restaurant", bakery: "Bakery", salon: "Salon & Spa", boutique: "Boutique", gym: "Fitness Studio", florist: "Florist", store: "Store", clinic: "Clinic", other: "" };

  const I = {
    call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    wa: '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2.1-1-1 .9a5 5 0 0 1-2.9-2.9l.9-1-1-2.1Z" fill="currentColor" stroke="none"/>',
    pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
    pay: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    save: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  function css() {
    if (document.getElementById("ks-biz-css")) return;
    const s = document.createElement("style"); s.id = "ks-biz-css";
    s.textContent = `
.bz{--fs:'Fraunces',Georgia,serif;--fn:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--tx);font-family:var(--fn);min-height:100%;-webkit-font-smoothing:antialiased;position:relative;overflow:hidden}
.bz *{box-sizing:border-box}
.bz a{color:inherit;text-decoration:none}
.bz .wrap{max-width:520px;margin:0 auto;position:relative}
.bz .hero{position:relative;height:min(64vh,560px);min-height:400px;overflow:hidden;background:var(--sf2)}
.bz .hero .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
.bz.anim .hero .cv{animation:bzkb 18s ease-in-out infinite alternate}
@keyframes bzkb{to{transform:scale(1.09) translateY(-1.5%)}}
.bz .hero .sh{position:absolute;inset:0;background:linear-gradient(180deg,#0006 0%,#0000 28%,#0000 45%,var(--bg) 100%)}
.bz .hero .ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--mu);font:italic 400 22px var(--fs);background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--ac) 35%,transparent),transparent 60%),var(--sf2)}
.bz .top{position:absolute;left:18px;right:18px;top:16px;display:flex;justify-content:space-between;align-items:center;z-index:2}
.bz .pill{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;background:#0008;color:#fff;font:600 12.5px var(--fn);letter-spacing:.02em;backdrop-filter:blur(10px)}
.bz .pill i{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px #4ade8033}
.bz .pill.cl i{background:#f87171;box-shadow:0 0 0 3px #f8717133}
.bz .ibtn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#0008;color:#fff;backdrop-filter:blur(10px);border:0;cursor:pointer}
.bz .id{position:relative;margin-top:-92px;padding:0 22px;text-align:center;z-index:2}
.bz .logo{width:112px;height:112px;border-radius:50%;margin:0 auto;background:var(--sf) center/cover no-repeat;border:4px solid var(--bg);box-shadow:0 18px 40px -14px #0009;display:grid;place-items:center;font:500 44px var(--fs);color:var(--ac)}
.bz h1{font:500 clamp(34px,9vw,46px)/1.04 var(--fs);letter-spacing:-.015em;margin:16px 0 8px}
.bz .cat{font:600 11.5px var(--fn);letter-spacing:.22em;text-transform:uppercase;color:var(--ac)}
.bz .tag{font:italic 400 18px/1.45 var(--fs);color:var(--mu);margin:10px auto 0;max-width:380px}
.bz .acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:10px;padding:26px 18px 6px}
.bz .act{display:flex;flex-direction:column;align-items:center;gap:8px;font:600 11.5px var(--fn);color:var(--mu);cursor:pointer;background:none;border:0;padding:0}
.bz .act span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:var(--sf);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 10%,transparent);box-shadow:0 10px 24px -16px #0007;transition:transform .15s}
.bz .act:active span{transform:scale(.92)}
.bz .act.pr span{background:var(--ac);color:var(--on);border-color:transparent}
.bz .sec{padding:30px 18px 0}
.bz .h2{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 4px 14px}
.bz .h2 b{font:500 26px/1.1 var(--fs);letter-spacing:-.01em}
.bz .h2 small{font:600 11px var(--fn);letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.bz .card{background:var(--sf);border-radius:24px;border:1px solid color-mix(in srgb,var(--tx) 8%,transparent);box-shadow:0 20px 40px -30px #0008}
.bz .rev{padding:22px;display:flex;align-items:center;gap:16px}
.bz .rev .st{display:flex;gap:3px;color:#f5b301;margin-bottom:6px}
.bz .rev .st svg{fill:#f5b301;stroke:#f5b301}
.bz .rev b{display:block;font:500 20px/1.2 var(--fs)}
.bz .rev p{margin:4px 0 0;font:400 13.5px/1.4 var(--fn);color:var(--mu)}
.bz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:999px;background:var(--ac);color:var(--on);font:700 14.5px var(--fn);white-space:nowrap;border:0;cursor:pointer}
.bz .btn.gh{background:transparent;color:var(--tx);border:1.5px solid color-mix(in srgb,var(--tx) 22%,transparent)}
.bz .offer{position:relative;padding:24px 24px 22px;border-radius:24px;background:linear-gradient(135deg,var(--ac),color-mix(in srgb,var(--ac) 70%,#000));color:var(--on);overflow:hidden}
.bz .offer:before,.bz .offer:after{content:"";position:absolute;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:var(--bg)}
.bz .offer:before{left:-13px}.bz .offer:after{right:-13px}
.bz .offer small{font:700 11px var(--fn);letter-spacing:.24em;text-transform:uppercase;opacity:.85}
.bz .offer b{display:block;font:500 30px/1.1 var(--fs);margin:8px 0 6px}
.bz .offer p{margin:0;font:400 14.5px/1.45 var(--fn);opacity:.92}
.bz .offer .till{display:inline-block;margin-top:12px;padding:6px 12px;border-radius:999px;background:#0002;font:600 12px var(--fn)}
.bz .tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -18px 14px;padding:0 22px}
.bz .tabs::-webkit-scrollbar{display:none}
.bz .tabs button{flex:none;padding:10px 16px;border-radius:999px;border:1px solid color-mix(in srgb,var(--tx) 14%,transparent);background:transparent;color:var(--mu);font:600 13.5px var(--fn);cursor:pointer}
.bz .tabs button.on{background:var(--tx);color:var(--bg);border-color:var(--tx)}
.bz .menu{padding:6px 20px}
.bz .it{padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--tx) 8%,transparent)}
.bz .it:last-child{border-bottom:0}
.bz .it .r{display:flex;align-items:baseline;gap:10px}
.bz .it .n{font:500 18px/1.25 var(--fs)}
.bz .it .dl{flex:1;border-bottom:1.5px dotted color-mix(in srgb,var(--tx) 25%,transparent);transform:translateY(-4px)}
.bz .it .p{font:700 15px var(--fn);color:var(--ac);white-space:nowrap}
.bz .it .d{margin:5px 0 0;font:400 13.5px/1.45 var(--fn);color:var(--mu)}
.bz .it .bs{display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--ac) 18%,transparent);color:var(--ac);font:700 10px var(--fn);letter-spacing:.08em;text-transform:uppercase;vertical-align:3px}
.bz .gal{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -18px;padding:0 18px 6px;scrollbar-width:none}
.bz .gal::-webkit-scrollbar{display:none}
.bz .gal img{flex:none;width:76%;aspect-ratio:4/5;object-fit:cover;border-radius:22px;scroll-snap-align:center;box-shadow:0 20px 40px -26px #000a}
.bz .hrs{padding:8px 20px}
.bz .hr{display:flex;justify-content:space-between;padding:12px 0;font:500 14.5px var(--fn);border-bottom:1px solid color-mix(in srgb,var(--tx) 7%,transparent)}
.bz .hr:last-child{border-bottom:0}
.bz .hr span:last-child{color:var(--mu);font-variant-numeric:tabular-nums}
.bz .hr.td{color:var(--ac)}.bz .hr.td span:last-child{color:var(--ac);font-weight:700}
.bz .map{overflow:hidden;padding:0}
.bz .map iframe,.bz .map .mp{display:block;width:100%;height:210px;border:0;filter:saturate(.85)}
.bz .map .mp{display:grid;place-items:center;background:var(--sf2);color:var(--mu)}
.bz .map .ad{padding:18px 20px;display:flex;gap:14px;align-items:center;justify-content:space-between}
.bz .map .ad p{margin:0;font:400 14px/1.45 var(--fn);color:var(--mu)}
.bz .upi{padding:22px;display:flex;flex-direction:column;gap:14px}
.bz .upi .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:var(--sf2);font:600 14px var(--fn)}
.bz .upi .row button{background:none;border:0;color:var(--ac);font:700 13px var(--fn);display:flex;gap:6px;align-items:center;cursor:pointer}
.bz .foot{padding:44px 22px 56px;text-align:center}
.bz .foot .so{display:flex;justify-content:center;gap:12px;margin-bottom:26px}
.bz .foot .so a{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--sf);border:1px solid color-mix(in srgb,var(--tx) 10%,transparent)}
.bz .foot .mk{font:500 12.5px var(--fn);color:var(--mu)}
.bz .foot .mk a{color:var(--tx);border-bottom:1px solid color-mix(in srgb,var(--tx) 30%,transparent)}
.bz .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:var(--tx);color:var(--bg);font:600 13px var(--fn);opacity:0;transition:.25s;pointer-events:none;z-index:9}
.bz .toast.on{opacity:1}
.bz .rv{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.bz .rv.in{opacity:1;transform:none}
.bz.static .rv{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.bz .rv{opacity:1;transform:none;transition:none}.bz.anim .hero .cv{animation:none}}
@media (min-width:700px){.bz{background:radial-gradient(1200px 600px at 50% -10%,color-mix(in srgb,var(--ac) 18%,transparent),transparent 60%),var(--bg)}.bz .hero{border-radius:0 0 34px 34px}}
`;
    document.head.appendChild(s);
  }

  function hoursInfo(h) {
    if (!h || !Array.isArray(h.d) || h.d.length !== 7) return null;
    const now = new Date(), di = (now.getDay() + 6) % 7, mins = now.getHours() * 60 + now.getMinutes();
    const m = s => { const x = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return x ? +x[1] * 60 + +x[2] : null; };
    const fmt = s => { const x = m(s); if (x == null) return ""; let hh = Math.floor(x / 60), mm = x % 60, ap = hh >= 12 ? "pm" : "am"; hh = hh % 12 || 12; return hh + (mm ? ":" + String(mm).padStart(2, "0") : "") + " " + ap; };
    const day = h.d[di] || [], o = m(day[0]), c = m(day[1]);
    let open = false, until = "";
    if (!day[2] && o != null && c != null) { open = c > o ? mins >= o && mins < c : mins >= o || mins < c; until = fmt(day[1]); }
    const rows = h.d.map((d, i) => ({ day: DAYS[i], txt: d[2] ? "Closed" : (m(d[0]) != null && m(d[1]) != null ? fmt(d[0]) + " – " + fmt(d[1]) : "—"), today: i === di }));
    return { open, until, rows, nextOpen: !open && !day[2] && o != null && mins < o ? fmt(day[0]) : "" };
  }

  function render(root, d, opts) {
    opts = opts || {}; css();
    const th = THEMES[d.th] || THEMES.espresso, ac = /^#[0-9a-f]{6}$/i.test(d.ac || "") ? d.ac : th.ac;
    root.className = "bz" + (opts.preview ? " static" : " anim");
    root.style.cssText = `--bg:${th.bg};--sf:${th.sf};--sf2:${th.sf2};--tx:${th.tx};--mu:${th.mu};--ac:${ac};--on:${th.on}`;
    const name = String(d.t || "Your business").slice(0, 60), cat = d.cat === "other" ? String(d.catx || "").slice(0, 30) : CATS[d.cat] || "";
    const area = String(d.area || "").slice(0, 40), cover = safeImg(d.cover), logo = safeImg(d.logo);
    const ph = phone10(d.phone), wa = phone10(d.wa || d.phone), ig = String(d.ig || "").replace(/^@/, "").replace(/[^\w.]/g, "").slice(0, 30);
    const review = safeUrl(d.review), mapsU = safeUrl(d.maps) || (d.addr ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + d.addr) : "");
    const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? d.upi : null;
    const upiLink = upi ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.name || name)}&cu=INR` : "";
    const hi = hoursInfo(d.hours);
    const menu = Array.isArray(d.menu) ? d.menu.filter(s => s && Array.isArray(s.items) && s.items.some(i => i && i.n)) : [];
    const gal = (Array.isArray(d.gal) ? d.gal : []).map(safeImg).filter(Boolean).slice(0, 10);
    const offer = d.offer && d.offer.on && d.offer.title ? d.offer : null;
    const pageUrl = opts.url || location.href;

    const acts = [];
    if (ph) acts.push(`<a class="act" href="tel:+${ph}"><span>${ic("call")}</span>Call</a>`);
    if (wa) acts.push(`<a class="act" href="https://wa.me/${wa}" target="_blank" rel="noopener"><span>${ic("wa")}</span>WhatsApp</a>`);
    if (mapsU) acts.push(`<a class="act" href="${esc(mapsU)}" target="_blank" rel="noopener"><span>${ic("pin")}</span>Directions</a>`);
    if (ig) acts.push(`<a class="act" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener"><span>${ic("ig")}</span>Instagram</a>`);
    if (upi) acts.push(`<a class="act pr" href="#bz-pay"><span>${ic("pay")}</span>Pay</a>`);
    else if (review) acts.push(`<a class="act pr" href="${esc(review)}" target="_blank" rel="noopener"><span>${ic("star")}</span>Review</a>`);

    const stars = Array(5).fill(ic("star", 18)).join("");
    const H = [];
    H.push(`<div class="hero">${cover ? `<img class="cv" src="${esc(cover)}" alt="">` : `<div class="ph">${esc(name)}</div>`}<div class="sh"></div>
      <div class="top">${hi ? `<span class="pill${hi.open ? "" : " cl"}"><i></i>${hi.open ? "Open now" + (hi.until ? " · till " + esc(hi.until) : "") : hi.nextOpen ? "Opens " + esc(hi.nextOpen) : "Closed now"}</span>` : "<span></span>"}
      <button class="ibtn" data-share aria-label="Share">${ic("share", 19)}</button></div></div>`);
    H.push(`<div class="wrap"><div class="id"><div class="logo"${logo ? ` style="background-image:url('${esc(logo)}')"` : ""}>${logo ? "" : esc(name.charAt(0).toUpperCase())}</div>
      <h1>${esc(name)}</h1>${cat || area ? `<div class="cat">${esc([cat, area].filter(Boolean).join(" · "))}</div>` : ""}${d.tag ? `<p class="tag">${esc(String(d.tag).slice(0, 140))}</p>` : ""}</div>`);
    if (acts.length) H.push(`<div class="acts rv">${acts.join("")}</div>`);
    if (offer) H.push(`<div class="sec rv"><div class="offer"><small>${esc(offer.label || "Today's offer")}</small><b>${esc(String(offer.title).slice(0, 60))}</b>${offer.text ? `<p>${esc(String(offer.text).slice(0, 160))}</p>` : ""}${offer.till ? `<span class="till">Valid till ${esc(String(offer.till).slice(0, 30))}</span>` : ""}</div></div>`);
    if (review) H.push(`<div class="sec rv"><div class="card rev"><div style="flex:1"><div class="st">${stars}</div><b>Loved your visit?</b><p>A quick Google review helps us a lot.</p></div><a class="btn" href="${esc(review)}" target="_blank" rel="noopener">Review us</a></div></div>`);
    if (menu.length) {
      const mt = String(d.menuTitle || "Menu").slice(0, 24);
      H.push(`<div class="sec rv"><div class="h2"><b>${esc(mt)}</b><small>${menu.reduce((n, s) => n + s.items.filter(i => i && i.n).length, 0)} items</small></div>
        ${menu.length > 1 ? `<div class="tabs">${menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(String(s.n || "Section").slice(0, 24))}</button>`).join("")}</div>` : ""}
        ${menu.map((s, i) => `<div class="card menu" data-pane="${i}"${i ? " hidden" : ""}>${s.items.filter(x => x && x.n).slice(0, 60).map(x => `<div class="it"><div class="r"><span class="n">${esc(String(x.n).slice(0, 50))}${x.b ? '<span class="bs">Bestseller</span>' : ""}</span><span class="dl"></span>${x.p ? `<span class="p">₹${esc(String(x.p).replace(/[^\d.,–\- ]/g, "").slice(0, 12))}</span>` : ""}</div>${x.d ? `<p class="d">${esc(String(x.d).slice(0, 140))}</p>` : ""}</div>`).join("")}</div>`).join("")}</div>`);
    }
    if (gal.length) H.push(`<div class="sec rv"><div class="h2"><b>${esc(String(d.galTitle || "Inside").slice(0, 24))}</b><small>swipe</small></div><div class="gal">${gal.map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div>`);
    if (hi) H.push(`<div class="sec rv"><div class="h2"><b>Hours</b><small>${hi.open ? "open now" : "closed now"}</small></div><div class="card hrs">${hi.rows.map(r => `<div class="hr${r.today ? " td" : ""}"><span>${r.day}${r.today ? " · today" : ""}</span><span>${esc(r.txt)}</span></div>`).join("")}</div></div>`);
    if (d.addr || mapsU) H.push(`<div class="sec rv"><div class="h2"><b>Visit us</b></div><div class="card map">${d.addr && !opts.preview ? `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(name + " " + d.addr)}&z=15&output=embed" title="Map"></iframe>` : `<div class="mp">${ic("pin", 34)}</div>`}
      <div class="ad"><p>${esc(String(d.addr || "Find us on Google Maps").slice(0, 200))}</p>${mapsU ? `<a class="btn" href="${esc(mapsU)}" target="_blank" rel="noopener">Directions</a>` : ""}</div></div></div>`);
    if (upi) H.push(`<div class="sec rv" id="bz-pay"><div class="h2"><b>Pay ${esc(String(upi.name || name).slice(0, 40))}</b><small>UPI</small></div><div class="card upi"><a class="btn" href="${esc(upiLink)}">${ic("pay", 18)} Pay with any UPI app</a><div class="row"><span>${esc(upi.id)}</span><button type="button" data-copy="${esc(upi.id)}">${ic("copy", 16)} Copy</button></div></div></div>`);
    H.push(`<div class="foot"><div class="so">${ig ? `<a href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram">${ic("ig", 20)}</a>` : ""}${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic("wa", 20)}</a>` : ""}${ph ? `<a href="tel:+${ph}" aria-label="Call">${ic("call", 20)}</a>` : ""}<a href="#" data-vcf aria-label="Save contact">${ic("save", 20)}</a></div>
      <div class="mk">Page by <a href="https://getkeepsake.in/business-studio" target="_blank" rel="noopener">GetKeepsake</a> · get one for your shop</div></div></div><div class="toast"></div>`);
    root.innerHTML = H.join("");

    const toast = m => { const t = root.querySelector(".toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1800); };
    root.onclick = async e => {
      const tb = e.target.closest("[data-tab]"); if (tb) { root.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === tb)); root.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== tb.dataset.tab); return; }
      const cp = e.target.closest("[data-copy]"); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast("UPI ID copied"); } catch (x) {} return; }
      if (e.target.closest("[data-share]")) { try { if (navigator.share) await navigator.share({ title: name, url: pageUrl }); else { await navigator.clipboard.writeText(pageUrl); toast("Link copied"); } } catch (x) {} return; }
      if (e.target.closest("[data-vcf]")) { e.preventDefault(); const v = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + name, "ORG:" + name, ph ? "TEL;TYPE=WORK,VOICE:+" + ph : "", d.addr ? "ADR;TYPE=WORK:;;" + String(d.addr).replace(/[\n;]/g, " ") : "", "URL:" + pageUrl, "END:VCARD"].filter(Boolean).join("\r\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([v], { type: "text/vcard" })); a.download = name.replace(/[^\w ]+/g, "").trim().replace(/\s+/g, "-") + ".vcf"; a.click(); return; }
      if (opts.preview && e.target.closest("a")) e.preventDefault();
    };
    if (!opts.preview && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
      root.querySelectorAll(".rv").forEach(el => io.observe(el));
    } else root.querySelectorAll(".rv").forEach(el => el.classList.add("in"));
  }

  const blank = () => ({ biz: 1, t: "", cat: "cafe", area: "", tag: "", th: "espresso", ac: "", logo: "", cover: "", phone: "", wa: "", ig: "", review: "", maps: "", addr: "",
    hours: { d: Array.from({ length: 7 }, () => ["09:00", "22:00", false]) }, offer: { on: false, label: "Today's offer", title: "", text: "", till: "" },
    menuTitle: "Menu", menu: [{ n: "Bestsellers", items: [{ n: "", p: "", d: "", b: false }] }], galTitle: "Inside", gal: [], upi: { id: "", name: "" } });

  window.KSBiz = { render, THEMES, CATS, blank, esc };
})();
