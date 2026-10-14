/* Keepsake shared widgets, used by the template studio and the website builder.
   KSCheckout: activate a keepsake with Razorpay (photo frames only when the catalog offers them).
   Files in /assets are cached for a year: this replaced ks-checkout.v1.js; rename again when editing.
   KSLock:     optional password field for a card or website.
   KSUnlock:   password screen shown to people who scan or tap a locked keepsake.
   Files in /assets are cached for a year, so change the file name (v2, v3…) when editing this file. */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const json = async (url, opt) => { const r = await fetch(url, opt); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || "Something went wrong."), { status: r.status, body: j }); return j; };
  const post = (url, body) => json(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function css() {
    if (document.getElementById("ks-widgets-css")) return;
    const st = document.createElement("style"); st.id = "ks-widgets-css";
    st.textContent = `
.ksco{--ink:#f8f0df;--muted:#c9b99a;--line:#6b3a35;--gold:#e4c680;--field:#1a0206;color:var(--ink);font-family:inherit}
.ksco h3{margin:0 0 6px}.ksco .ks-note,.ksco .ks-fine{color:var(--muted)}.ksco .ks-fine{font-size:.85em;margin:10px 0 0}
.ksco .ks-step{margin:18px 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.ksco .ks-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ksco .ks-opt{position:relative;display:flex;flex-direction:column;gap:4px;padding:14px;border:1px solid var(--line);border-radius:16px;cursor:pointer;background:#ffffff08;text-align:left;color:var(--ink);font:inherit}
.ksco .ks-opt.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.ksco .ks-opt b{font-size:15px}.ksco .ks-opt .ks-pp{font:500 26px/1.1 Georgia,serif;color:var(--gold)}.ksco .ks-opt small{color:var(--muted);font-size:12.5px;line-height:1.4}
.ksco .ks-pills{display:flex;gap:8px;flex-wrap:wrap}
.ksco .ks-pill{padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;cursor:pointer}
.ksco .ks-pill.on{background:var(--gold);color:#2a0409;border-color:var(--gold);font-weight:600}
.ksco .ks-photo{display:flex;gap:12px;align-items:center;margin-top:10px}
.ksco .ks-photo img{width:72px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
.ksco .ks-up{display:inline-block;padding:10px 16px;border-radius:999px;border:1px dashed var(--gold);color:var(--gold);cursor:pointer}
.ksco .ks-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}.ksco .ks-grid .ks-wide{grid-column:1/-1}
.ksco label.ks-f{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
.ksco input.ks-in{font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--field);color:var(--ink);width:100%;box-sizing:border-box}
.ksco .ks-pay{width:100%;margin-top:16px;padding:15px;border:0;border-radius:999px;background:linear-gradient(135deg,#e8cf8e,#b88a3e);color:#2a0409;font:700 16px/1 inherit;font-family:inherit;cursor:pointer}
.ksco .ks-pay:disabled{opacity:.6;cursor:wait}
.ksco .ks-status{min-height:1.3em;margin-top:10px;font-size:14px}.ksco .ks-status.bad{color:#ff9aa8}.ksco .ks-status.ok{color:#9ad8b0}
.ksco [hidden]{display:none!important}
@media(max-width:620px){.ksco .ks-opts,.ksco .ks-grid{grid-template-columns:1fr}}
.kslock{display:flex;flex-direction:column;gap:8px}.kslock .kl-row{display:flex;gap:10px;align-items:center;cursor:pointer}
.kslock input[type=checkbox]{width:20px;height:20px;accent-color:#d6b06a}
.kslock .kl-hint{font-size:13px;opacity:.8}
.ksun{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#5a0f17,#1b0306 70%);color:#f8f0df;font-family:system-ui,sans-serif}
.ksun .ku-box{width:min(380px,100%);text-align:center}
.ksun .ku-mark{font:italic 44px/1 Georgia,serif;color:#e4c680;margin-bottom:6px}
.ksun h1{font:400 26px/1.25 Georgia,serif;margin:18px 0 6px}.ksun p{opacity:.8;margin:0 0 20px;text-wrap:balance}
.ksun input{width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid #6b3a35;background:#1a0206;color:#f8f0df;font-size:17px;text-align:center}
.ksun button{width:100%;margin-top:10px;padding:15px;border:0;border-radius:999px;background:#d6b06a;color:#2a0409;font-weight:700;font-size:16px;cursor:pointer}
.ksun .ku-msg{min-height:1.3em;margin-top:12px;color:#ff9aa8;font-size:14px}`;
    document.head.appendChild(st);
  }

  // Shrinks a photo in the browser before upload. Print photos keep more detail.
  function shrink(file, maxSide, quality) {
    return new Promise((ok, no) => {
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, maxSide / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", quality)); }; im.onerror = () => no(new Error("That photo format isn't supported. Try a JPG or PNG.")); im.src = fr.result; };
      fr.onerror = () => no(new Error("Could not read that photo.")); fr.readAsDataURL(file);
    });
  }
  async function uploadPhoto(file, purpose) {
    const steps = purpose === "print" ? [[2400, .86], [2000, .82], [1700, .78]] : [[1400, .8], [1000, .76], [760, .68]];
    const limit = (purpose === "print" ? 690 : 340) * 1024 * 4 / 3;
    let data = "";
    for (const [side, q] of steps) { data = await shrink(file, side, q); if (data.length < limit) break; }
    const j = await post("/api/img", { data, purpose });
    return j.url;
  }

  function loadRazorpay() {
    return window.Razorpay ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "https://checkout.razorpay.com/v1/checkout.js"; sc.onload = ok; sc.onerror = () => no(new Error("Could not load the payment window. Check your connection and try again.")); document.head.appendChild(sc); });
  }

  let CATALOG = null;
  async function catalog() {
    if (CATALOG) return CATALOG;
    try { CATALOG = await json("/api/checkout", { cache: "no-store" }); } catch (e) { CATALOG = null; }
    return CATALOG || { products: { card: { name: "Template", price: 99 }, site: { name: "Custom website", price: 299 } }, delivery: { digital: { name: "Digital", price: 0, desc: "" } }, frames: false };
  }

  // opts: { kind: "card"|"site", getId(): string, customer(): {name, phone}|null, onPaid(result) }
  function mount(el, opts) {
    css();
    el.classList.add("ksco");
    el.innerHTML = `<h3 class="ks-title"></h3><p class="ks-note"></p>
<div class="ks-step ks-dq">How would you like it?</div><div class="ks-opts"></div>
<div class="ks-frame" hidden>
 <div class="ks-step">What should we print in the frame?</div>
 <div class="ks-pills"><button type="button" class="ks-pill" data-print="photo">My photo</button><button type="button" class="ks-pill" data-print="design">My card design</button></div>
 <div class="ks-photo" hidden><img alt="" hidden><label class="ks-up">Upload photo to print<input type="file" accept="image/*" hidden></label></div>
 <div class="ks-step">Deliver to</div>
 <div class="ks-grid">
  <label class="ks-f">Name<input class="ks-in" data-a="name" autocomplete="name" maxlength="80"></label>
  <label class="ks-f">Mobile number<input class="ks-in" data-a="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14"></label>
  <label class="ks-f ks-wide">House, street, area<input class="ks-in" data-a="line1" autocomplete="address-line1" maxlength="120"></label>
  <label class="ks-f ks-wide">Landmark (optional)<input class="ks-in" data-a="line2" autocomplete="address-line2" maxlength="120"></label>
  <label class="ks-f">City<input class="ks-in" data-a="city" autocomplete="address-level2" maxlength="60"></label>
  <label class="ks-f">State<input class="ks-in" data-a="state" autocomplete="address-level1" maxlength="60"></label>
  <label class="ks-f">PIN code<input class="ks-in" data-a="pincode" inputmode="numeric" autocomplete="postal-code" maxlength="6"></label>
 </div>
</div>
<button type="button" class="ks-pay">Pay</button><div class="ks-status" role="status"></div>
<p class="ks-fine">Secure payment by Razorpay: UPI, cards, net banking and wallets.</p>`;
    const $ = s => el.querySelector(s);
    const state = { mode: "activate", plan: "digital", print: "", photo: "", cat: null };
    const status = (t, cls) => { const s = $(".ks-status"); s.textContent = t || ""; s.className = "ks-status" + (cls ? " " + cls : ""); };
    const total = plan => { const c = state.cat; if (!c) return 0; const base = state.mode === "upgrade" ? 0 : c.products[opts.kind].price; return base + c.delivery[plan].price; };

    function render() {
      const c = state.cat, prod = c.products[opts.kind];
      $(".ks-title").textContent = state.mode === "upgrade" ? "Get it in a photo frame" : "Activate your " + (opts.kind === "site" ? "website" : "keepsake");
      $(".ks-note").textContent = state.mode === "upgrade"
        ? "We'll print a photo frame for this keepsake and deliver it to you. Your link stays the same."
        : `Your ${opts.kind === "site" ? "website" : "card"} is saved. Pay once to switch on its link, QR code and NFC link. It stays live for good, and you can keep editing it.`;
      const plans = (state.mode === "upgrade" ? ["frameQr", "frameNfc"] : ["digital", "frameQr", "frameNfc"]).filter(p => c.delivery[p]);
      $(".ks-opts").hidden = $(".ks-dq").hidden = plans.length < 2;
      if (!plans.includes(state.plan)) state.plan = plans[0];
      $(".ks-opts").style.gridTemplateColumns = plans.length === 2 ? "1fr 1fr" : "";
      $(".ks-opts").innerHTML = plans.map(p => { const d = c.delivery[p]; return `<button type="button" class="ks-opt${p === state.plan ? " on" : ""}" data-plan="${p}"><b>${esc(p === "digital" ? prod.name + " · Digital" : d.name)}</b><span class="ks-pp">${money(total(p))}</span><small>${esc(d.desc || "")}</small></button>`; }).join("");
      const frame = state.plan !== "digital";
      $(".ks-frame").hidden = !frame;
      el.querySelectorAll(".ks-pill").forEach(b => b.classList.toggle("on", b.dataset.print === state.print));
      $(".ks-photo").hidden = state.print !== "photo";
      const img = $(".ks-photo img"); img.hidden = !state.photo; if (state.photo) img.src = state.photo;
      $(".ks-up").firstChild.textContent = state.photo ? "Change photo" : "Upload photo to print";
      $(".ks-pay").textContent = "Pay " + money(total(state.plan)) + (state.mode === "upgrade" ? " & order frame" : " & activate");
    }

    el.addEventListener("click", e => {
      const o = e.target.closest(".ks-opt"); if (o) { state.plan = o.dataset.plan; status(""); render(); return; }
      const p = e.target.closest(".ks-pill"); if (p) { state.print = p.dataset.print; status(""); render(); }
    });
    $(".ks-photo input").addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
      status("Uploading your photo…");
      try { state.photo = await uploadPhoto(f, "print"); status("Photo ready to print ♡", "ok"); render(); } catch (x) { status(x.message, "bad"); }
    });
    $(".ks-pay").addEventListener("click", pay);

    async function pay() {
      const id = opts.getId(); if (!id) { status("Save first ♡", "bad"); return; }
      const body = { action: "create", id, plan: state.plan };
      if (state.plan !== "digital") {
        if (!state.print) { status("Choose what to print in the frame.", "bad"); return; }
        if (state.print === "photo" && !state.photo) { status("Upload the photo you'd like printed.", "bad"); return; }
        body.print = state.print; body.photo = state.photo;
        body.address = {}; el.querySelectorAll("[data-a]").forEach(i => body.address[i.dataset.a] = i.value);
      }
      const btn = $(".ks-pay"); btn.disabled = true; status("Opening secure payment…");
      try {
        const o = await post("/api/checkout", body);
        await loadRazorpay();
        const rzp = new Razorpay({
          key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: "Keepsake", description: o.description, prefill: o.prefill, theme: { color: "#42070f" },
          handler: async p => {
            status("Confirming your payment…");
            try { const v = await post("/api/checkout", { action: "verify", ...p }); status(""); opts.onPaid && opts.onPaid(v); }
            catch (x) { status((x.message || "Could not confirm the payment.") + " If money was taken, it will switch on within a few minutes; check My memories.", "bad"); }
            finally { btn.disabled = false; }
          },
          modal: { ondismiss: () => { btn.disabled = false; if (!el.hidden) status("Payment window closed. You can try again any time.", "bad"); } }
        });
        rzp.on("payment.failed", e => status((e && e.error && e.error.description) || "Payment failed. Please try again.", "bad"));
        rzp.open();
      } catch (x) { btn.disabled = false; status(x.message, "bad"); }
    }

    return {
      async open(mode) {
        state.mode = mode === "upgrade" ? "upgrade" : "activate";
        if (state.mode === "upgrade" && state.plan === "digital") state.plan = "frameQr";
        state.cat = await catalog(); status("");
        const cu = opts.customer && opts.customer();
        if (cu) { const n = el.querySelector('[data-a="name"]'), ph = el.querySelector('[data-a="phone"]'); if (!n.value) n.value = cu.name || ""; if (!ph.value) ph.value = cu.phone || ""; }
        render();
      }
    };
  }

  // Password field. value(): undefined = leave as is, false = remove, "text" = set new password.
  function lock(el) {
    css();
    el.classList.add("kslock");
    el.innerHTML = `<label class="kl-row"><input type="checkbox" class="kl-on"> Ask for a password before it opens</label><input class="kl-pw" type="text" maxlength="64" autocomplete="off" placeholder="Choose a password (4+ characters)" hidden><div class="kl-hint"></div>`;
    const on = el.querySelector(".kl-on"), pw = el.querySelector(".kl-pw"), hint = el.querySelector(".kl-hint");
    let saved = false;
    const sync = () => { pw.hidden = !on.checked; hint.textContent = on.checked ? (saved ? "A password is set. Type a new one only if you want to change it." : "Anyone who scans or taps will need this password. Share it only with them.") : (saved ? "The password will be removed when you save." : "Optional. Without a password, anyone with the link can open it."); };
    on.addEventListener("change", sync); sync();
    return {
      set(isLocked) { saved = !!isLocked; on.checked = saved; pw.value = ""; sync(); },
      value() { if (!on.checked) return saved ? false : undefined; const v = pw.value.trim(); return v || (saved ? undefined : ""); },
      check() { if (on.checked && !saved && pw.value.trim().length < 4) return "Choose a password with at least 4 characters, or untick the password option."; if (on.checked && pw.value && pw.value.trim().length < 4) return "Password must be at least 4 characters."; return ""; },
      saved(isLocked) { this.set(isLocked); }
    };
  }

  // Full-screen password prompt for people opening a locked keepsake. onTry(pw) resolves true when it worked.
  function unlock({ kind, onTry }) {
    css();
    const w = document.createElement("div"); w.className = "ksun";
    w.innerHTML = `<form class="ku-box"><div class="ku-mark">Keepsake</div><h1>This ${kind === "site" ? "page" : "keepsake"} is private</h1><p>Enter the password you were given to open it.</p><input type="password" autocomplete="off" aria-label="Password" required><button type="submit">Open</button><div class="ku-msg" role="alert"></div></form>`;
    document.body.appendChild(w);
    const f = w.querySelector("form"), i = w.querySelector("input"), m = w.querySelector(".ku-msg"), b = w.querySelector("button");
    setTimeout(() => i.focus(), 50);
    f.addEventListener("submit", async e => {
      e.preventDefault(); m.textContent = ""; b.disabled = true; b.textContent = "Opening…";
      try { const r = await onTry(i.value); if (r === true) { w.remove(); return; } m.textContent = r || "That password isn't right."; i.select(); }
      catch (x) { m.textContent = x.message || "Could not open it. Try again."; }
      finally { b.disabled = false; b.textContent = "Open"; }
    });
    return w;
  }

  // Loads a public keepsake, asking for a password if it's locked. Resolves with the API response.
  async function fetchKeepsake(id) {
    const key = "ks-pw-" + id;
    const get = pw => fetch("/api/customer-memories?id=" + encodeURIComponent(id), { cache: "no-store", headers: pw ? { "x-card-password": pw } : {} });
    let saved = ""; try { saved = sessionStorage.getItem(key) || ""; } catch (e) {}
    let r = await get(saved), j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    if (!(r.status === 401 && j.locked)) return { error: j.error || "Not found.", status: r.status, inactive: !!j.inactive };
    return new Promise(done => {
      unlock({
        kind: j.kind, onTry: async pw => {
          const r2 = await get(pw), j2 = await r2.json().catch(() => ({}));
          if (r2.ok) { try { sessionStorage.setItem(key, pw); } catch (e) {} done(j2); return true; }
          return j2.error;
        }
      });
    });
  }

  window.KSCheckout = { mount, catalog };
  window.KSLock = { mount: lock };
  window.KSKeepsake = { fetch: fetchKeepsake, uploadPhoto, esc, money };
})();
