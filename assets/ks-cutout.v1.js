/* Cuts a person out of a photo, in the customer's browser (no server, no cost).
   Uses Google's MediaPipe Selfie Segmentation (Apache-2.0), self-hosted in /assets/mp.
   KSCutout.cut(source, opts) -> Promise<{ cut: canvas (transparent PNG-ready), sticker: canvas (with white outline), ok: bool }>
   source: File | Blob | HTMLImageElement | URL string.
   Files in /assets are cached for a year: rename (v2…) when changing. */
(function () {
  let segP = null, busy = Promise.resolve();
  function loadScript(src) {
    return new Promise((res, rej) => { if (window.SelfieSegmentation) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load the photo tool.")); document.head.appendChild(s); });
  }
  async function segmenter() {
    if (!segP) segP = (async () => {
      await loadScript("/assets/mp/selfie_segmentation.js");
      const s = new window.SelfieSegmentation({ locateFile: f => "/assets/mp/" + f });
      s.setOptions({ modelSelection: 0 });
      await s.initialize();
      return s;
    })();
    return segP;
  }
  // One segmentation at a time (the model has a single results callback).
  function run(seg, image) {
    const job = busy.then(() => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("The photo tool took too long.")), 30000);
      seg.onResults(r => { clearTimeout(t); res(r); });
      seg.send({ image }).catch(e => { clearTimeout(t); rej(e); });
    }));
    busy = job.catch(() => {});
    return job;
  }
  async function toImage(src) {
    if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement) { if (src.decode) await src.decode().catch(() => {}); return src; }
    const img = new Image();
    if (src instanceof Blob) { img.src = URL.createObjectURL(src); } else { img.crossOrigin = "anonymous"; img.src = src; }
    await img.decode();
    return img;
  }
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  // mask (any drawable) -> Float32 alpha [0..1] at w x h
  function alphaOf(mask, w, h) {
    const c = canvas(w, h), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(mask, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, a = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
    return a;
  }
  function bbox(a, w, h, t) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : [x0, y0, x1, y1];
  }
  // Keep only the biggest blob, so stray bits of background disappear.
  function largest(a, w, h, t) {
    const lab = new Int32Array(w * h), sizes = [0]; let n = 0; const st = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] <= t || lab[i]) continue;
      n++; let size = 0; st.push(i); lab[i] = n;
      while (st.length) { const p = st.pop(); size++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && !lab[p - 1] && a[p - 1] > t) { lab[p - 1] = n; st.push(p - 1); }
        if (x < w - 1 && !lab[p + 1] && a[p + 1] > t) { lab[p + 1] = n; st.push(p + 1); }
        if (y > 0 && !lab[p - w] && a[p - w] > t) { lab[p - w] = n; st.push(p - w); }
        if (y < h - 1 && !lab[p + w] && a[p + w] > t) { lab[p + w] = n; st.push(p + w); } }
      sizes.push(size);
    }
    let best = 1; for (let k = 2; k <= n; k++) if (sizes[k] > sizes[best]) best = k;
    for (let i = 0; i < a.length; i++) if (lab[i] !== best) a[i] = Math.min(a[i], lab[i] ? 0 : a[i] * 0.3);
  }
  // Steeper edge so the cut is clean but still slightly soft.
  const sharpen = v => { const t = (v - 0.55) / 0.25; return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); };

  async function cut(src, opts) {
    opts = opts || {};
    const maxSide = opts.maxSide || 1100, outline = opts.outline == null ? 0.022 : opts.outline;
    const img = await toImage(src);
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const seg = await segmenter();
    // Pass 1: find the person.
    const r1 = await run(seg, img);
    const a1 = alphaOf(r1.segmentationMask, 256, Math.round(256 * H / W));
    const b = bbox(a1, 256, Math.round(256 * H / W), 0.5);
    if (!b) return { ok: false };
    const sc = W / 256;
    let [x0, y0, x1, y1] = b.map(v => v * sc);
    // Square crop around the person: the model sees a square, so this keeps the body undistorted.
    { const side = Math.max(x1 - x0, y1 - y0) * 1.18, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      x0 = Math.max(0, mx - side / 2); y0 = Math.max(0, my - side / 2); x1 = Math.min(W, mx + side / 2); y1 = Math.min(H, my + side / 2); }
    // Pass 2: look again, closely, at just the person.
    const k = Math.min(1, maxSide / Math.max(x1 - x0, y1 - y0));
    const cw = Math.round((x1 - x0) * k), ch = Math.round((y1 - y0) * k);
    const crop = canvas(cw, ch); crop.getContext("2d").drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, cw, ch);
    const r2 = await run(seg, crop);
    const a = alphaOf(r2.segmentationMask, cw, ch);
    for (let i = 0; i < a.length; i++) a[i] = sharpen(a[i]);
    largest(a, cw, ch, 0.5);
    const bb = bbox(a, cw, ch, 0.5); if (!bb) return { ok: false };
    // Cut-out, trimmed to the person.
    const pad = Math.round(Math.max(cw, ch) * (outline + 0.01));
    const tw = bb[2] - bb[0] + 1, th = bb[3] - bb[1] + 1;
    const cutC = canvas(tw + pad * 2, th + pad * 2), cx = cutC.getContext("2d");
    const px = crop.getContext("2d").getImageData(bb[0], bb[1], tw, th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) px.data[(y * tw + x) * 4 + 3] = Math.round(255 * a[(y + bb[1]) * cw + x + bb[0]]);
    cx.putImageData(px, pad, pad);
    return { ok: true, cut: cutC, sticker: sticker(cutC, outline) };
  }
  // White sticker outline around a transparent cut-out, plus a soft shadow.
  function sticker(cutC, outline) {
    outline = outline == null ? 0.022 : outline;
    const stick = canvas(cutC.width, cutC.height), sx = stick.getContext("2d");
    const white = canvas(cutC.width, cutC.height), wx = white.getContext("2d");
    wx.drawImage(cutC, 0, 0); wx.globalCompositeOperation = "source-in"; wx.fillStyle = "#fffdf7"; wx.fillRect(0, 0, white.width, white.height);
    const rad = Math.max(3, Math.round(Math.max(cutC.width, cutC.height) * outline * 0.9));
    sx.save(); sx.shadowColor = "rgba(40,20,10,.35)"; sx.shadowBlur = rad * 1.6; sx.shadowOffsetY = rad * 0.5;
    for (let ang = 0; ang < 360; ang += 15) { const r = ang * Math.PI / 180; sx.drawImage(white, Math.cos(r) * rad, Math.sin(r) * rad); }
    sx.restore();
    for (let ang = 0; ang < 360; ang += 10) { const r = ang * Math.PI / 180; sx.drawImage(white, Math.cos(r) * rad, Math.sin(r) * rad); }
    sx.drawImage(cutC, 0, 0);
    return stick;
  }
  window.KSCutout = { sticker, cut, preload: () => segmenter().catch(() => {}) };
})();
