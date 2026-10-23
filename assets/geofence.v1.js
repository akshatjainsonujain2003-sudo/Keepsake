/* GetKeepsake · walk-in reward. On a shop's page, if the shop has a geofence and the customer is inside it,
   a bottom sheet offers the walk-in reward; the code is sent by SMS (or shown here if SMS isn't available).
   KSGeo.mount(rootEl, pageId, { lat, lng, r, offer }, shopName)
   Location is asked only when the customer already allowed it, or after they tap the small "nearby" chip,
   and it is used once for the distance: never stored on this phone or tracked. */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const haversine = (a, b, c, d) => { const R = 6371000, t = x => x * Math.PI / 180, h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); };
  const fmt = m => m < 1000 ? Math.max(5, Math.round(m / 5) * 5) + " m" : (m / 1000).toFixed(1) + " km";
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const CSS = `
.gfx-chip{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:21;display:flex;align-items:center;gap:8px;padding:11px 16px;border:0;border-radius:999px;background:var(--tx,#121110);color:var(--bg,#fff);font:600 14px/1.2 Inter,system-ui,sans-serif;box-shadow:0 12px 30px -12px #000a;cursor:pointer;white-space:nowrap;max-width:calc(100% - 32px)}
.gfx-chip b{font-weight:800}
.gfx-x{border:0;background:none;color:inherit;font-size:18px;line-height:1;padding:0 0 0 4px;cursor:pointer;opacity:.7}
.gfx-sh{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;background:#0000;transition:background .2s}
.gfx-sh.on{background:#0009}
.gfx-b{position:relative;width:min(520px,100%);box-sizing:border-box;padding:24px 20px calc(20px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;background:var(--bg,#fff);color:var(--tx,#121110);font:500 15px/1.45 Inter,system-ui,sans-serif;transform:translateY(100%);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.gfx-sh.on .gfx-b{transform:none}
.gfx-b h2{margin:0 36px 6px 0;font:800 21px/1.25 Inter,system-ui,sans-serif}
.gfx-b p{margin:0 0 14px;opacity:.85}
.gfx-b .gfx-o{display:block;margin:0 0 16px;padding:14px 16px;border-radius:16px;background:var(--ac,#ff5b2e);color:var(--on,#fff);font:800 19px/1.25 Inter,system-ui,sans-serif}
.gfx-b label{display:block;font-weight:600;font-size:13px;margin-bottom:12px}
.gfx-b input[type=tel]{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:13px 14px;border-radius:12px;border:1.5px solid color-mix(in srgb,var(--tx,#121110) 20%,transparent);background:var(--sf,#fff);color:inherit;font:600 17px Inter,system-ui,sans-serif;letter-spacing:.04em}
.gfx-b .gfx-c{display:flex;gap:10px;align-items:flex-start;font-weight:500;font-size:13px;opacity:.85}
.gfx-b .gfx-c input{width:18px;height:18px;margin:1px 0 0;flex:none;accent-color:var(--ac,#ff5b2e)}
.gfx-b .gfx-go{width:100%;padding:15px;border:0;border-radius:999px;background:var(--tx,#121110);color:var(--bg,#fff);font:800 16px Inter,system-ui,sans-serif;cursor:pointer}
.gfx-b .gfx-go:disabled{opacity:.55}
.gfx-b .gfx-e{min-height:20px;margin:10px 0 0;font-size:13.5px;font-weight:600;color:#c0392b}
.gfx-b .gfx-code{display:block;margin:6px 0 14px;padding:16px;border-radius:16px;border:2px dashed var(--ac,#ff5b2e);text-align:center;font:800 30px ui-monospace,Menlo,monospace;letter-spacing:.12em}
.gfx-b .gfx-cl{position:absolute;right:14px;top:14px;width:36px;height:36px;border-radius:50%;border:0;background:color-mix(in srgb,var(--tx,#121110) 8%,transparent);color:inherit;font-size:22px;line-height:1;cursor:pointer}
.gfx-b .gfx-s{display:block;margin:14px auto 0;border:0;background:none;color:inherit;opacity:.6;font:500 12.5px Inter,system-ui,sans-serif;text-decoration:underline;cursor:pointer}
@media (prefers-reduced-motion:reduce){.gfx-sh,.gfx-b{transition:none}}`;

  function mount(root, id, gf, name) {
    if (!gf || !gf.on || !("geolocation" in navigator) || store.get("gfx:" + id)) return;
    if (!document.getElementById("gfx-css")) { const s = document.createElement("style"); s.id = "gfx-css"; s.textContent = CSS; document.head.appendChild(s); }
    const host = root || document.body;
    let chip = null;
    const dismiss = () => { store.set("gfx:" + id, "1"); if (chip) chip.remove(); };
    const toast = t => { if (!chip) return; chip.querySelector("span").textContent = t; };
    const locate = fromTap => navigator.geolocation.getCurrentPosition(pos => {
      const c = pos.coords, d = haversine(gf.lat, gf.lng, c.latitude, c.longitude);
      if (d - Math.min(c.accuracy || 0, 60) <= gf.r) { if (chip) chip.remove(); sheet(Math.round(d), c); }
      else if (fromTap) { toast(`You're ${fmt(d)} away. Come within ${fmt(gf.r)} to unlock it.`); setTimeout(dismiss, 4500); }
    }, () => { if (fromTap) { toast("Turn on location to check the offer."); setTimeout(dismiss, 3500); } }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    const showChip = () => {
      chip = document.createElement("div"); chip.className = "gfx-chip"; chip.setAttribute("role", "button"); chip.tabIndex = 0;
      chip.innerHTML = `<span>📍 Near ${esc(name)}? <b>Check the walk-in offer</b></span><button type="button" class="gfx-x" aria-label="Close">×</button>`;
      chip.onclick = e => { if (e.target.closest(".gfx-x")) { e.stopPropagation(); dismiss(); return; } toast("Checking your location…"); locate(true); };
      chip.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chip.click(); } };
      host.appendChild(chip);
    };
    // Ask for location straight away only if the customer already allowed it; otherwise wait for one tap.
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(s => s.state === "granted" ? locate(false) : s.state === "prompt" ? showChip() : null).catch(showChip);
    else showChip();

    function sheet(dist, coords) {
      const sh = document.createElement("div"); sh.className = "gfx-sh";
      sh.innerHTML = `<div class="gfx-b" role="dialog" aria-modal="true" aria-labelledby="gfx-h"><button type="button" class="gfx-cl" aria-label="Close">×</button>
        <h2 id="gfx-h">📍 You're ${esc(fmt(dist))} from ${esc(name)}!</h2><p>Unlock this right now, just for walking in:</p><span class="gfx-o">${esc(gf.offer)}</span>
        <form novalidate><label>Your mobile number<input type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="10-digit mobile" required></label>
        <label class="gfx-c"><input type="checkbox" checked> <span>Send my code, and offers from ${esc(name)}, by SMS. You can stop them any time.</span></label>
        <button class="gfx-go" type="submit">Unlock my reward</button><div class="gfx-e" role="alert"></div></form>
        <button type="button" class="gfx-s">Stop SMS from ${esc(name)}</button></div>`;
      host.appendChild(sh); requestAnimationFrame(() => sh.classList.add("on"));
      const close = () => { sh.classList.remove("on"); store.set("gfx:" + id, "1"); setTimeout(() => sh.remove(), 250); };
      sh.onclick = e => { if (e.target === sh || e.target.closest(".gfx-cl")) close(); };
      const f = sh.querySelector("form"), tel = f.querySelector("input[type=tel]"), err = f.querySelector(".gfx-e"), btn = f.querySelector(".gfx-go");
      setTimeout(() => tel.focus({ preventScroll: true }), 300);
      sh.querySelector(".gfx-s").onclick = async () => {
        const p = (tel.value || prompt("Your mobile number to stop SMS from " + name) || "").replace(/\D/g, "").slice(-10);
        if (!/^[6-9]\d{9}$/.test(p)) { err.textContent = "Enter your 10-digit mobile number above, then tap Stop SMS."; return; }
        try { await fetch("/api/geofence/optout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone: p }) }); } catch (e) {}
        err.style.color = "inherit"; err.textContent = "Done. You won't get SMS from " + name + ".";
      };
      f.onsubmit = async e => {
        e.preventDefault(); err.style.color = ""; err.textContent = "";
        const p = tel.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
        if (!/^[6-9]\d{9}$/.test(p)) { err.textContent = "Enter a valid 10-digit mobile number."; tel.focus(); return; }
        if (!f.querySelector(".gfx-c input").checked) { err.textContent = "Tick the box so we can send your code."; return; }
        btn.disabled = true; btn.textContent = "Unlocking…";
        try {
          const r = await fetch("/api/geofence/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone: p, lat: coords.latitude, lng: coords.longitude, acc: Math.round(coords.accuracy || 0), consent: true }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || "Couldn't unlock it. Please try again.");
          const b = sh.querySelector(".gfx-b");
          b.innerHTML = `<button type="button" class="gfx-cl" aria-label="Close">×</button><h2>Unlocked! 🎉</h2><span class="gfx-o">${esc(j.offer || gf.offer)}</span>` +
            (j.again ? `<p>${esc(j.message)}</p>` : j.sms ? `<p>Your code is on its way by SMS to <b>${esc(j.masked)}</b>. Show it at the counter.</p>` : `<p>Show this code at the counter:</p><span class="gfx-code">${esc(j.code)}</span>`) +
            `<button type="button" class="gfx-go">Done</button>`;
          b.querySelector(".gfx-go").onclick = close;
          store.set("gfx:" + id, "1");
        } catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = "Unlock my reward"; }
      };
    }
  }
  window.KSGeo = { mount, haversine };
})();
