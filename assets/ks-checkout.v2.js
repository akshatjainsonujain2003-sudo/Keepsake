/* Keepsake shared widgets, used by the template studio and the website builder.
   KSCheckout: choose 30 days or Forever, Digital / 5x7 frame with QR / with NFC, what to print, address, pay with Razorpay.
               KSCheckout.offer(): the next-step button on a live keepsake (keep it forever, or get a frame).
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
.ksco .ks-terms{grid-template-columns:1fr 1fr}
.ksco .ks-tag{position:absolute;top:-9px;right:12px;padding:3px 9px;border-radius:999px;background:var(--gold);color:#2a0409;font:700 10.5px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.ksco .ks-opt .ks-was{font-size:13px;color:var(--muted);text-decoration:line-through;margin-left:6px}
.ksco .ks-hint{font-size:13px;color:var(--gold);margin:8px 0 0}
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
    return CATALOG || { products: { card: { name: "Template card", price: 149, price30: 49 }, site: { name: "Website", price: 399, price30: 149 } }, terms: { d30: { name: "30 days", desc: "" }, life: { name: "Forever", desc: "" } }, delivery: { digital: { name: "Digital", price: 0, desc: "" }, frameQr: { name: "5×7 photo frame with QR", price: 599, desc: "" }, frameNfc: { name: "5×7 photo frame with NFC", price: 899, desc: "" } } };
  }

  // opts: { kind: "card"|"site", getId(): string, customer(): {name, phone}|null, onPaid(result) }
  function mount(el, opts) {
    css();
    el.classList.add("ksco");
    el.innerHTML = `<h3 class="ks-title"></h3><p class="ks-note"></p>
<div class="ks-tblock"><div class="ks-step ks-tq">How long should it stay live?</div><div class="ks-opts ks-terms"></div></div>
<div class="ks-dblock"><div class="ks-step">How would you like it?</div><div class="ks-opts ks-deliv"></div><p class="ks-hint" hidden>Photo frames always come with a forever link.</p></div>
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
<p class="ks-fine">Secure payment by Razorpay: UPI, cards, net banking and wallets. By paying you agree to our <a href="/terms" target="_blank" style="color:inherit">Terms</a> and <a href="/refunds" target="_blank" style="color:inherit">Refund policy</a>.</p>`;
    const $ = s => el.querySelector(s);
    const state = { mode: "activate", term: "life", plan: "digital", print: "", photo: "", cat: null, memory: null };
    const status = (t, cls) => { const s = $(".ks-status"); s.textContent = t || ""; s.className = "ks-status" + (cls ? " " + cls : ""); };
    const isFr = p => p === "frameQr" || p === "frameNfc";
    // Mirrors the server's pricing (api/_pay.js amountFor) so the buttons show the right amounts.
    function total(term, plan) {
      const c = state.cat; if (!c) return 0;
      const P = c.products[opts.kind], fr = c.delivery[plan].price;
      if (isFr(plan)) term = "life";
      if (state.mode === "frame") return fr;
      if (state.mode === "extend") return term === "life" ? Math.max(0, P.price - P.price30) + fr : P.price30;
      return (term === "d30" ? P.price30 : P.price) + fr;
    }
    function render() {
      const c = state.cat, m = state.memory, kindWord = opts.kind === "site" ? "website" : "card";
      if (isFr(state.plan)) state.term = "life";
      if (state.mode === "extend" && state.term === "d30") state.plan = "digital";
      const ends = m && m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
      $(".ks-title").textContent = state.mode === "frame" ? "Get it in a 5×7 photo frame" : state.mode === "extend" ? "Keep it forever" : "Your " + kindWord + " is ready";
      $(".ks-note").textContent = state.mode === "frame"
        ? "We'll print a 5×7 photo frame for this keepsake and deliver it. Your link stays the same."
        : state.mode === "extend"
          ? (m && m.expired ? "Its 30 days are over, so the link is paused. Keep it forever, or add 30 more days. Nothing you made is lost." : "It's live until " + ends + ". Make it permanent now, or add 30 more days later.")
          : `Choose how long it stays live, then pay once to switch on its link, QR code and NFC link. You can keep editing it after.`;
      // How long
      $(".ks-tblock").hidden = state.mode === "frame";
      $(".ks-tq").textContent = state.mode === "extend" ? "What would you like?" : "How long should it stay live?";
      const terms = [["life", state.mode === "extend" ? "Keep it forever" : "Forever", c.terms && c.terms.life.desc, "Best value"], ["d30", state.mode === "extend" ? "30 more days" : "30 days", c.terms && c.terms.d30.desc, ""]];
      $(".ks-terms").innerHTML = terms.map(([t, name, desc, tag]) => `<button type="button" class="ks-opt${t === state.term ? " on" : ""}" data-term="${t}">${tag ? `<span class="ks-tag">${tag}</span>` : ""}<b>${esc(name)}</b><span class="ks-pp">${money(total(t, t === "d30" ? "digital" : state.plan))}</span><small>${esc(state.mode === "extend" && t === "life" ? "Pay the difference once and it stays live for good." : desc || "")}</small></button>`).join("");
      // Delivery
      const plans = (state.mode === "frame" ? ["frameQr", "frameNfc"] : ["digital", "frameQr", "frameNfc"]).filter(p => c.delivery[p]);
      if (!plans.includes(state.plan)) state.plan = plans[0];
      $(".ks-dblock").hidden = (state.mode === "extend" && state.term === "d30") || plans.length < 2;
      $(".ks-deliv").style.gridTemplateColumns = plans.length === 2 ? "1fr 1fr" : "";
      $(".ks-deliv").innerHTML = plans.map(p => { const d = c.delivery[p]; const extra = p === "digital" ? "Included" : (state.mode === "frame" ? money(d.price) : "+" + money(d.price)); return `<button type="button" class="ks-opt${p === state.plan ? " on" : ""}" data-plan="${p}"><b>${esc(d.name)}</b><span class="ks-pp">${extra}</span><small>${esc(d.desc || "")}</small></button>`; }).join("");
      $(".ks-hint").hidden = !(isFr(state.plan) && state.mode !== "frame");
      const frame = isFr(state.plan);
      $(".ks-frame").hidden = !frame;
      el.querySelectorAll(".ks-pill").forEach(b => b.classList.toggle("on", b.dataset.print === state.print));
      $(".ks-photo").hidden = state.print !== "photo";
      const img = $(".ks-photo img"); img.hidden = !state.photo; if (state.photo) img.src = state.photo;
      $(".ks-up").firstChild.textContent = state.photo ? "Change photo" : "Upload photo to print";
      const amt = money(total(state.term, state.plan));
      $(".ks-pay").textContent = state.mode === "frame" ? `Pay ${amt} & order frame`
        : state.mode === "extend" ? (state.term === "life" ? `Pay ${amt} & keep it forever` : `Pay ${amt} for 30 more days`)
        : `Pay ${amt} & go live` + (state.term === "d30" ? " for 30 days" : "");
    }

    el.addEventListener("click", e => {
      const o = e.target.closest(".ks-opt");
      if (o && o.dataset.term) { state.term = o.dataset.term; if (state.term === "d30" && isFr(state.plan)) state.plan = "digital"; status(""); render(); return; }
      if (o && o.dataset.plan) { state.plan = o.dataset.plan; status(""); render(); return; }
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
      const body = { action: "create", id, plan: state.plan, term: isFr(state.plan) ? "life" : state.term };
      if (isFr(state.plan)) {
        if (!state.print) { status("Choose what to print in the frame.", "bad"); return; }
        if (state.print === "photo" && !state.photo) { status("Upload the photo you'd like printed.", "bad"); return; }
        body.print = state.print; body.photo = state.photo;
        body.address = {}; el.querySelectorAll("[data-a]").forEach(i => body.address[i.dataset.a] = i.value);
      }
      const btn = $(".ks-pay"); btn.disabled = true; status("Opening secure payment…");
      track("InitiateCheckout", { value: total(state.term, state.plan), currency: "INR" });
      try {
        const o = await post("/api/checkout", body);
        await loadRazorpay();
        const rzp = new Razorpay({
          key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: "Keepsake", description: o.description, prefill: o.prefill, theme: { color: "#42070f" },
          handler: async p => {
            status("Confirming your payment…");
            try { const v = await post("/api/checkout", { action: "verify", ...p }); status(""); track("Purchase", { value: v.amount || 0, currency: "INR", content_type: "product", content_ids: [opts.kind + "-" + (v.term || "life") + "-" + (v.plan || "digital")] }); opts.onPaid && opts.onPaid(v); }
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
      // mode is a hint; the saved keepsake decides: not paid -> activate, on 30 days -> extend, forever -> frame.
      async open(mode) {
        state.cat = await catalog(); status("");
        state.memory = await info(opts.getId());
        const m = state.memory;
        state.mode = !m || !m.paid ? "activate" : m.term === "d30" ? "extend" : "frame";
        if (state.mode === "frame" && !isFr(state.plan)) state.plan = "frameQr";
        if (state.mode !== "frame") state.term = "life";
        const cu = opts.customer && opts.customer();
        if (cu) { const n = el.querySelector('[data-a="name"]'), ph = el.querySelector('[data-a="phone"]'); if (!n.value) n.value = cu.name || ""; if (!ph.value) ph.value = cu.phone || ""; }
        render();
      }
    };
  }

  // The saved keepsake's payment state (owner only). null if it isn't saved yet.
  async function info(id) {
    if (!id) return null;
    try {
      const r = await fetch("/api/customer-memories?id=" + encodeURIComponent(id), { cache: "no-store" }); const j = await r.json();
      if (!r.ok) return null;
      return { paid: j.active !== false || !!j.expired, term: j.term || "life", expiresAt: j.expiresAt || null, expired: !!j.expired };
    } catch (e) { return null; }
  }

  // Next-step button under a live keepsake: "Keep it forever" for 30-day ones, otherwise "Get it in a 5x7 frame".
  async function offer(el, id, onClick) {
    const c = await catalog(), m = await info(id);
    if (!m || !m.paid || c.free || (m.term !== "d30" && !c.delivery.frameQr)) { el.hidden = true; return; }
    el.hidden = false;
    const ends = m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    el.innerHTML = m.term === "d30"
      ? `<p class="ks-offer-note" style="margin:0 0 8px;opacity:.85">${m.expired ? "Its 30 days are over, so the link is paused." : "Live until " + esc(ends) + "."}</p><button type="button" class="btn gold">Keep it forever</button>`
      : `<button type="button" class="btn small ghost">Get it in a 5×7 photo frame (QR or NFC)</button>`;
    el.querySelector("button").onclick = onClick;
  }

  // Facebook pixel events, when the pixel is set up (see /assets/ks-pixel.v1.js).
  const track = (name, data) => { try { if (window.fbq) window.fbq("track", name, data || {}); } catch (e) {} };

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
    if (!(r.status === 401 && j.locked)) return { error: j.error || "Not found.", status: r.status, inactive: !!j.inactive, expired: !!j.expired };
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

  window.KSCheckout = { mount, catalog, offer, info, track };
  window.KSLock = { mount: lock };
  window.KSKeepsake = { fetch: fetchKeepsake, uploadPhoto, esc, money };
})();
