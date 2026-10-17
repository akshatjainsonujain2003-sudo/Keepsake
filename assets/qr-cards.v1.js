/* GetKeepsake business QR cards: print sheets for blank business QR codes.
   KSQRCards.render(outEl, codes, { size: "card"|"board", label, base })
   card  = 55 × 85 mm wallet card, two-sided (front sheet, then back sheet mirrored for duplex), 9 per A4
   board = A6 counter board 105 × 148 mm, one-sided, 4 per A4
   Needs qrcode-generator (window.qrcode). */
(function () {
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const I = {
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
.qc.fr .glow{position:absolute;width:70mm;height:70mm;left:-8mm;top:-30mm;border-radius:50%;background:radial-gradient(circle,#ff5b2e55,transparent 65%)}
.qc.fr .ey{position:relative;font:800 2mm Inter,sans-serif;letter-spacing:.9mm;color:#ffd84d;text-transform:uppercase}
.qc.fr h3{position:relative;margin:1.6mm 0 0;font:400 5.7mm/0.98 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;text-align:center;letter-spacing:-.15mm}
.qc.fr h3 em,.qc.bd h3 em{font-style:normal;color:#ff5b2e}
.qc.fr .qw{position:relative;margin-top:4mm;width:39mm;height:39mm;background:#fff;border-radius:3mm;padding:3mm}
.qc.fr .qw svg{width:100%;height:100%;display:block}
.qc.fr .qw i{position:absolute;width:5.5mm;height:5.5mm;border:.8mm solid #ff5b2e}
.qc.fr .qw i:nth-child(1){left:-1.6mm;top:-1.6mm;border-right:0;border-bottom:0;border-radius:2mm 0 0 0}
.qc.fr .qw i:nth-child(2){right:-1.6mm;top:-1.6mm;border-left:0;border-bottom:0;border-radius:0 2mm 0 0}
.qc.fr .qw i:nth-child(3){left:-1.6mm;bottom:-1.6mm;border-right:0;border-top:0;border-radius:0 0 0 2mm}
.qc.fr .qw i:nth-child(4){right:-1.6mm;bottom:-1.6mm;border-left:0;border-top:0;border-radius:0 0 2mm 0}
.qc.fr .ics{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;width:100%;margin-top:4.2mm}
.qc.fr .ics span{display:flex;flex-direction:column;align-items:center;gap:.8mm;font:600 1.75mm Inter,sans-serif;color:#d8d2c6}
.qc.fr .ics svg{width:4.2mm;height:4.2mm;color:#ffd84d}
.qc.fr .ft{position:relative;margin-top:auto;font:500 1.6mm Inter,sans-serif;color:#8d877c;letter-spacing:.1mm}
.qc.fr .ft b{color:#fff;font-weight:700}
/* ---------- card back (shop owner) ---------- */
.qc.bk{background:#f4f1ea;color:#121110;padding:5.5mm 4.5mm 4mm;display:flex;flex-direction:column}
.qc.bk .ey{font:800 1.9mm Inter,sans-serif;letter-spacing:.7mm;color:#ff5b2e;text-transform:uppercase}
.qc.bk h4{margin:1.4mm 0 0;font:400 5mm/1 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;letter-spacing:-.1mm}
.qc.bk h4 em{font:400 5.4mm 'Pinyon Script',cursive;text-transform:none;color:#ff5b2e}
.qc.bk ol{list-style:none;margin:3.6mm 0 0;padding:0;display:grid;gap:2.2mm}
.qc.bk li{display:flex;gap:2mm;align-items:flex-start;font:500 2.05mm/1.35 Inter,sans-serif;color:#3b3731}
.qc.bk li b{display:block;font:700 2.2mm Inter,sans-serif;color:#121110}
.qc.bk li i{flex:none;width:4.6mm;height:4.6mm;border-radius:50%;background:#121110;color:#ffd84d;display:grid;place-items:center;font:400 2.2mm 'Archivo Black',sans-serif;font-style:normal}
.qc.bk .for{margin-top:3.2mm;font:600 1.75mm/1.5 Inter,sans-serif;color:#8d877c;letter-spacing:.1mm}
.qc.bk .pr{margin-top:2mm;display:flex;align-items:center;justify-content:space-between;padding:2mm 2.6mm;border-radius:2.4mm;background:#121110;color:#fff}
.qc.bk .pr b{font:400 4.6mm 'Archivo Black',sans-serif}.qc.bk .pr small{font:600 1.7mm Inter,sans-serif;color:#cfc9bd;text-align:right;line-height:1.3}
.qc.bk .no{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #d9d2c3;padding-top:2mm}
.qc.bk .no small{display:block;font:700 1.5mm Inter,sans-serif;letter-spacing:.4mm;color:#8d877c;text-transform:uppercase}
.qc.bk .no b{font:700 2.5mm ui-monospace,Menlo,monospace;letter-spacing:.3mm}
.qc.bk .no span{font:600 1.65mm/1.35 Inter,sans-serif;color:#5b564e;text-align:right}
/* ---------- A6 counter board ---------- */
.qc.bd{width:97mm;height:137mm;border-radius:4mm;background:#121110;color:#fff;display:flex;flex-direction:column;align-items:center;padding:9mm 7mm 6mm}
.qc.bd .glow{position:absolute;width:130mm;height:130mm;left:-30mm;top:-70mm;border-radius:50%;background:radial-gradient(circle,#ff5b2e66,transparent 62%)}
.qc.bd .ey{position:relative;font:800 2.8mm Inter,sans-serif;letter-spacing:1.3mm;color:#ffd84d;text-transform:uppercase}
.qc.bd h3{position:relative;margin:2.4mm 0 0;font:400 8.6mm/0.95 'Archivo Black','Arial Black',sans-serif;text-transform:uppercase;text-align:center;letter-spacing:-.3mm}

.qc.bd .qw{position:relative;margin-top:6mm;width:56mm;height:56mm;background:#fff;border-radius:4.5mm;padding:4.5mm}
.qc.bd .qw svg{width:100%;height:100%;display:block}
.qc.bd .qw i{position:absolute;width:8mm;height:8mm;border:1.1mm solid #ff5b2e}
.qc.bd .qw i:nth-child(1){left:-2.4mm;top:-2.4mm;border-right:0;border-bottom:0;border-radius:3mm 0 0 0}
.qc.bd .qw i:nth-child(2){right:-2.4mm;top:-2.4mm;border-left:0;border-bottom:0;border-radius:0 3mm 0 0}
.qc.bd .qw i:nth-child(3){left:-2.4mm;bottom:-2.4mm;border-right:0;border-top:0;border-radius:0 0 0 3mm}
.qc.bd .qw i:nth-child(4){right:-2.4mm;bottom:-2.4mm;border-left:0;border-top:0;border-radius:0 0 3mm 0}
.qc.bd .ics{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;width:100%;margin-top:6.5mm}
.qc.bd .ics span{display:flex;flex-direction:column;align-items:center;gap:1.4mm;font:600 2.5mm Inter,sans-serif;color:#d8d2c6;text-align:center}
.qc.bd .ics svg{width:6mm;height:6mm;color:#ffd84d}
.qc.bd .rv{position:relative;margin-top:5mm;padding:2mm 4mm;border-radius:5mm;border:.3mm solid #ffffff33;font:600 2.5mm Inter,sans-serif;color:#e9e4d8;display:flex;align-items:center;gap:1.6mm}
.qc.bd .rv svg{width:3mm;height:3mm;color:#ffd84d;fill:#ffd84d}
.qc.bd .ft{position:relative;margin-top:auto;width:100%;display:flex;justify-content:space-between;font:500 2mm Inter,sans-serif;color:#8d877c}
.qc.bd .ft b{color:#fff}
.qc .live{position:absolute;top:2.4mm;right:2.4mm;z-index:3;padding:.5mm 1.6mm;border-radius:2mm;background:#4ade80;color:#0b2a15;font:800 1.8mm Inter,sans-serif;letter-spacing:.2mm}
@media print{.qs{margin:0;padding-top:9mm}.qs .lbl{display:none}.qc{outline-color:#ddd}}
`;
  function css() { if (document.getElementById("ks-qrc-css")) return; const s = document.createElement("style"); s.id = "ks-qrc-css"; s.textContent = CSS; document.head.appendChild(s); }

  const icons = cls => `<div class="ics">${[["menu", "Menu"], ["wa", "Order"], ["pay", "Pay UPI"], ["star", "Review"]].map(([k, l]) => `<span>${ic(k)}${l}</span>`).join("")}</div>`;
  const corners = "<i></i><i></i><i></i><i></i>";
  const front = (c, base) => `<div class="qc fr"><div class="glow"></div><div class="ey">Scan me</div><h3>Menu, offers<br><em>&amp;</em> more</h3><div class="qw">${corners}${qr(base + "/k/" + c.code)}</div>${icons()}<div class="ft">Point your phone camera · <b>no app needed</b></div>${c.status === "claimed" ? '<span class="live">LIVE</span>' : ""}</div>`;
  const back = (c, label) => `<div class="qc bk"><div class="ey">For the shop owner</div><h4>Your shop, <em>online</em><br>in 5 minutes</h4>
    <ol><li><i>1</i><div><b>Scan the front</b>Opens your page setup.</div></li><li><i>2</i><div><b>Add your details</b>Menu, photos, offers, UPI, reviews.</div></li><li><i>3</i><div><b>Pay once, go live</b>Customers scan this card to see it.</div></li></ol>
    <div class="for">Cafés · Salons · Gyms · Boutiques · Clinics · Stores</div>
    <div class="pr"><b>₹499</b><small>one-time<br>no monthly fees</small></div>
    <div class="no"><div><small>Card no.</small><b>${esc(c.code)}</b></div><span>Help: WhatsApp<br>+91 63775 47759</span></div></div>`;
  const board = (c, base) => `<div class="qc bd"><div class="glow"></div><div class="ey">Scan me</div><h3>Menu, offers<br><em>&amp;</em> more</h3><div class="qw">${corners}${qr(base + "/k/" + c.code)}</div>
    <div class="ics">${[["menu", "See the menu"], ["wa", "Order on WhatsApp"], ["pay", "Pay by UPI"], ["ig", "Follow us"]].map(([k, l]) => `<span>${ic(k)}${l}</span>`).join("")}</div>
    <div class="rv">${ic("star")} Loved it? Leave us a Google review</div>
    <div class="ft"><span>Point your phone camera · <b>no app needed</b></span><span>${esc(c.code)}</span></div>${c.status === "claimed" ? '<span class="live">LIVE</span>' : ""}</div>`;

  function render(out, codes, o) {
    css(); o = o || {}; const base = o.base || "https://getkeepsake.in", label = o.label || "";
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
  window.KSQRCards = { render };
})();
