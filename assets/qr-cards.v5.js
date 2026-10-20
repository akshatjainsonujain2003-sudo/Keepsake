/* GetKeepsake business QR cards: print sheets for blank business QR codes.
   KSQRCards.render(outEl, codes, { size: "stamp"|"card"|"board", label, base, tone, paper })
   stamp = 3.5 × 5 in gradient stamp board (design F2), packed edge to edge with crop marks in the margin.
           tone: red|blue|marigold|green|jamun|whitegold|mix (mix rotates the first 5).
           paper: a4 (2×2) | a3 | 12x18 | 13x19 (3×3)
   card  = 55 × 85 mm wallet card, two-sided (front sheet, then back sheet mirrored for duplex), 9 per A4
   board = A6 counter board 105 × 148 mm, one-sided, 4 per A4
   KSQRCards.mount(hostEl, { tone, url, code }) draws one board in a shadow root (used on /shops).
   Needs qrcode-generator (window.qrcode). */
(function () {
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const I = {
    call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    menu: '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    wa: '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3Z"/>',
    pay: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
    pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
  const qr = (u, color) => { const x = qrcode(0, "M"); x.addData(u); x.make(); return x.createSvgTag({ cellSize: 3, margin: 0, scalable: true }).replace(/fill="#000000"/g, `fill="${color || "#121110"}"`).replace(/fill="#ffffff"/g, 'fill="transparent"'); };

  const CSS = `
.qs,.qs *{box-sizing:border-box}
.qs{width:210mm;min-height:297mm;margin:12px auto;background:#fff;padding:9mm 0;display:grid;justify-content:center;align-content:start;gap:4mm;page-break-after:always;break-after:page;position:relative}
.qs.card{grid-template-columns:repeat(3,55mm)}
.qs.board{grid-template-columns:repeat(2,97mm);gap:5mm;padding-top:8mm}
.qs .lbl{position:absolute;top:2.5mm;left:0;right:0;text-align:center;font:600 2.4mm Inter,system-ui,sans-serif;color:#999;letter-spacing:.1mm}
.qc{position:relative;width:55mm;height:85mm;overflow:hidden;border-radius:3mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Inter,system-ui,sans-serif;outline:.2mm dashed #c8c8c8;outline-offset:1mm}
/* ---------- card front (customers) ---------- */
.qc.fr{background:#121110;color:#fff;display:flex;flex-direction:column;align-items:center;padding:6mm 4.5mm 4mm}
.qc.fr .glow{position:absolute;width:70mm;height:70mm;left:-8mm;top:-30mm;border-radius:50%;background:radial-gradient(circle,#e6c27a40,transparent 65%)}
.qc.fr .ey{position:relative;font:800 2mm Inter,sans-serif;letter-spacing:.9mm;color:#e6c27a;text-transform:uppercase}
.qc.fr h3{position:relative;margin:1.6mm 0 0;font:400 6.5mm/0.96 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;text-align:center;letter-spacing:-.15mm}
.qc.fr h3 em,.qc.bd h3 em{font-style:normal;color:#e6c27a}
.qc.fr .qw{position:relative;margin-top:4mm;width:39mm;height:39mm;background:#fff;border-radius:3mm;padding:3mm}
.qc.fr .qw svg{width:100%;height:100%;display:block;aspect-ratio:1}
.qc.fr .qw i{position:absolute;width:5.5mm;height:5.5mm;border:.8mm solid #e6c27a}
.qc.fr .qw i:nth-child(1){left:-1.6mm;top:-1.6mm;border-right:0;border-bottom:0;border-radius:2mm 0 0 0}
.qc.fr .qw i:nth-child(2){right:-1.6mm;top:-1.6mm;border-left:0;border-bottom:0;border-radius:0 2mm 0 0}
.qc.fr .qw i:nth-child(3){left:-1.6mm;bottom:-1.6mm;border-right:0;border-top:0;border-radius:0 0 0 2mm}
.qc.fr .qw i:nth-child(4){right:-1.6mm;bottom:-1.6mm;border-left:0;border-top:0;border-radius:0 0 2mm 0}
.qc.fr .ics{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;width:100%;margin-top:4.2mm}
.qc.fr .ics span{display:flex;flex-direction:column;align-items:center;gap:.8mm;font:600 1.75mm Inter,sans-serif;color:#d8d2c6}
.qc.fr .ics svg{width:4.2mm;height:4.2mm;color:#e6c27a}
.qc.fr .ft{position:relative;margin-top:auto;font:500 1.6mm Inter,sans-serif;color:#8d877c;letter-spacing:.1mm}
.qc.fr .ft b{color:#fff;font-weight:700}
/* ---------- card back (shop owner) ---------- */
.qc.bk{background:#f4f1ea;color:#121110;padding:5.5mm 4.5mm 4mm;display:flex;flex-direction:column}
.qc.bk .ey{font:800 1.9mm Inter,sans-serif;letter-spacing:.7mm;color:#a87b2c;text-transform:uppercase}
.qc.bk h4{margin:1.4mm 0 0;font:400 5.2mm/1.02 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;letter-spacing:-.1mm}
.qc.bk h4 em{font:400 5.4mm 'Pinyon Script',cursive;text-transform:none;color:#a87b2c}
.qc.bk ol{list-style:none;margin:3.6mm 0 0;padding:0;display:grid;gap:2.2mm}
.qc.bk li{display:flex;gap:2mm;align-items:flex-start;font:500 2.05mm/1.35 Inter,sans-serif;color:#3b3731}
.qc.bk li b{display:block;font:700 2.2mm Inter,sans-serif;color:#121110}
.qc.bk li i{flex:none;width:4.6mm;height:4.6mm;border-radius:50%;background:#121110;color:#e6c27a;display:grid;place-items:center;font:400 2.2mm 'Archivo Black',sans-serif;font-style:normal}
.qc.bk .for{margin-top:3.2mm;font:600 1.75mm/1.5 Inter,sans-serif;color:#8d877c;letter-spacing:.1mm}
.qc.bk .pr{margin-top:2mm;display:flex;align-items:center;justify-content:space-between;padding:2mm 2.6mm;border-radius:2.4mm;background:#121110;color:#fff}
.qc.bk .pr b{font:400 4.6mm 'Archivo Black',sans-serif}.qc.bk .pr small{font:600 1.7mm Inter,sans-serif;color:#cfc9bd;text-align:right;line-height:1.3}
.qc.bk .no{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #d9d2c3;padding-top:2mm}
.qc.bk .no small{display:block;font:700 1.5mm Inter,sans-serif;letter-spacing:.4mm;color:#8d877c;text-transform:uppercase}
.qc.bk .no b{font:700 2.5mm ui-monospace,Menlo,monospace;letter-spacing:.3mm}
.qc.bk .no span{font:600 1.65mm/1.35 Inter,sans-serif;color:#5b564e;text-align:right}
/* ---------- A6 counter board ---------- */
.qc.bd{width:97mm;height:137mm;border-radius:4mm;background:#121110;color:#fff;display:flex;flex-direction:column;align-items:center;padding:9mm 7mm 6mm}
.qc.bd .glow{position:absolute;width:130mm;height:130mm;left:-30mm;top:-70mm;border-radius:50%;background:radial-gradient(circle,#e6c27a47,transparent 62%)}
.qc.bd .ey{position:relative;font:800 2.8mm Inter,sans-serif;letter-spacing:1.3mm;color:#e6c27a;text-transform:uppercase}
.qc.bd h3{position:relative;margin:2.4mm 0 0;font:400 10.4mm/0.95 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;text-align:center;letter-spacing:-.3mm}

.qc.bd .qw{position:relative;margin-top:6mm;width:56mm;height:56mm;background:#fff;border-radius:4.5mm;padding:4.5mm}
.qc.bd .qw svg{width:100%;height:100%;display:block}
.qc.bd .qw i{position:absolute;width:8mm;height:8mm;border:1.1mm solid #e6c27a}
.qc.bd .qw i:nth-child(1){left:-2.4mm;top:-2.4mm;border-right:0;border-bottom:0;border-radius:3mm 0 0 0}
.qc.bd .qw i:nth-child(2){right:-2.4mm;top:-2.4mm;border-left:0;border-bottom:0;border-radius:0 3mm 0 0}
.qc.bd .qw i:nth-child(3){left:-2.4mm;bottom:-2.4mm;border-right:0;border-top:0;border-radius:0 0 0 3mm}
.qc.bd .qw i:nth-child(4){right:-2.4mm;bottom:-2.4mm;border-left:0;border-top:0;border-radius:0 0 3mm 0}
.qc.bd .ics{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;width:100%;margin-top:6.5mm}
.qc.bd .ics span{display:flex;flex-direction:column;align-items:center;gap:1.4mm;font:600 2.5mm Inter,sans-serif;color:#d8d2c6;text-align:center}
.qc.bd .ics svg{width:6mm;height:6mm;color:#e6c27a}
.qc.bd .rv{position:relative;margin-top:5mm;padding:2mm 4mm;border-radius:5mm;border:.3mm solid #ffffff33;font:600 2.5mm Inter,sans-serif;color:#e9e4d8;display:flex;align-items:center;gap:1.6mm}
.qc.bd .rv svg{width:3mm;height:3mm;color:#e6c27a;fill:#e6c27a}
.qc.bd .ft{position:relative;margin-top:auto;width:100%;display:flex;justify-content:space-between;font:500 2mm Inter,sans-serif;color:#8d877c}
.qc.bd .ft b{color:#fff}
.qc .live{position:absolute;top:2.4mm;right:2.4mm;z-index:3;padding:.5mm 1.6mm;border-radius:2mm;background:#4ade80;color:#0b2a15;font:800 1.8mm Inter,sans-serif;letter-spacing:.2mm}

@media print{.qs{margin:0;padding-top:9mm}.qs .lbl{display:none}.qc{outline-color:#ddd}}
`;
  function css() { if (document.getElementById("ks-qrc-css")) return; const s = document.createElement("style"); s.id = "ks-qrc-css"; s.textContent = CSS; document.head.appendChild(s); }

  const ITEMS = [["call", "Call"], ["wa", "WhatsApp"], ["pin", "Directions"], ["star", "Review"]];
  const corners = "<i></i><i></i><i></i><i></i>";
  const front = (c, base) => `<div class="qc fr"><div class="glow"></div><div class="ey">Welcome</div><h3>Scan to<br><em>connect</em></h3><div class="qw">${corners}${qr(base + "/k/" + c.code)}</div><div class="ics">${ITEMS.map(([k, l]) => `<span>${ic(k)}${l}</span>`).join("")}</div><div class="ft">Point your phone camera · <b>no app needed</b></div>${c.status === "claimed" ? '<span class="live">LIVE</span>' : ""}</div>`;
  const back = (c, label) => `<div class="qc bk"><div class="ey">For the business owner</div><h4>Go <em>online</em><br>in 5 minutes</h4>
    <ol><li><i>1</i><div><b>Scan the front</b>Opens your page setup.</div></li><li><i>2</i><div><b>Add your details</b>Services, prices, photos, offers, UPI.</div></li><li><i>3</i><div><b>Pay once, go live</b>Customers scan this card to see it.</div></li></ol>
    <div class="for">Shops · Cafés · Clinics · Salons · Gyms · Studios · Services</div>
    <div class="pr"><b>₹499</b><small>one-time<br>no monthly fees</small></div>
    <div class="no"><div><small>Card no.</small><b>${esc(c.code)}</b></div><span>Help: WhatsApp<br>+91 63775 47759</span></div></div>`;
  const board = (c, base) => `<div class="qc bd"><div class="glow"></div><div class="ey">Welcome</div><h3>Scan to<br><em>connect</em></h3><div class="qw">${corners}${qr(base + "/k/" + c.code)}</div>
    <div class="ics">${[["call", "Call us"], ["wa", "WhatsApp"], ["pin", "Directions"], ["pay", "Pay by UPI"]].map(([k, l]) => `<span>${ic(k)}${l}</span>`).join("")}</div>
    <div class="rv">${ic("star")} Loved your visit? Leave us a Google review</div>
    <div class="ft"><span>Hours, offers, prices &amp; more · <b>no app needed</b></span><span>${esc(c.code)}</span></div>${c.status === "claimed" ? '<span class="live">LIVE</span>' : ""}</div>`;


  // ---------- stamp board (3.5 × 5 in), design F2 ----------
  // 1 CSS px = 1/96 in when printed at 100%, so a board is 336 × 480 px. Boards touch each other on the sheet;
  // the perforation bites sit on the cut line, so one straight cut gives each board its stamp edge.
  const W = 336, H = 480;
  const PAPER = { a4: { w: 8.27, h: 11.69, cols: 2, rows: 2, name: "A4" }, a3: { w: 11.69, h: 16.54, cols: 3, rows: 3, name: "A3" }, "12x18": { w: 12, h: 18, cols: 3, rows: 3, name: "12×18 in" }, "13x19": { w: 13, h: 19, cols: 3, rows: 3, name: "13×19 in" } };
  const grad = (glow, a, b) => `radial-gradient(ellipse 80% 55% at 50% 25%, ${glow} 0%, transparent 70%), linear-gradient(170deg, ${a} 0%, ${b} 100%)`;
  const LIGHT = { ink: "#FFF6EE", pill: "rgba(0,0,0,.2)", stroke: "rgba(255,246,238,.45)", dot: "#FFD84D", tab: "#FFF6EE" };
  const TONES = {
    red: { ...LIGHT, edge: "#8E1424", tabInk: "#8E1424", bg: grad("rgba(255,107,125,.55)", "#C8102E", "#4A0E14") },
    blue: { ...LIGHT, edge: "#0D3F57", tabInk: "#0D3F57", bg: grad("rgba(159,216,236,.5)", "#0E6A8C", "#0A2238") },
    marigold: { ink: "#2A1405", pill: "rgba(255,255,255,.34)", stroke: "rgba(42,20,5,.4)", dot: "#B3121F", tab: "#2A1405", tabInk: "#FFE9B0", edge: "#B4440C", bg: grad("rgba(255,236,150,.85)", "#F59E0B", "#C2410C") },
    green: { ...LIGHT, edge: "#0B4A35", tabInk: "#0B4A35", bg: grad("rgba(155,232,196,.45)", "#108A60", "#0B2E24") },
    jamun: { ...LIGHT, edge: "#3E1A63", tabInk: "#3E1A63", bg: grad("rgba(215,168,255,.5)", "#6D2E9E", "#1E0F33") },
    whitegold: { ink: "#2A1F14", hi: "#9A6B1F", pill: "#F5ECDB", stroke: "#DCC292", dot: "#B8862B", tab: "linear-gradient(160deg,#D9B160 0%,#A9781F 100%)", tabInk: "#FFFDF8", edge: "linear-gradient(160deg,#E2BF6E 0%,#B8862B 50%,#8C6118 100%)", bg: "linear-gradient(180deg,#FFF1D2 0%,#FFFAEE 38%,#FFFDF8 70%)", solid: true }
  };
  // stamp-edge holes as plain circles on the cut line (no masks or patterns, so every PDF viewer and print RIP draws them the same)
  const HOLES = (() => { const r = 5.3, c = (x, y) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, d = [];
    for (let x = 0; x <= W; x += 16) d.push(c(x, 0), c(x, H));
    for (let y = 16; y < H; y += 16) d.push(c(0, y), c(W, y));
    return d.join(""); })();
  const TONE_LIST = ["red", "blue", "marigold", "green", "jamun"]; // "mix" rotates these; whitegold is picked on its own
  const qrH = u => { const x = qrcode(0, "H"); x.addData(u); x.make(); return x.createSvgTag({ cellSize: 3, margin: 0, scalable: true }).replace(/fill="#000000"/g, 'fill="#1A1210"').replace(/fill="#ffffff"/g, 'fill="transparent"'); };
  const STAMP_CSS = `
.ss,.ss *{box-sizing:border-box}
.ss{position:relative;background:#fff;margin:12px auto;page-break-after:always;break-after:page;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ss .grid{position:absolute;display:grid}
.ss .lbl{position:absolute;left:0;right:0;top:10px;text-align:center;font:600 9px Inter,system-ui,sans-serif;color:#9a9a9a}
.ss .cm{position:absolute;background:#000}
.st{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:Inter,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.st .pf{position:absolute;inset:0}
.st .sp{position:absolute;left:8px;top:8px;right:8px;bottom:8px;overflow:hidden}
.st .scan{position:absolute;left:0;right:0;top:44px;text-align:center;font:400 96px/0.8 'Archivo Black','Arial Black',sans-serif;letter-spacing:-2.5px;color:transparent;-webkit-text-stroke-width:1.3px;white-space:nowrap}
.st .top{position:absolute;left:18px;right:18px;top:15px;display:flex;justify-content:space-between;align-items:center}
.st .br b{display:block;font:400 13px/1 'Archivo Black','Arial Black',sans-serif;letter-spacing:-.35px}
.st .br small{display:block;margin-top:2.5px;font:700 6px/1 Inter,sans-serif;letter-spacing:.26em;text-transform:uppercase}
.st .in2{display:flex;align-items:baseline;gap:4px}.st .in2 span:first-child{font:700 9.5px/1 Mukta,sans-serif}.st .in2 span+span{font:700 6.5px/1 Inter,sans-serif;letter-spacing:.22em}
.st .hi{position:absolute;left:0;right:0;top:92px;text-align:center}
.st .hi b{display:block;font:400 50px/1.05 'Rozha One',serif}
.st .hi span{display:block;margin-top:2px;font:600 10px/1.2 Inter,sans-serif}
.st .qw{position:absolute;left:50%;top:197px;margin-left:-88px;width:176px;height:176px;border-radius:16px;background:#F7F1E6;display:grid;place-items:center;box-shadow:0 11px 22px -12px rgba(0,0,0,.6)}
.st .qw svg{width:146px;height:146px;display:block}
.st .tab{position:absolute;left:50%;top:-10px;transform:translateX(-50%);padding:5px 10px;border-radius:999px;font:400 7.5px/1 'Archivo Black',sans-serif;letter-spacing:.2em;white-space:nowrap}
.st .bdg{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-17.5px 0 0 -17.5px;border-radius:8px;border:2.5px solid #F7F1E6;box-sizing:content-box;display:grid;place-items:center;font:400 9.5px/1 'Archivo Black',sans-serif;letter-spacing:-.5px;color:#F7F1E6}
.st .chips{position:absolute;left:12px;right:12px;top:390px;display:flex;gap:5px;justify-content:center}
.st .chips span{display:flex;align-items:center;gap:4px;padding:5px 8px 5px 6px;border-radius:999px;font:700 8px/1 Inter,sans-serif}
.st .chips svg{width:10px;height:10px}
.st .ft{position:absolute;left:18px;right:18px;bottom:11px;display:flex;justify-content:space-between;font:600 7px/1 Inter,sans-serif}
.st .ft span+span{font-family:ui-monospace,Menlo,monospace;letter-spacing:.06em}
@media print{.ss{margin:0}}`;
  const CI = {
    menu: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z"/>',
    offer: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    pay: '<path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8h-1l8 7"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z"/>'
  };
  const ci = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CI[n]}</svg>`;
  const stamp = (c, base, tn) => {
    const t = TONES[tn] || TONES.red;
    return `<div class="st" style="color:${t.ink}">
  ${t.solid ? `<div class="pf" style="background:${t.edge}"><svg width="${W}" height="${H}" style="position:absolute;inset:0;display:block" aria-hidden="true"><path fill="#fff" d="${HOLES}"/></svg></div>` : `<div class="pf" style="background:radial-gradient(circle,#fff 5px,transparent 5.6px) -8px -8px/16px 16px,${t.edge}"></div>`}
  <div class="sp" style="background:${t.bg}">
    <div class="scan" style="-webkit-text-stroke-color:${t.stroke}" aria-hidden="true">SCAN</div>
    <div class="top"><div class="br"><b>GetKeepsake<span style="color:${t.dot}">.</span></b><small>for business</small></div><div class="in2"><span>भारत</span><span>INDIA</span></div></div>
    <div class="hi"><b${t.hi ? ` style="color:${t.hi}"` : ""}>नमस्ते</b><span>Point your camera here for the menu</span></div>
    <div class="qw"${t.solid ? ' style="box-shadow:none;border:1.5px solid #E3CC98"' : ""}><div class="tab" style="background:${t.tab};color:${t.tabInk}">SCAN ME</div>${qrH(base + "/k/" + c.code)}<div class="bdg" style="background:${t.edge}">GK</div></div>
    <div class="chips">${[["menu", "Menu"], ["offer", "Offers"], ["pay", "Pay"], ["star", "Review"]].map(([k, l]) => `<span style="background:${t.pill}">${ci(k)}${l}</span>`).join("")}</div>
    <div class="ft"><span>No app needed · just open your camera</span><span>${esc(c.code)}</span></div>
  </div>
</div>`;
  };
  function renderStamps(out, codes, o) {
    if (!document.getElementById("ks-qrs-css")) { const s = document.createElement("style"); s.id = "ks-qrs-css"; s.textContent = STAMP_CSS; document.head.appendChild(s); }
    const P = PAPER[o.paper] || PAPER.a4, per = P.cols * P.rows, base = o.base || "https://getkeepsake.in";
    const tone = TONES[o.tone] || o.tone === "mix" ? o.tone : "red";
    const pw = Math.round(P.w * 96), ph = Math.round(P.h * 96), gw = P.cols * W, gh = P.rows * H, gx = Math.round((pw - gw) / 2), gy = Math.round((ph - gh) / 2);
    // page size for the browser's print dialog
    let pg = document.getElementById("ks-qrs-page"); if (!pg) { pg = document.createElement("style"); pg.id = "ks-qrs-page"; document.head.appendChild(pg); }
    pg.textContent = `@media print{@page{size:${P.w}in ${P.h}in;margin:0}}`;
    // crop marks: short lines in the margin, in line with every cut, never touching a board
    const marks = []; const L = 18, G = 6;
    for (let i = 0; i <= P.cols; i++) { const x = gx + i * W; marks.push(`<i class="cm" style="left:${x - 0.25}px;top:${gy - G - L}px;width:.5px;height:${L}px"></i><i class="cm" style="left:${x - 0.25}px;top:${gy + gh + G}px;width:.5px;height:${L}px"></i>`); }
    for (let j = 0; j <= P.rows; j++) { const y = gy + j * H; marks.push(`<i class="cm" style="top:${y - 0.25}px;left:${gx - G - L}px;height:.5px;width:${L}px"></i><i class="cm" style="top:${y - 0.25}px;left:${gx + gw + G}px;height:.5px;width:${L}px"></i>`); }
    const H2 = [];
    for (let i = 0, k = 0; i < codes.length; i += per) {
      const pgc = codes.slice(i, i + per);
      const cells = pgc.map(c => stamp(c, base, tone === "mix" ? TONE_LIST[(k++) % TONE_LIST.length] : tone)).join("");
      H2.push(`<div class="ss" style="width:${pw}px;height:${ph}px"><div class="lbl">${esc(o.label || "")} · QR boards ${i + 1}–${i + pgc.length} · 3.5 × 5 in · ${P.name} · print at 100%, cut on the crop marks</div>${marks.join("")}<div class="grid" style="left:${gx}px;top:${gy}px;grid-template-columns:repeat(${P.cols},${W}px);grid-auto-rows:${H}px">${cells}</div></div>`);
    }
    out.innerHTML = H2.join("");
  }

  function render(out, codes, o) {
    o = o || {};
    if (o.size === "stamp") return renderStamps(out, codes, o);
    css(); const st = "", base = o.base || "https://getkeepsake.in", label = o.label || "";
    const H = [];
    if (o.size === "board") {
      for (let i = 0; i < codes.length; i += 4) H.push(`<div class="qs board"><div class="lbl">${esc(label)} · counter boards ${i + 1}–${Math.min(codes.length, i + 4)} · cut on the dashed line</div>${codes.slice(i, i + 4).map(c => board(c, base)).join("")}</div>`);
    } else {
      for (let i = 0; i < codes.length; i += 9) {
        const pg = codes.slice(i, i + 9);
        H.push(`<div class="qs card"><div class="lbl">${esc(label)} · cards ${i + 1}–${i + pg.length}${o.oneSided ? "" : " · FRONT"}</div>${pg.map(c => front(c, base)).join("")}</div>`);
        if (o.oneSided) continue;
        // back sheet: each row mirrored left↔right so it lines up when printed double-sided (flip on long edge)
        const rows = []; for (let r = 0; r < pg.length; r += 3) { const row = pg.slice(r, r + 3); while (row.length < 3) row.push(null); rows.push(row.reverse()); }
        H.push(`<div class="qs card"><div class="lbl">${esc(label)} · cards ${i + 1}–${i + pg.length} · BACK (print on the reverse, flip on long edge)</div>${rows.flat().map(c => c ? back(c, label) : '<div style="width:55mm;height:85mm"></div>').join("")}</div>`);
      }
    }
    out.innerHTML = H.join("");
  }
  // One board on any page (the shops showcase), drawn in a shadow root so the page's own CSS can't reach it.
  const NAMES = { red: "Red", blue: "Blue", marigold: "Orange", green: "Green", jamun: "Purple", whitegold: "White & Gold" };
  function mount(host, o) {
    o = o || {};
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{display:block;width:${W}px;height:${H}px}${STAMP_CSS}</style>` + stamp({ code: o.code || "SAMPLE" }, o.base || "https://getkeepsake.in", TONES[o.tone] ? o.tone : "red");
    if (o.url) { const x = qrcode(0, "H"); x.addData(o.url); x.make(); root.querySelector(".qw svg").outerHTML = x.createSvgTag({ cellSize: 3, margin: 0, scalable: true }).replace(/fill="#000000"/g, 'fill="#1A1210"').replace(/fill="#ffffff"/g, 'fill="transparent"'); }
    return root;
  }
  window.KSQRCards = { render, mount, TONES: TONE_LIST, ALL: Object.keys(NAMES), NAMES, PAPER };
})();
