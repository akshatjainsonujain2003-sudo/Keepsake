/* Keepsake animated card viewer.
   KeepsakeViewer.mount(host, data, {shop, preview, onClose}) opens a card as a short animated website:
   the template opens, then a scrolling page shows the cover, photos, video, a personal message and a song that plays in the background. */
(function () {
  "use strict";
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PLACEHOLDER = "Write your message here.";
  var IMG_ASPECT = 720 / 1280;

  // One entry per template: how it opens (open), what floats in the air (fx) and its colours.
  // rects are the paper areas of the stationery as [x, y, w, h] in % of the template image; the title and quote are placed inside them.
  var TPL = {
    laceAlbum:      { kind: "paper", open: "doors",    fx: "sparkle", fxc: ["#f7e3a6", "#fff3cf"], paper: "#f6ecd9", ink: "#5a3b2e", acc: "#9b2c3c", seal: "#8a2a3a", seal2: "#cf4d60", rects: [[24, 27, 52, 18.5], [24, 55, 52, 18.5]], btn: [50, 87], dim: .62 },
    envelope:       { kind: "paper", open: "shutters", fx: "petals",  fxc: ["#a8283d", "#c9485a", "#8a1b2f"], paper: "#f8f2e8", ink: "#5c1220", acc: "#7a1626", seal: "#7a1626", seal2: "#b83a50", rects: [[13, 17, 74, 33]], btn: [49, 76], dim: .6 },
    floralClip:     { kind: "paper", open: "peel",     fx: "petals",  fxc: ["#fffaf0", "#f3ead2", "#e6d9b0"], paper: "#f1e6cb", ink: "#4a3a22", acc: "#6a7a34", seal: "#6a7a34", seal2: "#98aa58", rects: [[21, 41, 58, 21]], btn: [50, 84], dim: .5 },
    burgundyFloral: { kind: "paper", open: "doors",    fx: "petals",  fxc: ["#ffffff", "#f6eedc", "#efe2c4"], paper: "#f1e3c2", ink: "#4a3320", acc: "#8a2a3a", seal: "#8a2a3a", seal2: "#c9485a", rects: [[21, 34.5, 58, 22]], btn: [50, 78], dim: .62 },
    blueBotanical:  { kind: "paper", open: "doors",    fx: "sparkle", fxc: ["#dfe8ff", "#ffffff"], paper: "#f1e5c8", ink: "#233556", acc: "#2f4a7d", seal: "#2f4a7d", seal2: "#5b7fc4", rects: [[24, 29.5, 53, 41]], btn: [50, 84], dim: .5, title: "#fdf6e4" },
    greenLily:      { kind: "paper", open: "doors",    fx: "petals",  fxc: ["#fff8e8", "#f2e8cc", "#e8d9ad"], paper: "#f0e3c3", ink: "#3d4a22", acc: "#556428", seal: "#556428", seal2: "#869b46", rects: [[19, 26.5, 62, 47]], btn: [50, 85], dim: .55 },
    rugGarden:      { kind: "paper", open: "doors",    fx: "petals",  fxc: ["#e27a8a", "#c9485a", "#f2a9b4"], paper: "#ecdab6", ink: "#5a3220", acc: "#8a2a2a", seal: "#8a2a2a", seal2: "#cf5a4a", rects: [[22, 22, 52, 57]], btn: [50, 87], dim: .5 },
    pinkPalace:     { kind: "paper", open: "doors",    fx: "petals",  fxc: ["#ffd9e2", "#ffc2d1", "#fff0f4"], paper: "#fbe4e8", ink: "#7a2a3a", acc: "#b0405a", seal: "#b0405a", seal2: "#e07a92", rects: [[28, 38, 42, 23]], btn: [50, 78], dim: .46, title: "#fff3f5" },
    navyPaper:      { kind: "paper", open: "doors",    fx: "sparkle", fxc: ["#ffe8c8", "#fff7e6"], paper: "#f3e5bd", ink: "#3a2f2a", acc: "#5b3f8a", seal: "#5b3f8a", seal2: "#8a68c4", rects: [[13, 20, 74, 56]], btn: [50, 88], dim: .4 },
    swanLace:       { kind: "paper", open: "doors",    fx: "sparkle", fxc: ["#f6dca0", "#fff0c8"], paper: "#efdfbd", ink: "#4a3320", acc: "#7a5a2a", seal: "#7a5a2a", seal2: "#b98f45", rects: [[24, 31, 52, 40]], btn: [50, 84], dim: .5 },
    fullMoon:       { kind: "photo", open: "iris",    fx: "stars",   fxc: ["#ffffff", "#cfe0ff"], acc: "#6f86c4", accl: "#cfe0ff", seal: "#4a5f9a", rect: [8, 30, 84, 34], btn: [50, 86], dim: .8 },
    greenVinyl:     { kind: "photo", open: "vinyl",   fx: "notes",   fxc: ["#e8f3e4", "#c4dcc0"], acc: "#5d8a62", accl: "#cfe8c8", seal: "#4a7a52", rect: [8, 28, 84, 36], btn: [50, 86], dim: .72 },
    mistForest:     { kind: "photo", open: "mist",    fx: "mist",    fxc: ["#e8fff8", "#cfeee4"], acc: "#3f8c7e", accl: "#c8f0e4", seal: "#2f6f66", rect: [8, 28, 84, 36], btn: [50, 86], dim: .66 },
    goldenHaze:     { kind: "photo", open: "bloom",   fx: "bokeh",   fxc: ["#ffd98a", "#ffb96a", "#fff0c4"], acc: "#c47a22", accl: "#ffe2a8", seal: "#a8641a", rect: [8, 28, 84, 36], btn: [50, 86], dim: .62 },
    meadowLight:    { kind: "photo", open: "wipe",    fx: "motes",   fxc: ["#fff6c4", "#e9ffb8"], acc: "#6f9a2f", accl: "#e4f6b4", seal: "#4f7a22", rect: [8, 26, 84, 36], btn: [50, 86], dim: .7, rays: 1 },
    terracottaArch: { kind: "photo", open: "arch",    fx: "motes",   fxc: ["#fff2dc", "#ffd9b0"], acc: "#b5532f", accl: "#ffd9c0", seal: "#9a4426", rect: [8, 30, 84, 34], btn: [50, 86], dim: .66, oink: "#3a2418", oshade: 0 }
  };

  var ASSET = function (id) { return "/assets/" + id + ".webp"; };
  var safeImg = function (u) { return /^(https?:\/\/|\/api\/img\?id=[a-z0-9]{6,16}$)/i.test(u) ? u : ""; };
  var YT = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;
  var SP = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i;
  var VM = /vimeo\.com\/(?:video\/)?(\d{6,})/i;
  var isAud = function (u) { return /^https?:\/\//i.test(u) && /\.(mp3|m4a|aac|wav|ogg|opus|flac)(\?.*)?$/i.test(u); };
  var isVid = function (u) { return /^https?:\/\//i.test(u) && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(u); };
  var httpUrl = function (u) { return /^https?:\/\//i.test(u) ? u : (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u) ? "https://" + u : ""); };

  function h(tag, props) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k]; if (v == null || v === false) return;
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "style") e.style.cssText = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (Array.isArray(c)) c.forEach(function (x) { if (x) e.append(x); }); else if (c != null && c !== false) e.append(c); }
    return e;
  }

  /* ------------------------------------------------------------------ ambient particles */
  function startFx(canvas, kind, colors) {
    if (REDUCE) return function () {};
    var c = canvas.getContext("2d"), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), P = [], raf = 0, last = 0, stopped = false, shoot = null;
    var R = function (a, b) { return a + Math.random() * (b - a); }, pick = function () { return colors[(Math.random() * colors.length) | 0]; };
    var count = { petals: 16, sparkle: 26, stars: 80, bokeh: 14, motes: 46, notes: 9, mist: 6 }[kind] || 20;
    function size() { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function make(init) {
      var p = { x: R(0, W), y: init ? R(0, H) : R(-40, -10), col: pick(), ph: R(0, 6.28) };
      if (kind === "petals") { p.r = R(6, 12); p.vy = R(.35, .9); p.sw = R(.4, 1.1); p.rot = R(0, 6.28); p.vr = R(-.02, .02); p.a = R(.55, .9); }
      else if (kind === "sparkle") { p.y = R(0, H); p.r = R(2.5, 6); p.life = R(0, 6.28); p.sp = R(.01, .03); p.vy = -R(.03, .12); }
      else if (kind === "stars") { p.y = R(0, H); p.r = R(.4, 1.7); p.sp = R(.008, .03); }
      else if (kind === "bokeh") { p.y = init ? R(0, H) : H + 80; p.r = R(22, 70); p.vy = -R(.12, .4); p.a = R(.07, .2); }
      else if (kind === "motes") { p.y = init ? R(0, H) : H + 10; p.r = R(.8, 2.6); p.vy = -R(.06, .3); p.sp = R(.01, .03); }
      else if (kind === "notes") { p.y = init ? R(H * .3, H) : H + 20; p.r = R(16, 28); p.vy = -R(.3, .7); p.g = Math.random() < .5 ? "♪" : "♫"; }
      else if (kind === "mist") { p.y = R(H * .15, H * .95); p.r = R(180, 320); p.vx = R(.06, .2) * (Math.random() < .5 ? -1 : 1); p.a = R(.05, .1); }
      return p;
    }
    function petal(p) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.ph) * .75 + .25); c.globalAlpha = p.a; c.fillStyle = p.col;
      c.beginPath(); c.moveTo(0, -p.r); c.bezierCurveTo(p.r * .95, -p.r * .55, p.r * .8, p.r * .7, 0, p.r); c.bezierCurveTo(-p.r * .8, p.r * .7, -p.r * .95, -p.r * .55, 0, -p.r); c.fill(); c.restore();
    }
    function star4(x, y, r, a, col) {
      c.save(); c.globalAlpha = a; c.fillStyle = col; c.translate(x, y); c.beginPath();
      c.moveTo(0, -r); c.quadraticCurveTo(r * .12, -r * .12, r, 0); c.quadraticCurveTo(r * .12, r * .12, 0, r); c.quadraticCurveTo(-r * .12, r * .12, -r, 0); c.quadraticCurveTo(-r * .12, -r * .12, 0, -r); c.fill(); c.restore();
    }
    function glow(x, y, r, a, col) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(255,255,255,0)"); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.restore(); }
    function frame(now) {
      if (stopped) return; raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      var dt = Math.min(40, now - (last || now)) / 16.67; last = now; c.clearRect(0, 0, W, H);
      if (kind === "bokeh" || kind === "motes" || kind === "mist") c.globalCompositeOperation = "lighter"; else c.globalCompositeOperation = "source-over";
      P.forEach(function (p, i) {
        p.ph += (p.sp || .03) * dt;
        if (kind === "petals") { p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt; p.rot += p.vr * dt; if (p.y > H + 20) P[i] = make(false); petal(p); }
        else if (kind === "sparkle") { p.life += p.sp * dt; p.y += p.vy * dt; var a = Math.max(0, Math.sin(p.life)); if (p.y < -10) { p.y = H + 10; } star4(p.x, p.y, p.r * (.5 + a * .7), a * .9, p.col); }
        else if (kind === "stars") { var t = (Math.sin(p.ph) + 1) / 2; c.globalAlpha = .25 + t * .75; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); }
        else if (kind === "bokeh") { p.y += p.vy * dt; p.x += Math.sin(p.ph * .3) * .2 * dt; if (p.y < -p.r) P[i] = make(false); glow(p.x, p.y, p.r, p.a, p.col); }
        else if (kind === "motes") { p.y += p.vy * dt; p.x += Math.sin(p.ph) * .35 * dt; if (p.y < -10) P[i] = make(false); glow(p.x, p.y, p.r * 4, .5 + Math.sin(p.ph * 2) * .3, p.col); }
        else if (kind === "notes") { p.y += p.vy * dt; p.x += Math.sin(p.ph * .6) * .6 * dt; if (p.y < -30) P[i] = make(false); c.save(); c.globalAlpha = Math.min(.8, Math.max(0, (p.y / H)) * 1.2); c.fillStyle = p.col; c.font = p.r + "px Georgia,serif"; c.fillText(p.g, p.x, p.y); c.restore(); }
        else if (kind === "mist") { p.x += p.vx * dt; if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r; glow(p.x, p.y, p.r, p.a, p.col); }
      });
      if (kind === "stars") {
        if (!shoot && Math.random() < .004) shoot = { x: R(W * .2, W), y: R(0, H * .4), l: 0 };
        if (shoot) { shoot.l += dt; var s = shoot, a2 = 1 - s.l / 40; if (a2 <= 0) shoot = null; else { var g = c.createLinearGradient(s.x, s.y, s.x + 90, s.y - 45); c.globalAlpha = a2; g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(s.x - s.l * 6, s.y + s.l * 3); c.lineTo(s.x - s.l * 6 + 90, s.y + s.l * 3 - 45); c.stroke(); } }
      }
      c.globalAlpha = 1;
    }
    size(); for (var i = 0; i < count; i++) P.push(make(true));
    var onr = function () { size(); }; window.addEventListener("resize", onr); raf = requestAnimationFrame(frame);
    return function () { stopped = true; cancelAnimationFrame(raf); window.removeEventListener("resize", onr); };
  }

  /* ------------------------------------------------------------------ YouTube without the heavy API script */
  function ytFrame(id, o) {
    var q = new URLSearchParams({ enablejsapi: "1", playsinline: "1", rel: "0", modestbranding: "1", origin: location.origin });
    if (o.autoplay) q.set("autoplay", "1"); if (o.loop) { q.set("loop", "1"); q.set("playlist", id); }
    return h("iframe", { src: "https://www.youtube.com/embed/" + id + "?" + q, title: o.title || "YouTube video", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: true, referrerpolicy: "strict-origin-when-cross-origin" });
  }
  function ytCmd(f, func, args) { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [] }), "*"); } catch (e) {} }
  function ytListen(f, cb) {
    var on = function (e) {
      if (e.source !== f.contentWindow) return; var d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
      if (!d) return; var s = null; if (d.event === "onStateChange") s = d.info; else if (d.event === "infoDelivery" && d.info && typeof d.info.playerState === "number") s = d.info.playerState;
      if (s != null) cb(s);
    };
    window.addEventListener("message", on);
    f.addEventListener("load", function () { try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch (e) {} });
    return function () { window.removeEventListener("message", on); };
  }

  /* ------------------------------------------------------------------ the viewer */
  function mount(host, data, ctx) {
    ctx = ctx || {}; data = data || {};
    var tid = TPL[data.template] ? data.template : "laceAlbum", T = TPL[tid], cleanups = [], timers = [];
    var items = Array.isArray(data.i) ? data.i : [];
    var by = function (k, n) { for (var i = 0; i < items.length; i++) if (items[i] && items[i].k === k) return items[i]; return items[n] && !items[n].k ? items[n] : null; };
    var gal = by("g", 0), vid = by("v", 1), sng = by("a", 2), msg = by("x", 3);
    var photos = String((gal && gal.v) || "").split(/[\s,]+/).map(function (s) { return s.trim(); }).filter(safeImg).slice(0, 14);
    var vurl = String((vid && vid.v) || "").trim(), surl = String((sng && sng.v) || "").trim();
    var mtext = String((msg && msg.v) || "").trim(); if (mtext === PLACEHOLDER) mtext = "";
    var cover = safeImg(String(data.p || "")), title = String(data.t || "Our Memories"), quote = String(data.q || "");
    var shop = ctx.shop && ctx.shop.name ? ctx.shop : null;

    var root = h("div", { class: "kv " + T.kind, role: "dialog", "aria-label": title });
    var st = root.style;
    st.setProperty("--img", 'url("' + ASSET(tid) + '")'); st.setProperty("--paper", T.paper || "#f6ecd9"); st.setProperty("--ink", T.ink || "#3a1a1a"); st.setProperty("--acc", T.acc);
    st.setProperty("--accl", T.accl || T.acc); st.setProperty("--seal", T.seal || T.acc); st.setProperty("--seal2", T.seal2 || T.acc); st.setProperty("--title", T.title || "#fff6e6");
    var fill = h("div", { class: "kv-fill" }), stage = h("div", { class: "kv-stage" });
    var bg = h("div", { class: "kv-bg" }); bg.style.filter = (T.kind === "paper" ? "blur(12px) saturate(1.08) " : "saturate(1.05) ") + "brightness(" + (T.dim || .6) + ")";
    var fx = h("canvas", { class: "kv-fx", "aria-hidden": "true" }), rays = T.rays ? h("div", { class: "kv-rays", "aria-hidden": "true" }) : null;
    var page = h("div", { class: "kv-page pre", tabindex: "-1" }), bar = h("div", { class: "kv-bar" }), top = h("div", { class: "kv-top" });

    /* ---------- sections */
    var hero = h("section", { class: "kv-sec kv-hero" },
      h("div", { class: "kv-eyebrow kv-rv", style: "--d:0s", text: shop ? "From " + shop.name : "A keepsake for you" }),
      cover ? h("div", { class: "kv-cover kv-rv zoom", style: "--d:.1s" }, h("img", { src: cover, alt: "", onerror: function (e) { e.target.parentNode.remove(); } })) : null,
      h("h1", { class: "kv-title kv-script kv-rv", style: "--d:.2s", text: title }),
      quote ? h("p", { class: "kv-quote kv-rv", style: "--d:.35s", text: quote }) : null,
      h("div", { class: "kv-cue kv-rv", style: "--d:.9s" }, h("span", { text: "Scroll" }), h("i"))
    );
    var secs = [hero], revealList = [], onVisible = [];

    function card(label, body, extraSec) {
      var s = h("section", { class: "kv-sec tall" + (extraSec ? " " + extraSec : "") },
        h("div", { class: "kv-card kv-rv" }, h("h2", { class: "kv-h kv-script", text: label }), h("div", { class: "kv-orn", text: "♡" }), body));
      secs.push(s); return s;
    }

    // photos
    var slideTimer = null;
    if (photos.length) {
      var show = h("div", { class: "kv-show", role: "group", "aria-label": "Photo slideshow" }), dots = h("div", { class: "kv-dots" }), count = h("div", { class: "kv-count" });
      var slides = [], cur = 0, visible = false, held = 0;
      var go = function (n) {
        if (!slides.length) return; cur = (n + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.el.classList.toggle("on", i === cur); }); [].forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === cur); });
        count.textContent = (cur + 1) + " / " + slides.length; count.hidden = slides.length < 2;
      };
      var rebuildDots = function () { dots.textContent = ""; slides.forEach(function (s, i) { dots.append(h("button", { type: "button", "aria-label": "Photo " + (i + 1), onclick: function () { held = Date.now(); go(i); } })); }); dots.hidden = slides.length < 2; go(Math.min(cur, slides.length - 1)); };
      photos.forEach(function (u, n) {
        var el = h("div", { class: "kv-slide" }), im = new Image(); im.alt = "Photo " + (n + 1); im.decoding = "async"; im.referrerPolicy = "no-referrer";
        var rec = { el: el, u: u }; slides.push(rec); el.append(im);
        im.onerror = function () { var i = slides.indexOf(rec); if (i > -1) slides.splice(i, 1); el.remove(); rec.bad = true; failed.push(u); if (!slides.length) noPhotos(); else rebuildDots(); };
        im.src = u; show.append(el);
      });
      var failed = [], noPhotos = function () { photoSec.querySelector(".kv-card").append(h("div", { class: "kv-sub", text: "These photos can't be shown here yet." }), failed.slice(0, 3).map(function (u) { return h("p", null, h("a", { class: "kv-btn ghost", href: u, target: "_blank", rel: "noopener noreferrer", text: "Open photo ↗" })); })); show.remove(); dots.remove(); };
      show.append(h("button", { class: "kv-arrow prev", type: "button", "aria-label": "Previous photo", text: "‹", onclick: function () { held = Date.now(); go(cur - 1); } }), h("button", { class: "kv-arrow next", type: "button", "aria-label": "Next photo", text: "›", onclick: function () { held = Date.now(); go(cur + 1); } }), count);
      var x0 = null; show.addEventListener("pointerdown", function (e) { x0 = e.clientX; }); show.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { held = Date.now(); go(cur + (dx < 0 ? 1 : -1)); } });
      show.addEventListener("pointercancel", function () { x0 = null; });
      var photoSec = card((gal && gal.l) || "Our moments", [show, dots]); rebuildDots();
      onVisible.push([photoSec, function (v) { visible = v; }]);
      if (!REDUCE) slideTimer = setInterval(function () { if (visible && slides.length > 1 && Date.now() - held > 9000) go(cur + 1); }, 4800);
    }

    // video
    var videoStop = function () {}, ducker = { resume: false };
    if (vurl) {
      var vbox = h("div", { class: "kv-video" }), ytv = YT.exec(vurl), vm = VM.exec(vurl);
      var playing = function (on) { if (!music) return; if (on) { if (music.playing()) { ducker.resume = true; music.pause(true); } } else if (ducker.resume) { ducker.resume = false; music.play(true); } };
      if (ytv) {
        vbox.style.backgroundImage = 'url("https://i.ytimg.com/vi/' + ytv[1] + '/hqdefault.jpg")';
        var startYt = function () { var f = ytFrame(ytv[1], { autoplay: true, title: (vid && vid.l) || "Video" }); var un = ytListen(f, function (s) { if (s === 1) playing(true); else if (s === 2 || s === 0) playing(false); }); cleanups.push(un); vbox.textContent = ""; vbox.append(f); };
        vbox.append(h("button", { class: "kv-play", type: "button", "aria-label": "Play video", onclick: startYt }, h("span")));
      } else if (vm) {
        vbox.append(h("button", { class: "kv-play", type: "button", "aria-label": "Play video", onclick: function () { playing(true); vbox.textContent = ""; vbox.append(h("iframe", { src: "https://player.vimeo.com/video/" + vm[1] + "?autoplay=1&playsinline=1", allow: "autoplay; fullscreen; picture-in-picture", allowfullscreen: true, title: "Video" })); } }, h("span")));
      } else if (isVid(vurl)) {
        var vv = h("video", { controls: true, playsinline: true, preload: "metadata", src: vurl });
        vv.addEventListener("play", function () { playing(true); }); vv.addEventListener("pause", function () { playing(false); }); vv.addEventListener("ended", function () { playing(false); });
        vbox.append(vv); videoStop = function () { try { vv.pause(); } catch (e) {} };
      } else if (httpUrl(vurl)) { vbox = h("a", { class: "kv-btn", href: httpUrl(vurl), target: "_blank", rel: "noopener noreferrer", text: "Watch the video ↗" }); }
      else vbox = null;
      if (vbox) card((vid && vid.l) || "Watch our video", vbox);
    }

    // message
    var msgEl = null;
    if (mtext) {
      msgEl = h("p", { class: "kv-msg" });
      var parts = mtext.split(/(\s+)/), total = parts.filter(function (p) { return p.trim(); }).length, step = Math.min(.085, 3.2 / Math.max(total, 1)), n2 = 0;
      parts.forEach(function (p) { if (!p.trim()) { msgEl.append(document.createTextNode(p)); return; } var w = h("span", { class: "kv-w", text: p }); w.style.setProperty("--d", (n2++ * step).toFixed(3) + "s"); msgEl.append(w); });
      var mSec = card((msg && msg.l) || "A special message", [msgEl, h("div", { style: "text-align:center" }, h("span", { class: "kv-heart", text: "♥" }))]);
      onVisible.push([mSec, function (v) { if (v) msgEl.classList.add("in"); }]);
    }

    // song
    var music = null, songHost = null;
    if (surl) {
      var ysong = YT.exec(surl), sp = SP.exec(surl), body, label = (sng && sng.l) || "Our song";
      var disc = h("div", { class: "kv-disc", "aria-hidden": "true" });
      if (isAud(surl) || ysong) {
        songHost = h("div", { class: ysong ? "kv-embed kv-yt" : "" });
        body = [disc, h("p", { class: "kv-sub", text: ysong ? "Playing in the background. Use the player below or the button at the top." : "Playing in the background." }), songHost];
        if (isAud(surl)) body.push(h("p", null, h("button", { class: "kv-btn", type: "button", onclick: function () { music && music.toggle(); } , text: "Play / pause" })));
      } else if (sp) {
        body = [disc, h("div", { class: "kv-embed" }, h("iframe", { src: "https://open.spotify.com/embed/" + sp[1].toLowerCase() + "/" + sp[2], height: "152", allow: "encrypted-media", loading: "lazy", title: label }))];
      } else if (httpUrl(surl)) { body = [disc, h("a", { class: "kv-btn", href: httpUrl(surl), target: "_blank", rel: "noopener noreferrer", text: "Listen to the song ↗" })]; }
      if (body) {
        var sSec = card(label, body, ""); sSec.classList.add("kv-songsec");
        music = makeMusic(surl, label, songHost, disc);
      }
    }

    function makeMusic(url, label, hostEl, disc) {
      var ysong2 = YT.exec(url), m = { kind: null, userPaused: false, started: false }, on = false, el = null, fade = null, un = null;
      var set = function (v) { on = v; disc.classList.toggle("on", v); pill && pill.classList.toggle("on", v); pill && pill.setAttribute("aria-pressed", v ? "true" : "false"); pill && (pill.querySelector("span").textContent = v ? "Playing: " + label : "Paused: " + label); };
      m.playing = function () { return on; };
      if (isAud(url)) {
        m.kind = "audio"; el = new Audio(); el.src = url; el.loop = true; el.preload = "auto"; el.volume = 0; el.setAttribute("playsinline", "");
        el.addEventListener("play", function () { set(true); }); el.addEventListener("pause", function () { set(false); });
        var ramp = function (to, ms, done) { clearInterval(fade); var from = el.volume, t0 = Date.now(); fade = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / ms); el.volume = from + (to - from) * k; if (k >= 1) { clearInterval(fade); done && done(); } }, 60); };
        m.play = function (auto) { if (!auto) m.userPaused = false; var p = el.play(); if (p && p.then) p.then(function () { ramp(.85, 1800); }).catch(function () { set(false); }); else ramp(.85, 1800); };
        m.pause = function (auto) { if (!auto) m.userPaused = true; ramp(0, 350, function () { el.pause(); }); };
        m.destroy = function () { clearInterval(fade); try { el.pause(); el.removeAttribute("src"); el.load(); } catch (e) {} };
      } else if (ysong2) {
        m.kind = "yt"; var f = ytFrame(ysong2[1], { autoplay: true, loop: true, title: label });
        un = ytListen(f, function (s) { if (s === 1) set(true); else if (s === 2 || s === 0 || s === -1 && false) set(false); }); cleanups.push(un);
        m.mountFrame = function () { if (!f.parentNode) hostEl.append(f); };
        m.play = function (auto) { if (!auto) m.userPaused = false; m.mountFrame(); ytCmd(f, "playVideo"); };
        m.pause = function (auto) { if (!auto) m.userPaused = true; ytCmd(f, "pauseVideo"); };
        m.destroy = function () { ytCmd(f, "stopVideo"); f.remove(); };
      } else return null;
      m.toggle = function () { on ? m.pause(false) : m.play(false); };
      m.start = function () { m.started = true; m.play(true); };
      return m;
    }

    // footer
    var wa = shop && String(shop.whatsapp || "").replace(/\D/g, "");
    var foot = h("div", { class: "kv-foot" }, h("div", { class: "by", text: shop ? "Made for you by" : "Made with Keepsake" }), shop ? h("div", { class: "shop", text: shop.name }) : null,
      shop && wa ? h("a", { class: "kv-btn", href: "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hi! I'd love a keepsake like this ♡"), target: "_blank", rel: "noopener noreferrer", text: "Order yours ♡" }) : null,
      !shop && !ctx.preview ? h("a", { class: "kv-btn", href: "/", text: "Make your own keepsake" }) : null);

    secs.forEach(function (s) { page.append(s); }); page.append(foot);

    /* ---------- chrome */
    var pill = null;
    if (music) pill = h("button", { class: "kv-music", type: "button", "aria-pressed": "false", "aria-label": "Play or pause the music", onclick: function () { music.toggle(); } }, h("div", { class: "kv-eq" }, h("i"), h("i"), h("i")), h("span", { text: "Our song" }));
    var closeBtn = ctx.preview ? h("button", { class: "kv-x", type: "button", "aria-label": "Close preview", text: "×", onclick: function () { destroy(); ctx.onClose && ctx.onClose(); } }) : null;
    top.append(closeBtn || h("span"), pill || h("span"));
    if (pill) { pill.querySelector("span").textContent = "Playing: " + ((sng && sng.l) || "Our song"); }

    /* ---------- the opener: the template exactly as designed, then it opens */
    var op = h("div", { class: "kv-open", "data-o": T.open });
    var door = function (cls) { return h("div", { class: "kv-door " + cls }); };
    if (T.open === "doors") op.append(door("l"), door("r")); else if (T.open === "shutters") op.append(door("t"), door("b")); else op.append(h("div", { class: "kv-img" }));
    op.append(h("div", { class: "kv-shine" }));
    var ots = [];
    if (T.kind === "paper") {
      if (T.rects.length === 2) { ots.push(h("div", { class: "kv-ot" }, h("b", { text: title }))); ots.push(h("div", { class: "kv-ot" }, quote ? h("small", { text: quote }) : h("small", { text: shop ? "From " + shop.name : "A keepsake for you" }))); }
      else ots.push(h("div", { class: "kv-ot" }, h("b", { text: title }), quote ? h("small", { text: quote }) : null));
    } else {
      ots.push(h("div", { class: "kv-ot" }, h("b", { text: title }), quote ? h("small", { text: quote }) : null));
      if (T.oink) op.style.setProperty("--ink", T.oink);
    }
    ots.forEach(function (o) { op.append(o); });
    var goBtn = h("button", { class: "kv-go", type: "button", "aria-label": "Open the card" }, h("span", { class: "kv-seal", text: "♡" }), h("em", { text: "Tap to open" }));
    op.append(goBtn);
    if (T.oshade === 0) op.classList.add("noshade");

    var layout = function () {
      var W = stage.clientWidth, Hh = stage.clientHeight; if (!W || !Hh) return;
      var iw, ih, ox = 0, oy = 0;
      if (W / Hh < IMG_ASPECT) { ih = Hh; iw = Hh * IMG_ASPECT; ox = (iw - W) / 2; } else { iw = W; ih = W / IMG_ASPECT; oy = (ih - Hh) / 2; }
      var mapx = function (p) { return p / 100 * iw - ox; }, mapy = function (p) { return p / 100 * ih - oy; };
      var rects = T.kind === "paper" ? T.rects : [T.rect];
      ots.forEach(function (o, i) {
        var r = rects[Math.min(i, rects.length - 1)], x, y, w, hh;
        if (T.kind === "paper") { x = mapx(r[0]); y = mapy(r[1]); w = mapx(r[0] + r[2]) - x; hh = mapy(r[1] + r[3]) - y; } else { x = r[0] / 100 * W; y = r[1] / 100 * Hh; w = r[2] / 100 * W; hh = r[3] / 100 * Hh; }
        o.style.left = x + "px"; o.style.top = y + "px"; o.style.width = w + "px"; o.style.height = hh + "px";
        var fs = Math.max(24, Math.min(w * (rects.length === 2 ? .2 : .19), hh * (rects.length === 2 ? .5 : .3), T.kind === "photo" ? 74 : 62)); o.style.setProperty("--fs", fs + "px");
        for (var k = 0; k < 24 && o.scrollHeight > o.clientHeight + 1; k++) { fs *= .93; o.style.setProperty("--fs", fs + "px"); }
      });
      var bx = T.kind === "paper" ? mapx(T.btn[0]) : T.btn[0] / 100 * W, by2 = T.kind === "paper" ? mapy(T.btn[1]) : T.btn[1] / 100 * Hh;
      goBtn.style.left = bx + "px"; goBtn.style.top = Math.min(by2, Hh - 70) + "px"; goBtn.style.transform = "translate(-50%,-50%)";
    };
    if (T.kind === "paper") { op.style.setProperty("--ink", T.ink); }

    /* ---------- assemble */
    stage.append(bg, fx); if (rays) stage.append(rays); stage.append(page, bar, top, op); root.append(fill, stage); host.append(root);
    layout(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(layout);
    var onResize = function () { layout(); }; window.addEventListener("resize", onResize); cleanups.push(function () { window.removeEventListener("resize", onResize); });
    var preload = new Image(); preload.src = ASSET(tid);

    var opened = false, stopFx = function () {}, io = null;
    function reveal() {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); } }); }, { root: page, threshold: .18 });
      page.querySelectorAll(".kv-rv").forEach(function (e) { io.observe(e); });
      var vis = new IntersectionObserver(function (es) { es.forEach(function (e) { onVisible.forEach(function (p) { if (p[0] === e.target) p[1](e.isIntersecting); }); }); }, { root: page, threshold: .35 });
      onVisible.forEach(function (p) { vis.observe(p[0]); }); cleanups.push(function () { io.disconnect(); vis.disconnect(); });
    }
    function open() {
      if (opened) return; opened = true;
      if (music) { if (music.kind === "yt") music.mountFrame(); music.start(); }   // inside the tap, so the browser allows sound
      op.classList.add("go"); root.classList.add("kv-live"); page.classList.remove("pre");
      stopFx = startFx(fx, T.fx, T.fxc); cleanups.push(stopFx);
      setTimeout(reveal, REDUCE ? 0 : 500);
      var t = setTimeout(function () { op.remove(); page.focus({ preventScroll: true }); }, REDUCE ? 60 : 2000); timers.push(t);
    }
    goBtn.addEventListener("click", open);
    op.addEventListener("click", function (e) { if (e.target === op || e.target.closest(".kv-ot")) open(); });
    var onKey = function (e) { if (e.key === "Escape" && ctx.preview) { destroy(); ctx.onClose && ctx.onClose(); } };
    document.addEventListener("keydown", onKey); cleanups.push(function () { document.removeEventListener("keydown", onKey); });
    page.addEventListener("scroll", function () { var m = page.scrollHeight - page.clientHeight; bar.style.transform = "scaleX(" + (m > 0 ? Math.min(1, page.scrollTop / m) : 0) + ")"; }, { passive: true });
    var wasOn = false, onVis = function () { if (!music || !music.started) return; if (document.hidden) { wasOn = music.playing(); if (wasOn) music.pause(true); } else if (wasOn && !music.userPaused) { music.play(true); wasOn = false; } };
    document.addEventListener("visibilitychange", onVis); cleanups.push(function () { document.removeEventListener("visibilitychange", onVis); });

    function destroy() {
      clearInterval(slideTimer); timers.forEach(clearTimeout); cleanups.forEach(function (f) { try { f(); } catch (e) {} });
      videoStop(); if (music && music.destroy) music.destroy(); root.remove();
    }
    return { destroy: destroy, root: root, open: open, template: tid };
  }

  /* ------------------------------------------------------------------ lock screen */
  function lockScreen(host, o) {
    o = o || {};
    var err = h("p", { class: "kv-lockerr", role: "alert" }), input = h("input", { type: "password", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Password", "aria-label": "Password", maxlength: "40" });
    var btn = h("button", { type: "submit", text: "Unlock" }), box;
    var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/></svg>';
    var ic = h("div", { class: "kv-lockicon" }); ic.innerHTML = icon;
    var form = h("form", { novalidate: true }, input, btn, err);
    box = h("div", { class: "kv-lockbox" }, ic, h("h1", { text: "A private keepsake" }), h("p", { text: o.from ? "This card from " + o.from + " is protected. Enter the password you were given." : "This card is protected. Enter the password you were given." }), form, h("div", { class: "by", text: "Keepsake" }));
    var lock = h("div", { class: "kv-lock" }, box); host.append(lock);
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 400);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); var pw = input.value; if (!pw) { err.textContent = "Please enter the password."; return; }
      btn.disabled = true; err.textContent = ""; btn.textContent = "Checking…";
      Promise.resolve(o.onSubmit(pw)).then(function (res) {
        if (res && res.ok) { lock.remove(); return; }
        err.textContent = (res && res.error) || "That password is not right."; input.select(); box.classList.remove("kv-shake"); void box.offsetWidth; box.classList.add("kv-shake");
      }).catch(function () { err.textContent = "Could not check the password. Please try again."; }).then(function () { btn.disabled = false; btn.textContent = "Unlock"; });
    });
    return { remove: function () { lock.remove(); } };
  }

  window.KeepsakeViewer = { mount: mount, lockScreen: lockScreen, templates: TPL };
})();
