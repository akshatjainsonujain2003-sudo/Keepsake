/* Free menu / rate-card scanner. Runs entirely on the phone or computer: Tesseract.js reads the text
   (no server, no AI bill), then parse() turns the lines into sections, items and prices.
   KSMenuOCR.read(files, { hindi, onProgress }) -> [{ n, items: [{ n, p, d }] }] */
(function (root) {
  "use strict";
  const CUR = /^(?:₹|rs\.?|r[s5]\.?|inr|[%&£€$¥#])$/i;            // a currency sign on its own (OCR often reads ₹ as % & or #)
  const NUM = /^(?:₹|rs\.?|inr|[%&£€$¥#])?\s*(\d{1,3}(?:,\d{2,3})+|\d{1,6})(?:\.\d{1,2})?(?:\/-?|-\/|\/)?$/i;
  const SEP = /^(?:\/|\||-|–|—|to|or|:)$/i;
  const NOISE = /(\+91|\b\d{5}\s?\d{5}\b|\b\d{10}\b|www\.|https?:|\.com\b|\.in\b|@|inclusive of|exclusive of|taxes|\btimings?\b|\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\bopen\b|\bclosed\b|thank you|follow us|scan (the|this))/i;
  const LEAD = /[.·•_…]{3,}|[-–—]{4,}/g;

  // Dotted leaders between a name and its price come out as junk like "....coeweee": drop any token with "..".
  const tidy = s => String(s || "").replace(/[|¦]/g, " ").split(/\s+/).filter(t => t && !/\.{2,}|…|^[.·•_~-]{2,}$/.test(t)).join(" ").replace(LEAD, " ").trim();
  const title = s => /[a-z]/.test(s) || s.length < 4 ? s : s.toLowerCase().replace(/(^|[\s(/&-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const letters = s => (s.match(/[A-Za-zऀ-ॿ]/g) || []).length;
  const fmt = n => n >= 1000 ? n.toLocaleString("en-IN") : String(n);

  // Split one line into its name and the prices printed at the end of it.
  function split(line) {
    const toks = tidy(line).split(" ").filter(Boolean), prices = []; let range = false, onwards = false;
    while (toks.length) {
      const t = toks[toks.length - 1].replace(/[)\]]+$/, "");
      if (/^(onwards?|\+|only|each|per|\/-|-\/|\/)$/i.test(t)) { if (/^onward|\+/i.test(t)) onwards = true; toks.pop(); continue; }
      if (CUR.test(t)) { toks.pop(); continue; }
      const parts = t.split(/\/(?=[^-])/).filter(Boolean);          // "3200/%260" -> two prices
      if (parts.length > 1 && parts.every(x => NUM.test(x))) { parts.reverse().forEach(x => prices.unshift(+NUM.exec(x)[1].replace(/,/g, ""))); toks.pop(); continue; }
      const m = NUM.exec(t);
      if (m) { prices.unshift(+m[1].replace(/,/g, "")); toks.pop(); if (toks.length && CUR.test(toks[toks.length - 1])) toks.pop(); continue; }
      if (prices.length && SEP.test(t)) { if (/^(-|–|—|to)$/i.test(t)) range = true; toks.pop(); continue; }
      break;
    }
    const name = toks.join(" ").replace(/^[\s•*·:>»✓✔-]+|[\s:|=~-]+$/g, "").trim();
    return { name, prices: prices.filter(p => p > 0 && p < 1e6), range, onwards };
  }

  // Tables and rate cards: OCR often reads the whole name column, then the whole price column.
  // Put each price-only line back on the row of the name to its left.
  function pair(L) {
    const has = l => l.y0 != null && l.x0 != null;
    const lone = l => { if (!has(l)) return false; const x = split(l.text); return x.prices.length && !letters(x.name); };
    const used = new Set();
    L.forEach((p, pi) => {
      if (!lone(p)) return;
      const cy = (p.y0 + p.y1) / 2, h = Math.max(8, p.y1 - p.y0);
      let best = -1, bx = -1;
      L.forEach((n, ni) => {
        if (ni === pi || used.has(ni) || !has(n) || n.page !== p.page || !letters(n.text) || split(n.text).prices.length) return;
        const ny = (n.y0 + n.y1) / 2;
        if (Math.abs(ny - cy) <= Math.max(h, n.y1 - n.y0) * 0.6 && n.x1 <= p.x0 + 4 && n.x1 > bx) { best = ni; bx = n.x1; }
      });
      if (best >= 0) { used.add(best); L[best] = { ...L[best], text: L[best].text + " " + p.text, conf: Math.min(L[best].conf == null ? 100 : L[best].conf, p.conf == null ? 100 : p.conf) }; p.gone = true; }
    });
    return L.filter(l => !l.gone);
  }

  // lines: [{ text, h?, conf?, x0?, y0?, x1?, y1?, page? }] in reading order
  function parse(lines, opts) {
    opts = opts || {};
    let L = (lines || []).map(l => typeof l === "string" ? { text: l } : { ...l })
      .map(l => ({ ...l, text: tidy(l.text) }))
      .filter(l => l.text && letters(l.text) + (l.text.match(/\d/g) || []).length >= 2 && (l.conf == null || l.conf >= 8));
    L = pair(L).filter(l => !NOISE.test(l.text));
    const hs = L.map(l => l.h || (l.y1 - l.y0) || 0).filter(Boolean).sort((a, b) => a - b), mid = hs.length ? hs[hs.length >> 1] : 0;
    const ht = l => l.h || (l.y1 != null ? l.y1 - l.y0 : 0);
    const S = L.map(l => split(l.text));
    const pricedDoc = S.filter(s => s.prices.length && letters(s.name)).length >= Math.max(2, L.length * 0.3);
    const out = []; let sec = null, last = null;
    const section = n => { sec = { n: n.slice(0, 24), items: [] }; out.push(sec); last = null; };
    const add = it => { if (!sec) section(opts.defaultName || "Menu"); sec.items.push(it); last = it; };
    const setP = (it, s) => {
      const ps = s.prices; if (!ps.length) return;
      if (s.range && ps.length === 2) { it.p = fmt(ps[0]) + "-" + fmt(ps[1]); return; }
      it.ps = ps; it.p = fmt(Math.min(...ps));
      if (s.onwards) it.d = it.d || "Starting price";
      if (ps.length > 1) {
        const v = /\(([^)]+)\)\s*$/.exec(it.n), parts = v ? v[1].split(/\s*[/|,]\s*/) : [];
        if (parts.length === ps.length) { it.n = it.n.replace(/\s*\([^)]+\)\s*$/, ""); it.vn = parts; }
      }
    };
    for (let i = 0; i < L.length; i++) {
      const l = L[i], raw = l.text, s = S[i], weak = l.conf != null && l.conf < 60;
      if (s.prices.length && !letters(s.name)) { if (last && !last.p) { setP(last, s); if (weak) last.chk = 1; } continue; }
      if (s.prices.length) { const it = { n: title(s.name).slice(0, 50), p: "", d: "" }; setP(it, s); if (weak) it.chk = 1; add(it); continue; }
      const words = raw.split(" ").length, caps = letters(raw) > 2 && raw === raw.toUpperCase() && /[A-Z]/.test(raw);
      const big = mid && ht(l) >= mid * 1.25, small = mid && ht(l) && ht(l) <= mid * 0.85;
      const nextPriced = S.slice(i + 1, i + 3).some(x => x.prices.length && letters(x.name));
      if (words <= 5 && (caps || big || /:$/.test(raw))) { section(title(raw.replace(/:$/, ""))); continue; }
      if (last && (small || /^[a-z(]/.test(raw) || (raw.length > 38 && /[a-z]{3}/.test(raw)))) { last.d = ((last.d ? last.d + " · " : "") + raw).slice(0, 140); continue; }
      if (words <= 5 && pricedDoc && nextPriced && /^[A-Zऀ-ॿ]/.test(raw) && !/[.,]$/.test(raw)) { section(raw); continue; }
      if (pricedDoc) continue;                                        // shop name, address, tagline…
      add({ n: title(raw.replace(/[:\s-]+$/, "")).slice(0, 50), p: "", d: "", ...(weak ? { chk: 1 } : {}) });
    }
    // Lines before the first heading of a list without prices are usually the shop's name and tagline.
    if (!pricedDoc && out.length > 1 && out[0].n === (opts.defaultName || "Menu") && out[0].items.every(x => !x.p)) out.shift();
    // "₹280" is often read as "3280" or "2280": in a section of 2–3 digit prices, a 4-digit one starting
    // with 2, 3 or 7 most likely had the rupee sign glued on. Fix it and flag it for a look.
    out.forEach(sc => {
      const all = sc.items.flatMap(x => x.ps || []), plain = all.filter(v => !(v >= 1000 && v < 10000 && /^[237]/.test(String(v))));
      const big = plain.some(v => v >= 1000);
      sc.items.forEach(x => {
        if (!x.ps || big || !plain.length) return;
        const fixed = x.ps.map(v => v >= 1000 && v < 10000 && /^[237]/.test(String(v)) ? +String(v).slice(1) : v);
        if (fixed.some((v, k) => v !== x.ps[k])) { x.ps = fixed; x.p = fmt(Math.min(...fixed)); x.chk = 1; }
      });
    });
    out.forEach(sc => sc.items.forEach(x => {
      if (x.ps && x.ps.length > 1) x.d = x.vn ? x.vn.map((n, k) => n + " ₹" + fmt(x.ps[k])).join(" · ") : x.ps.map(v => "₹" + fmt(v)).join(" / ");
      delete x.ps; delete x.vn;
    }));
    return out.map(sc => ({ n: sc.n || "Menu", items: sc.items.filter(x => x.n && letters(x.n) >= 2) })).filter(sc => sc.items.length);
  }

  // ---------- browser: read photos / PDFs with Tesseract.js ----------
  // Everything is served from our own site (some mobile networks in India block public CDNs).
  const BASE = "/assets/ocr5/", TJS = BASE + "tesseract.min.js", PDFJS = BASE + "pdf.min.js", PDFW = BASE + "pdf.worker.min.js";
  const within = (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);
  const load = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("Couldn't load the scanner. Check your internet and try again.")); document.head.appendChild(s); });

  // Photos: straighten size (small photos read badly, huge ones are slow) and make them grey.
  function canvasOf(src, w, h) {
    const k = Math.max(w, h) > 2600 ? 2600 / Math.max(w, h) : Math.max(w, h) < 1400 ? 1400 / Math.max(w, h) : 1;
    const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.filter = "grayscale(1) contrast(1.25)"; x.drawImage(src, 0, 0, c.width, c.height); return c;
  }
  const imageCanvas = f => new Promise((ok, no) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); ok(canvasOf(im, im.naturalWidth, im.naturalHeight)); }; im.onerror = () => { URL.revokeObjectURL(u); no(new Error("Couldn't open " + f.name + ". Use a JPG or PNG photo.")); }; im.src = u; });
  async function pdfCanvases(f) {
    await load(PDFJS); root.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFW;
    const doc = await root.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise, out = [];
    for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
      const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2.2 }), c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; out.push(c);
    }
    return out;
  }

  async function read(files, opts) {
    opts = opts || {}; const say = opts.onProgress || (() => {});
    say("Getting the scanner ready…", 0);
    await load(TJS);
    let cur = 0, total = 1;
    const worker = await within(root.Tesseract.createWorker(opts.hindi ? "eng+hin" : "eng", 1, {
      workerPath: BASE + "worker.min.js", corePath: BASE, langPath: BASE + "lang", workerBlobURL: false,
      errorHandler: e => console.error("ocr", e),
      logger: m => { if (/loading|initializ/.test(m.status || "")) say("Getting the scanner ready… " + Math.round((m.progress || 0) * 100) + "%", 0); if (m.status === "recognizing text") say(`Reading ${total > 1 ? "page " + (cur + 1) + " of " + total : "your menu"}… ${Math.round(m.progress * 100)}%`, (cur + m.progress) / total); }
    }), 120000, "The scanner took too long to start. Check your internet and try again.");
    try {
      await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "3" });
      const pages = [];
      for (const f of files) {
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) pages.push(...(await pdfCanvases(f)));
        else if (/^image\//.test(f.type)) pages.push(await imageCanvas(f));
      }
      if (!pages.length) throw new Error("Please choose photos (JPG, PNG) or a PDF.");
      total = pages.length; const lines = [];
      for (cur = 0; cur < pages.length; cur++) {
        const { data } = await worker.recognize(pages[cur]);
        (data.lines || []).forEach(l => lines.push({ text: l.text, conf: l.confidence, page: cur, ...(l.bbox ? { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 } : {}) }));
      }
      say("Arranging items…", 1);
      return parse(lines, opts);
    } finally { await worker.terminate(); }
  }

  const api = { parse, split, read };
  if (typeof module === "object" && module.exports) module.exports = api; else root.KSMenuOCR = api;
})(typeof window !== "undefined" ? window : globalThis);
