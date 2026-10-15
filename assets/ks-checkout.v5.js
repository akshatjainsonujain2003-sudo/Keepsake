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
.kslock .kl-opts{display:flex;flex-direction:column;gap:8px}
.kslock .kl-opts input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:12px;border:1px solid #c9a45a88;background:#ffffff12;color:inherit;font:inherit;font-size:15px}.kslock .kl-opts input::placeholder{color:inherit;opacity:.55}
.kslock .kl-style{display:flex;gap:8px;flex-wrap:wrap}
.kslock .kl-style button{flex:1 1 auto;padding:9px 12px;border-radius:999px;border:1px solid #6b3a35;background:transparent;color:inherit;font:inherit;font-size:14px;cursor:pointer}
.kslock .kl-style button.on{background:#d6b06a;color:#2a0409;border-color:#d6b06a;font-weight:600}
.kslock .kl-prev{align-self:flex-start;background:none;border:0;padding:2px 0;color:#d6b06a;text-decoration:underline;font:inherit;font-size:14px;cursor:pointer}
.kslk{--lil:#c8b5f3;--lil2:#8a6fdc;--but:#fff2b8;--cream:#fffbea;position:fixed;inset:0;z-index:9999;overflow:auto;background:repeating-linear-gradient(90deg,var(--lil) 0 42px,var(--but) 42px 84px);font-family:system-ui,sans-serif;color:var(--lil2);display:grid;place-items:center;padding:20px 16px 30px;transition:transform .9s cubic-bezier(.7,0,.2,1) .35s}
.kslk.lk-ok{transform:translateY(-105%)}
.kslk .lk-in{position:relative;width:min(760px,100%);display:grid;grid-template-columns:1fr;gap:6px;justify-items:center}
.kslk .lk-title{position:relative;text-align:center;line-height:.9;margin-top:6px}
.kslk .lk-big{display:block;font:400 clamp(58px,16vw,112px)/.95 "DM Serif Display",Georgia,serif;color:var(--lil2);letter-spacing:-.02em;text-shadow:0 3px 0 #fff8}
.kslk .lk-script{display:block;margin-top:-.32em;font:400 clamp(36px,10vw,68px)/1 "Great Vibes",cursive;color:#fff;text-shadow:0 2px 8px #8a6fdc99,0 0 2px #8a6fdc}
.kslk .lk-pic{position:relative;width:min(120px,32vw);margin:14px 0 -34px;z-index:2}
.kslk .lk-ring{aspect-ratio:1;border-radius:50%;background:var(--cream);display:grid;place-items:center;box-shadow:0 0 0 7px var(--lil2),0 0 0 11px var(--cream),0 0 0 15px var(--lil2),0 10px 24px #6a4fc455}
.kslk .lk-ring svg{width:62%}
@media (prefers-reduced-motion:no-preference){.kslk .lk-ring svg{animation:lkbeat 1.4s ease-in-out infinite}}
@keyframes lkbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(1)}45%{transform:scale(1.08)}}
.kslk .lk-hat{position:absolute;width:44%;right:-22%;top:-14%;transform:rotate(22deg);filter:drop-shadow(0 6px 6px #0003)}
.kslk .lk-card{position:relative;width:min(340px,100%);background:var(--cream);padding:46px 20px 16px;text-align:center;border-radius:26px;
  box-shadow:0 0 0 3px var(--lil2),0 0 0 9px var(--cream),0 0 0 12px var(--lil2),0 18px 40px #6a4fc455}
.kslk .lk-label{font:600 18px/1.2 system-ui,sans-serif;color:var(--lil2)}
.kslk .lk-hintx{margin-top:6px;font:italic 15px/1.35 Georgia,serif;color:#7a64c2}
.kslk .lk-dots{display:flex;justify-content:center;gap:10px;margin:12px 0 14px}
.kslk .lk-dots i{width:42px;height:42px;border-radius:9px;background:#e6dcfb;display:grid;place-items:center;font:700 20px/1 system-ui;color:#fff;font-style:normal;transition:background .2s,transform .2s}
.kslk .lk-dots i.on{background:var(--lil2);transform:scale(1.06)}
.kslk .lk-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:9px 16px;max-width:228px;margin:0 auto}
.kslk .lk-k{aspect-ratio:1;border-radius:50%;border:0;background:#f3edff;color:var(--lil2);font:400 30px/1 "DM Serif Display",Georgia,serif;cursor:pointer;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:5px;box-shadow:inset 0 -3px 0 #d9ccfa;transition:transform .12s,background .15s}
.kslk .lk-k:focus-visible,.kslk .lk-enter:focus-visible{outline:3px solid #ff8fb1;outline-offset:2px}
.kslk .lk-k:active{transform:scale(.92);background:#e3d8ff}
.kslk .lk-k.lk-deco{color:#ff8fb1;text-decoration:none;cursor:default;background:transparent;box-shadow:none}
.kslk .lk-word{width:100%;box-sizing:border-box;margin:16px 0 4px;padding:14px;border-radius:14px;border:2px solid var(--lil2);background:#fff;font-size:18px;text-align:center;color:#3b2a74}
.kslk .lk-enter{margin-top:12px;padding:8px 34px;border-radius:999px;border:2px solid var(--lil2);background:transparent;color:var(--lil2);font:400 26px/1 "DM Serif Display",Georgia,serif;cursor:pointer}
.kslk .lk-enter:hover{background:#f3edff}
.kslk .lk-msg{min-height:1.3em;margin-top:10px;font-size:14px;color:#d1336b}
.kslk .lk-close{margin-top:4px;background:none;border:0;color:#7a64c2;text-decoration:underline;font-size:14px;cursor:pointer}
.kslk .lk-shake{animation:lkshake .45s}
@keyframes lkshake{20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}
.kslk .lk-burst{position:fixed;left:50%;top:55%;pointer-events:none}
.kslk .lk-burst i{position:absolute;font-style:normal;font-size:26px;animation:lkfly 1.1s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes lkfly{from{transform:translate(0,0) scale(.3);opacity:1}to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1.2);opacity:0}}
@media(min-width:760px){.kslk .lk-in{grid-template-columns:1fr 1fr;align-items:center;column-gap:30px}.kslk .lk-title{grid-column:1/-1}.kslk .lk-pic{width:210px;margin:0;justify-self:end;margin-right:30px}.kslk .lk-card{justify-self:start;padding-top:26px;margin-top:22px}}
@media(max-height:700px) and (max-width:759px){.kslk .lk-pic{display:none}.kslk .lk-card{padding-top:20px}}
@media (prefers-reduced-motion:reduce){.kslk,.kslk *{animation:none!important;transition:none!important}}
.ksun{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#5a0f17,#1b0306 70%);color:#f8f0df;font-family:system-ui,sans-serif}
.ksun .ku-box{width:min(380px,100%);text-align:center}
.ksun .ku-mark{font:italic 44px/1 Georgia,serif;color:#e4c680;margin-bottom:6px}
.ksun h1{font:400 26px/1.25 Georgia,serif;margin:18px 0 6px}.ksun p{opacity:.8;margin:0 0 20px;text-wrap:balance}
.ksun input{width:100%;box-sizing:border-box;padding:15px 16px;border-radius:14px;border:1px solid #6b3a35;background:#1a0206;color:#f8f0df;font-size:17px;text-align:center}
.ksun button{width:100%;margin-top:10px;padding:15px;border:0;border-radius:999px;background:#d6b06a;color:#2a0409;font-weight:700;font-size:16px;cursor:pointer}
.ksun .ku-msg{min-height:1.3em;margin-top:12px;color:#ff9aa8;font-size:14px}
.ksco .ks-code{margin-top:14px;font-size:14px}.ksco .ks-code button.ks-link{color:var(--gold,#e4c680);background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:underline}
.ksco .ks-crow{display:flex;gap:8px;margin-top:8px}.ksco .ks-crow input{flex:1;min-width:0;text-transform:uppercase;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid #6b3a35;background:#1a0206;color:#f8f0df}
.ksco .ks-crow button{padding:0 18px;border-radius:12px;border:1px solid #e4c680;background:transparent;color:#e4c680;font:inherit;cursor:pointer}
.ksco .ks-on{color:#9ad8b0}.ksco .ks-was{font-size:13px;opacity:.7;text-decoration:line-through;margin-left:6px}
.ksco [hidden]{display:none!important}`;
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

  // Creator codes: ks-ref.v1.js saves ?ref=CODE from the link someone clicked; it is applied here at checkout.
  const REF_KEY = "ks-ref", REF_DAYS = 30;
  function savedCode() { try { const r = JSON.parse(localStorage.getItem(REF_KEY) || "null"); return r && r.code && Date.now() - r.at < REF_DAYS * 864e5 ? r.code : ""; } catch (e) { return ""; } }
  function saveCode(code) { try { code ? localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() })) : localStorage.removeItem(REF_KEY); } catch (e) {} }
  async function checkCode(v) { try { const r = await fetch("/api/checkout?code=" + encodeURIComponent(v), { cache: "no-store" }); const j = await r.json().catch(() => ({})); return r.ok && j.code ? j.code : null; } catch (e) { return null; } }
  // Facebook Pixel events (only when the pixel is on; see ks-pixel.v1.js)
  const track = (name, data) => { try { if (window.fbq) window.fbq("track", name, data || {}); } catch (e) {} };

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
<div class="ks-code"><span class="ks-con" hidden></span><button type="button" class="ks-link ks-cask">Have a code?</button><div class="ks-crow" hidden><input class="ks-cin" maxlength="20" autocomplete="off" placeholder="Enter code" aria-label="Discount code"><button type="button" class="ks-capply">Apply</button></div></div>
<button type="button" class="ks-pay">Pay</button><div class="ks-status" role="status"></div>
<p class="ks-fine">Secure payment by Razorpay: UPI, cards, net banking and wallets.</p>`;
    const $ = s => el.querySelector(s);
    const state = { mode: "activate", plan: "digital", print: "", photo: "", cat: null, code: null };
    const status = (t, cls) => { const s = $(".ks-status"); s.textContent = t || ""; s.className = "ks-status" + (cls ? " " + cls : ""); };
    const full = plan => { const c = state.cat; if (!c || !c.delivery[plan]) return { sum: 0, frame: 0 }; const base = state.mode === "upgrade" ? 0 : c.products[opts.kind].price, fr = c.delivery[plan].price; return { sum: base + fr, frame: fr }; };
    // A creator's code takes its discount off the keepsake itself, never a frame (same as api/_ref.js).
    const total = plan => { const f = full(plan); if (!state.code) return f.sum; return f.sum - Math.round(Math.max(0, f.sum - f.frame) * state.code.discount / 100); };

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
      const cd = state.code, off = cd ? full(state.plan).sum - total(state.plan) : 0;
      $(".ks-code").hidden = state.mode === "upgrade"; $(".ks-con").hidden = !cd; $(".ks-cask").hidden = !!cd; if (cd) $(".ks-crow").hidden = true;
      if (cd) $(".ks-con").innerHTML = `<span class="ks-on">✓ Code ${esc(cd.code)} applied: ${cd.discount}% off${off ? " (you save " + money(off) + ")" : ""}</span> · <button type="button" class="ks-link ks-cdel">Remove</button>`;
      $(".ks-pay").innerHTML = "Pay " + money(total(state.plan)) + (off ? `<span class="ks-was">${money(full(state.plan).sum)}</span>` : "") + (state.mode === "upgrade" ? " & order frame" : " & activate");
    }

    el.addEventListener("click", e => {
      const o = e.target.closest(".ks-opt"); if (o) { state.plan = o.dataset.plan; status(""); render(); return; }
      const p = e.target.closest(".ks-pill"); if (p) { state.print = p.dataset.print; status(""); render(); return; }
      if (e.target.closest(".ks-cask")) { $(".ks-crow").hidden = false; $(".ks-cask").hidden = true; $(".ks-cin").focus(); return; }
      if (e.target.closest(".ks-cdel")) { state.code = null; saveCode(null); status(""); render(); return; }
      if (e.target.closest(".ks-capply")) applyCode($(".ks-cin").value, true);
    });
    $(".ks-cin").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); applyCode(e.target.value, true); } });
    async function applyCode(v, loud) {
      v = String(v || "").trim(); if (!v) { if (loud) status("Enter a code first.", "bad"); return; }
      const c = await checkCode(v);
      if (c) { state.code = c; saveCode(c.code); if (loud) status(""); render(); }
      else if (loud) status("That code isn't valid.", "bad"); else saveCode(null);
    }
    $(".ks-photo input").addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
      status("Uploading your photo…");
      try { state.photo = await uploadPhoto(f, "print"); status("Photo ready to print ♡", "ok"); render(); } catch (x) { status(x.message, "bad"); }
    });
    $(".ks-pay").addEventListener("click", pay);

    async function pay() {
      const id = opts.getId(); if (!id) { status("Save first ♡", "bad"); return; }
      const body = { action: "create", id, plan: state.plan };
      if (state.code && state.mode !== "upgrade") body.ref = state.code.code;
      if (state.plan !== "digital") {
        if (!state.print) { status("Choose what to print in the frame.", "bad"); return; }
        if (state.print === "photo" && !state.photo) { status("Upload the photo you'd like printed.", "bad"); return; }
        body.print = state.print; body.photo = state.photo;
        body.address = {}; el.querySelectorAll("[data-a]").forEach(i => body.address[i.dataset.a] = i.value);
      }
      const btn = $(".ks-pay"); btn.disabled = true; status("Opening secure payment…");
      track("InitiateCheckout", { value: total(state.plan), currency: "INR" });
      try {
        const o = await post("/api/checkout", body);
        await loadRazorpay();
        const rzp = new Razorpay({
          key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: "Keepsake", description: o.description, prefill: o.prefill, theme: { color: "#42070f" },
          handler: async p => {
            status("Confirming your payment…");
            try { const v = await post("/api/checkout", { action: "verify", ...p }); status(""); track("Purchase", { value: v.amount || 0, currency: "INR", content_type: "product", content_ids: [opts.kind + "-" + (v.plan || "digital")] }); opts.onPaid && opts.onPaid(v); }
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
        if (!state.code && state.mode !== "upgrade") { const saved = savedCode(); if (saved) await applyCode(saved, false); }
        const cu = opts.customer && opts.customer();
        if (cu) { const n = el.querySelector('[data-a="name"]'), ph = el.querySelector('[data-a="phone"]'); if (!n.value) n.value = cu.name || ""; if (!ph.value) ph.value = cu.phone || ""; }
        render();
      }
    };
  }

  // Passcode field for the owner. value(): undefined = leave as is, false = remove, "text" = set new.
  function lock(el) {
    css();
    el.classList.add("kslock");
    el.innerHTML = `<label class="kl-row"><input type="checkbox" class="kl-on"> Lock it with a passcode before it opens</label>
      <div class="kl-opts" hidden>
        <div class="kl-style" role="group" aria-label="Kind of lock"><button type="button" data-s="pin" class="on">4-digit passcode</button><button type="button" data-s="word">A word</button></div>
        <input class="kl-pw" type="text" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="4 numbers, e.g. 1203">
        <input class="kl-hn" type="text" maxlength="60" autocomplete="off" placeholder="Hint on the lock screen (optional), e.g. our anniversary DDMM">
        <button type="button" class="kl-prev">Preview the lock screen</button>
      </div><div class="kl-hint"></div>`;
    const on = el.querySelector(".kl-on"), opts = el.querySelector(".kl-opts"), pw = el.querySelector(".kl-pw"), hn = el.querySelector(".kl-hn"), hint = el.querySelector(".kl-hint");
    let saved = false, savedStyle = "pin", style = "pin";
    const setStyle = s => {
      style = s; el.querySelectorAll(".kl-style button").forEach(b => b.classList.toggle("on", b.dataset.s === s));
      pw.maxLength = s === "pin" ? 4 : 64; pw.inputMode = s === "pin" ? "numeric" : "text";
      pw.placeholder = s === "pin" ? "4 numbers, e.g. 1203" : "A word or phrase (4+ characters)";
      if (s === "pin") pw.value = pw.value.replace(/\D/g, "").slice(0, 4);
      sync();
    };
    const sync = () => {
      opts.hidden = !on.checked;
      hint.textContent = on.checked
        ? (saved ? "A passcode is set. Type a new one only if you want to change it." : "They'll see a lock screen and need this to open it. Share it only with them.")
        : (saved ? "The passcode will be removed when you save." : "Optional. Without a passcode, anyone with the link can open it.");
    };
    el.querySelector(".kl-style").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setStyle(b.dataset.s); });
    pw.addEventListener("input", () => { if (style === "pin") pw.value = pw.value.replace(/\D/g, "").slice(0, 4); });
    on.addEventListener("change", sync);
    el.querySelector(".kl-prev").addEventListener("click", () => {
      const want = pw.value.trim();
      unlock({ kind: "keepsake", style, hint: hn.value.trim(), preview: true,
        onTry: async v => (!want ? (v.length >= (style === "pin" ? 4 : 1) ? true : "Type the passcode") : (v === want ? true : "Not quite. Try again.")) });
    });
    setStyle("pin"); sync();
    return {
      set(isLocked, st, h) { saved = !!isLocked; savedStyle = st === "word" ? "word" : "pin"; on.checked = saved; pw.value = ""; hn.value = h || ""; setStyle(saved ? savedStyle : "pin"); },
      value() { if (!on.checked) return saved ? false : undefined; const v = pw.value.trim(); return v || (saved ? undefined : ""); },
      style() { return style; },
      hint() { return on.checked ? hn.value.trim() : undefined; },
      check() {
        const v = pw.value.trim();
        if (!on.checked) return "";
        if (!v && saved && style === savedStyle) return "";
        if (!v && saved) return style === "pin" ? "Type a new 4-number passcode to switch to a keypad lock." : "Type a word to switch to a word lock.";
        if (style === "pin" && !/^\d{4}$/.test(v)) return "Your passcode must be exactly 4 numbers, or untick the lock.";
        if (style === "word" && v.length < 4) return "Your word must be at least 4 characters, or untick the lock.";
        return "";
      },
      saved(isLocked, st, h) { this.set(isLocked, st, h); }
    };
  }

  // The lock screen people see before a locked keepsake opens. onTry(code) resolves true when it worked.
  function unlock({ kind, style, hint, onTry, preview }) {
    css();
    if (!document.getElementById("ks-lock-fonts")) { const l = document.createElement("link"); l.id = "ks-lock-fonts"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Great+Vibes&display=swap"; document.head.appendChild(l); }
    const pin = style === "pin";
    const w = document.createElement("div"); w.className = "kslk"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Enter the passcode to open");
    const keys = ["1","2","3","4","5","6","7","8","9","♥","0","⌫"];
    w.innerHTML = `<div class="lk-in">
      <div class="lk-title"><span class="lk-big">unlock</span><span class="lk-script">for your surprise</span></div>
      <div class="lk-pic" aria-hidden="true"><div class="lk-ring"><svg viewBox="0 0 100 100"><path d="M50 84C24 66 12 52 12 37c0-11 8-19 18-19 9 0 15 5 20 13 5-8 11-13 20-13 10 0 18 8 18 19 0 15-12 29-38 47Z" fill="#ff8fb1"/><path d="M50 84C24 66 12 52 12 37c0-11 8-19 18-19 9 0 15 5 20 13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg></div>
        <svg class="lk-hat" viewBox="0 0 80 90"><path d="M40 4 74 82H6Z" fill="#3f6fe0"/><g fill="#ffd84a"><path d="M40 22l2.6 5.4 6 .8-4.3 4.2 1 5.9L40 35.5l-5.3 2.8 1-5.9-4.3-4.2 6-.8Z"/><path d="M26 54l2 4 4.4.6-3.2 3 .8 4.4L26 64l-4 2 .8-4.4-3.2-3 4.4-.6Z"/><path d="M54 52l2 4 4.4.6-3.2 3 .8 4.4L54 62l-4 2 .8-4.4-3.2-3 4.4-.6Z"/><path d="M40 68l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z"/></g><circle cx="40" cy="5" r="6" fill="#ffd84a"/><rect x="3" y="80" width="74" height="8" rx="4" fill="#ffd84a"/></svg>
      </div>
      <form class="lk-card" novalidate>
        <div class="lk-label">${pin ? "Enter passcode" : "Enter the secret word"}</div>
        ${hint ? `<div class="lk-hintx">Hint: ${esc(hint)}</div>` : ""}
        ${pin ? `<div class="lk-dots" aria-live="polite"><i></i><i></i><i></i><i></i></div>
        <div class="lk-pad">${keys.map(k => `<button type="button" class="lk-k${k === "♥" ? " lk-deco" : ""}" data-k="${k}" ${k === "♥" ? 'tabindex="-1" aria-hidden="true"' : `aria-label="${k === "⌫" ? "Delete" : k}"`}>${k}</button>`).join("")}</div>`
        : `<input class="lk-word" type="password" autocomplete="off" aria-label="Secret word" required>`}
        <button type="submit" class="lk-enter">enter</button>
        <div class="lk-msg" role="alert"></div>
        ${preview ? `<button type="button" class="lk-close">Close preview</button>` : ""}
      </form></div><div class="lk-burst" aria-hidden="true"></div>`;
    document.body.appendChild(w); document.documentElement.style.overflow = "hidden";
    const f = w.querySelector("form"), msg = w.querySelector(".lk-msg"), dots = [...w.querySelectorAll(".lk-dots i")], word = w.querySelector(".lk-word");
    let code = "", busy = false;
    const paint = () => dots.forEach((d, i) => { d.classList.toggle("on", i < code.length); d.textContent = i < code.length ? "✱" : ""; });
    const close = () => { document.documentElement.style.overflow = ""; w.remove(); document.removeEventListener("keydown", onKey); };
    const celebrate = () => {
      const b = w.querySelector(".lk-burst"), cols = ["#ff8fb1", "#ffd84a", "#8a6fdc", "#fff", "#ff5d8f"];
      for (let i = 0; i < 26; i++) { const s = document.createElement("i"); s.textContent = i % 3 ? "♥" : "✦"; s.style.cssText = `--x:${(Math.random() * 2 - 1) * 46}vw;--y:${-20 - Math.random() * 60}vh;--r:${Math.random() * 360}deg;color:${cols[i % cols.length]};animation-delay:${Math.random() * .15}s`; b.appendChild(s); }
      w.classList.add("lk-ok"); setTimeout(close, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1300);
    };
    const tryCode = async v => {
      if (busy) return; busy = true; msg.textContent = "";
      let won = false;
      try { const r = await onTry(v); if (r === true) { won = true; celebrate(); return; } msg.textContent = r || "That's not it. Try again."; w.querySelector(".lk-card").classList.remove("lk-shake"); void f.offsetWidth; w.querySelector(".lk-card").classList.add("lk-shake"); }
      catch (x) { msg.textContent = x.message || "Couldn't check it. Try again."; }
      finally { busy = won; if (!won) { code = ""; paint(); if (word) word.select(); } }
    };
    const press = k => { if (busy) return; if (k === "⌫") code = code.slice(0, -1); else if (/\d/.test(k) && code.length < 4) code += k; paint(); if (code.length === 4) setTimeout(() => tryCode(code), 180); };
    const onKey = e => { if (!pin) return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("⌫"); };
    if (pin) { w.querySelector(".lk-pad").addEventListener("click", e => { const b = e.target.closest(".lk-k"); if (b && b.dataset.k !== "♥") press(b.dataset.k); }); document.addEventListener("keydown", onKey); }
    f.addEventListener("submit", e => { e.preventDefault(); const v = pin ? code : word.value; if (pin && v.length < 4) { msg.textContent = "Type all 4 numbers."; return; } if (!pin && !v) return; tryCode(v); });
    const cb = w.querySelector(".lk-close"); if (cb) cb.addEventListener("click", close);
    if (word) setTimeout(() => word.focus({ preventScroll: true }), 60);
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
        kind: j.kind, style: j.style, hint: j.hint, onTry: async pw => {
          const r2 = await get(pw), j2 = await r2.json().catch(() => ({}));
          if (r2.ok) { try { sessionStorage.setItem(key, pw); } catch (e) {} done(j2); return true; }
          if (j2.wrong && j2.left != null && j2.left <= 5) return `That's not it. ${j2.left} ${j2.left === 1 ? "try" : "tries"} left for now.`;
          return j2.wrong ? "That's not it. Try again." : j2.error;
        }
      });
    });
  }

  window.KSCheckout = { mount, catalog };
  window.KSLock = { mount: lock };
  window.KSKeepsake = { fetch: fetchKeepsake, uploadPhoto, esc, money };
})();
