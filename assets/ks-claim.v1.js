/* Prepaid QR codes: someone scanned a Keepsake card bought in a shop (getkeepsake.in/k/CODE).
   KSClaim.init({kind, before})  -> remembers the code (also across logging in), shows a banner, resolves to {code, tier} or null
   KSClaim.panel(el, {code, getId, onDone}) -> "enter your PIN" box shown after saving, instead of payment
   Files in /assets are cached for a year: rename to v2 when editing. */
(function () {
  const KEY = "ks-claim";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
  function css() {
    if (document.getElementById("ks-claim-css")) return;
    const s = document.createElement("style"); s.id = "ks-claim-css";
    s.textContent = `.kscl{margin:14px auto;max-width:1100px;padding:12px 18px;border-radius:14px;background:linear-gradient(135deg,#e8cf8e,#b88a3e);border:0;color:#2a0409;font-weight:500;font:15px/1.5 system-ui,-apple-system,"DM Sans",sans-serif;display:flex;gap:12px;align-items:flex-start;box-shadow:0 10px 30px #0003}
.kscl b{color:#2a0409;font-weight:700}.kscl a{color:#2a0409;font-weight:700}.kscl .i{font-size:22px;line-height:1}.kscl.bad{background:#2a0409;border:1px solid #ff9aa888;color:#f8f0df}.kscl.bad a{color:#e4c680}
.ksclp{padding:20px;border-radius:20px;background:#2a0409;border:1px solid #e4c68088;color:#f8f0df;font:15px/1.5 system-ui,-apple-system,"DM Sans",sans-serif}
.ksclp h3{margin:0 0 6px;font:500 26px/1.15 Georgia,serif;color:#e4c680}.ksclp p{margin:0 0 12px;color:#e2d0b4}
.ksclp .row{display:flex;gap:10px}.ksclp input{flex:1;min-width:0;font-size:22px;letter-spacing:.3em;text-align:center;padding:12px;border-radius:12px;border:1px solid #6b3a35;background:#1a0206;color:#f8f0df}
.ksclp button{padding:12px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#e8cf8e,#b88a3e);color:#2a0409;font-weight:700;font-size:16px;cursor:pointer}.ksclp button:disabled{opacity:.6}
.ksclp .st{min-height:1.4em;margin-top:10px;font-size:14px}.ksclp .st.bad{color:#ff9aa8}.ksclp .st.ok{color:#9ad8b0}`;
    document.head.appendChild(s);
  }
  function banner(before, html, bad) {
    if (!before) return; css();
    const old = document.getElementById("ksClaimBanner"); if (old) old.remove();
    const d = document.createElement("div"); d.id = "ksClaimBanner"; d.className = "kscl" + (bad ? " bad" : ""); d.setAttribute("role", "status");
    d.innerHTML = `<span class="i">${bad ? "⚠️" : "🎁"}</span><div>${html}</div>`;
    before.parentNode.insertBefore(d, before);
  }
  async function init(opts) {
    const u = new URL(location.href); let code = (u.searchParams.get("claim") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code) { try { localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })); } catch (e) {} u.searchParams.delete("claim"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
    else { try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && Date.now() - r.at < 14 * 864e5) code = r.code; } catch (e) {} }
    if (!code) return null;
    let info = null;
    try { const r = await fetch("/api/qr?info=1&code=" + encodeURIComponent(code), { cache: "no-store" }); if (r.ok) info = await r.json(); } catch (e) {}
    if (!info) { clear(); banner(opts.before, "That Keepsake code isn't valid. Please check your card, or WhatsApp us on <a href=\"https://wa.me/916377547759\">+91 63775 47759</a>.", true); return null; }
    if (info.status !== "new") { clear(); banner(opts.before, "This prepaid code has already been used. If that wasn't you, WhatsApp us on <a href=\"https://wa.me/916377547759\">+91 63775 47759</a>.", true); return null; }
    if (info.tier === "card" && opts.kind === "site") { banner(opts.before, "Your prepaid code is for a <b>memory card</b>. <a href=\"/studio\">Make your card here →</a>"); return null; }
    const what = opts.kind === "site" ? "website" : "card";
    banner(opts.before, `Retail Keepsake Box <b>#${esc(info.code)}</b> detected! Your ${info.tier === "site" ? "VIP website" : "digital card"} is prepaid. Design your memories below, then tap Save and enter the 4-digit PIN from inside your box. <b>No payment needed.</b>` + (info.tier === "site" && opts.kind === "site" ? ` <span style="opacity:.8">(Prefer a simple card? <a href="/studio">Use it for a card instead</a>.)</span>` : ""));
    return { code: info.code, tier: info.tier };
  }
  function panel(el, o) {
    css(); el.hidden = false; el.innerHTML = `<div class="ksclp"><h3>Activate with your prepaid code</h3><p>Enter the 4-digit PIN printed inside your Keepsake pack. Your ${"keepsake"} goes live straight away. No payment needed.</p><div class="row"><input inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="••••" aria-label="4-digit PIN"><button type="button">Activate</button></div><div class="st" role="status"></div><p style="margin:10px 0 0;font-size:13px;opacity:.75">Code ${esc(o.code)} · Lost your PIN? WhatsApp <a style="color:#e4c680" href="https://wa.me/916377547759">+91 63775 47759</a></p></div>`;
    const inp = el.querySelector("input"), btn = el.querySelector("button"), st = el.querySelector(".st");
    const go = async () => {
      const pin = inp.value.replace(/\D/g, ""); if (pin.length !== 4) { st.textContent = "Enter the 4 digits from your pack."; st.className = "st bad"; return; }
      btn.disabled = true; st.textContent = "Activating…"; st.className = "st";
      try {
        const r = await fetch("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: o.code, pin, id: o.getId() }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Could not activate. Please try again.");
        clear(); st.textContent = "Activated ♡"; st.className = "st ok"; o.onDone && o.onDone(j.url);
      } catch (e) { st.textContent = e.message; st.className = "st bad"; } finally { btn.disabled = false; }
    };
    btn.onclick = go; inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => inp.focus(), 400);
  }
  window.KSClaim = { init, panel, clear };
})();
