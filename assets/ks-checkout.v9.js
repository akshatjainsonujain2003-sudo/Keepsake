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
.kslock .kl-sub{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin-top:4px}
.kslock .kl-photo{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.kslock .kl-thumb{width:46px;height:46px;border-radius:8px;background:#0003 center/cover;flex:none}
.kslock .kl-up{padding:8px 14px;border-radius:999px;border:1px dashed #c9a45a;cursor:pointer;font-size:14px}
.kslock .kl-rm{background:none;border:0;color:inherit;opacity:.7;text-decoration:underline;cursor:pointer;font:inherit;font-size:13px}
.kslock .kl-prev{align-self:flex-start;background:none;border:0;padding:2px 0;color:#d6b06a;text-decoration:underline;font:inherit;font-size:14px;cursor:pointer}
.kslk{position:fixed;inset:0;z-index:9999;overflow:auto;-webkit-overflow-scrolling:touch;background:#cfe3ee url(/assets/lock/hills.webp) center 35%/cover;color:#4a3410;font-family:system-ui,-apple-system,sans-serif;transition:opacity .6s 1.05s}
.kslk::before{content:"";position:fixed;inset:0;background:linear-gradient(#ffffff55,#ffffff00 32%,#ffffff00 60%,#2c4a1a33);pointer-events:none}
.kslk .lk-g{position:relative;min-height:max(100%,640px);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px;padding:18px 12px 14px}
.kslk .lk-sun{position:fixed;top:-52px;right:-50px;width:min(150px,36vw);filter:drop-shadow(0 0 28px #ffd56a) drop-shadow(0 6px 10px #8a5a0044);pointer-events:none;z-index:1}
.kslk .lk-sun img{width:100%;display:block}
.kslk .lk-vine{position:fixed;top:-14px;left:-10px;width:min(118px,28vw);transform-origin:20% 0;pointer-events:none;filter:drop-shadow(0 6px 6px #0003);z-index:1}
.kslk .lk-title{position:relative;z-index:2;text-align:center;margin-top:4px}
.kslk .lk-s{display:block;font:400 clamp(34px,9.4vw,58px)/1 "Great Vibes",cursive;color:#5b3d10;text-shadow:0 1px 0 #fff9,0 0 14px #fff,0 0 4px #fff}
.kslk .lk-sub{display:block;margin-top:4px;font:600 11px/1.3 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#6b4e18;text-shadow:0 0 10px #fff}
.kslk .lk-stage{--fw:clamp(168px,26vh,236px);position:relative;width:var(--fw);height:calc(var(--fw) * 1.476);flex:none;z-index:2;transform-origin:50% 52%;transition:transform 1.3s cubic-bezier(.6,0,.2,1)}
.kslk .lk-frame{position:absolute;inset:0;width:100%;height:100%;z-index:2;filter:drop-shadow(0 14px 18px #3b2a0866);pointer-events:none}
.kslk .lk-glass{position:absolute;left:16.2%;width:66.8%;top:19.1%;height:65.2%;border-radius:50%;overflow:hidden;z-index:1;box-sizing:border-box;padding:8% 6%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:radial-gradient(ellipse at 50% 40%,#fffdf3e6,#fff6dccc 60%,#f3e2b4cc);box-shadow:inset 0 0 24px #c9a24a88;transition:opacity .7s}
.kslk .lk-glass>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}
.kslk .lk-glass.lk-has-photo{background:radial-gradient(ellipse at 50% 50%,#fffdf3cc,#fffdf38c 55%,#fffdf355)}
.kslk .lk-glass.lk-has-photo>img{opacity:.55;filter:blur(1.5px) sepia(.15)}
.kslk .lk-label{font:600 10.5px/1.25 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6b4e18}
.kslk .lk-hintx{margin-top:5px;font:italic 12.5px/1.3 Georgia,serif;color:#5b3d10;max-width:100%}
.kslk .lk-dots{display:flex;justify-content:center;gap:calc(var(--fw) * .025);margin-top:10px}
.kslk .lk-dots i{width:calc(var(--fw) * .105);height:calc(var(--fw) * .13);box-sizing:border-box;border-radius:7px;background:#ffffffb0;border:1.5px solid #c99b3c;display:grid;place-items:center;font:700 14px/1 system-ui;font-style:normal;color:#fff;transition:background .2s,transform .2s}
.kslk .lk-dots i.on{background:linear-gradient(#e9c160,#b8862c);border-color:#a5761f;transform:scale(1.07)}
.kslk .lk-fl{position:absolute;pointer-events:none;z-index:3;filter:drop-shadow(0 8px 10px #2d1f0855)}
.kslk .lk-fl img{width:100%;display:block}
.kslk .lk-f1{width:56%;left:-34%;bottom:-6%;transform:rotate(-18deg)}
.kslk .lk-f2{width:50%;right:-30%;bottom:-2%;transform:rotate(14deg)}
.kslk .lk-f3{width:40%;left:-22%;top:6%;transform:rotate(-24deg)}
.kslk .lk-f4{width:32%;right:-16%;top:16%;transform:rotate(10deg)}
@media (prefers-reduced-motion:no-preference){
 .kslk .lk-sun img{animation:lkspin 70s linear infinite}
 .kslk .lk-vine{animation:lksway 7s ease-in-out infinite alternate}
 .kslk .lk-fl{animation:lkfloat 6s ease-in-out infinite alternate}.kslk .lk-f2{animation-delay:-2s}.kslk .lk-f3{animation-delay:-4s}.kslk .lk-f4{animation-delay:-1s}
}
@keyframes lkspin{to{transform:rotate(360deg)}}
@keyframes lksway{from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}}
@keyframes lkfloat{from{translate:0 0}to{translate:0 -6px}}
.kslk .lk-pane{position:relative;z-index:2;width:min(330px,100%);box-sizing:border-box;padding:14px 16px 8px;text-align:center;border-radius:30px;border:1px solid #ffffffa0;
  background:#fffaf03d;-webkit-backdrop-filter:blur(16px) saturate(1.25);backdrop-filter:blur(16px) saturate(1.25);box-shadow:0 22px 44px -22px #1c2e1088;transition:opacity .5s,transform .6s}
.kslk .lk-pad{display:grid;grid-template-columns:repeat(3,58px);justify-content:center;gap:8px 20px}
.kslk .lk-k{width:58px;height:58px;border-radius:50%;border:1px solid #ffffffd0;background:#ffffff4d;color:#3e2c0c;font:400 25px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px -3px #3b2a0844;transition:transform .12s,background .15s}
.kslk .lk-k:active{transform:scale(.92);background:#fff3c8d0}
.kslk .lk-k.lk-deco{border:0;background:none;box-shadow:none;color:#d25a6e;font-size:22px;cursor:default}
.kslk .lk-k:focus-visible,.kslk .lk-enter:focus-visible,.kslk .lk-word:focus-visible{outline:3px solid #b8862c;outline-offset:2px}
.kslk .lk-word{width:100%;box-sizing:border-box;padding:14px;border-radius:16px;border:1px solid #ffffffd0;background:#ffffff70;color:#3e2c0c;font-size:18px;text-align:center}
.kslk .lk-enter{margin-top:12px;padding:12px 34px;border:0;border-radius:999px;background:linear-gradient(#f2d27a,#c8962f);color:#3e2a06;font:600 15px/1 system-ui,sans-serif;letter-spacing:.05em;cursor:pointer;box-shadow:0 8px 18px -8px #7a5208,inset 0 1px 0 #fff8}
.kslk .lk-msg{min-height:1.3em;margin-top:7px;font-size:13.5px;font-weight:600;color:#9b1c33;text-shadow:0 0 8px #fff}
.kslk .lk-close{background:none;border:0;color:#3e2c0c;text-decoration:underline;font-size:13px;cursor:pointer;margin-bottom:4px}
.kslk .lk-card.lk-shake .lk-stage,.kslk .lk-card.lk-shake .lk-pane{animation:lkshake .45s}
@keyframes lkshake{20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}

.kslk.lk-ok{opacity:0}
.kslk.lk-ok .lk-stage{transform:scale(3.2)}
.kslk.lk-ok .lk-glass{opacity:0}
.kslk.lk-ok .lk-pane{opacity:0;transform:translateY(60px)}
.kslk.lk-ok .lk-title{opacity:0;transition:opacity .4s}
.kslk.lk-ok .lk-sun{transform:scale(1.5);transition:transform 1.2s}
.kslk .lk-burst{position:fixed;left:50%;top:42%;pointer-events:none;z-index:5}
.kslk .lk-burst i{position:absolute;font-style:normal;font-size:26px;animation:lkfly 1.1s cubic-bezier(.2,.7,.3,1) forwards}
.kslk .lk-burst img{position:absolute;width:44px;animation:lkfly 1.2s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes lkfly{from{transform:translate(0,0) scale(.3);opacity:1}to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1.2);opacity:0}}
@media(max-height:720px){.kslk .lk-k{width:50px;height:50px;font-size:22px}.kslk .lk-pad{grid-template-columns:repeat(3,50px);gap:6px 18px}.kslk .lk-enter{margin-top:9px;padding:10px 30px}.kslk .lk-s{font-size:34px}}
@media(min-width:860px){.kslk .lk-sun{width:200px;top:-66px;right:-60px}.kslk .lk-vine{width:140px}}
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
  async function checkCode(v) { try { const r = await fetch("/api/checkout?code=" + encodeURIComponent(v), { cache: "no-store" }); const j = await r.json().catch(() => ({})); return r.ok && j.code ? j.code : { error: j.error || "That code isn't valid." }; } catch (e) { return { error: "Couldn't check that code. Try again." }; } }
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
    const full = plan => { const c = state.cat; if (!c || !c.delivery[plan]) return { sum: 0, frame: 0 }; const pr = c.products[opts.kind], up = state.mode === "upgrade", base = up ? 0 : pr.price, fr = c.delivery[plan].price; return { sum: base + fr, frame: fr, was: (up ? 0 : pr.was || pr.price) + fr }; };
    // A creator's code takes its discount off the keepsake itself, never a frame (same as api/_ref.js).
    const total = plan => { const f = full(plan), cd = state.code; if (!cd) return f.sum; const dig = Math.max(0, f.sum - f.frame); return f.sum - (cd.off ? Math.min(cd.off, Math.max(0, dig - 1)) : Math.round(dig * (cd.discount || 0) / 100)); };

    function render() {
      const c = state.cat, prod = c.products[opts.kind];
      $(".ks-title").textContent = state.mode === "upgrade" ? "Get it in a photo frame" : "Activate your " + (opts.kind === "site" ? "website" : opts.kind === "biz" ? "business page" : "keepsake");
      $(".ks-note").textContent = state.mode === "upgrade"
        ? "We'll print a photo frame for this keepsake and deliver it to you. Your link stays the same."
        : opts.kind === "biz" ? "Your page is saved. Pay once to switch it on" + (opts.claim ? " and link it to your QR card" : "") + ". It stays live for good, and you can update your menu, offers and photos any time."
        : `Your ${opts.kind === "site" ? "website" : "card"} is saved. Pay once to switch on its link, QR code and NFC link. It stays live for good, and you can keep editing it.` + (c.sale ? ` 🎉 ${c.sale.name}: ${c.sale.percent}% off right now.` : "");
      const plans = (opts.kind === "biz" ? ["digital"] : state.mode === "upgrade" ? ["frameQr", "frameNfc"] : ["digital", "frameQr", "frameNfc"]).filter(p => c.delivery[p]);
      $(".ks-opts").hidden = $(".ks-dq").hidden = plans.length < 2;
      if (!plans.includes(state.plan)) state.plan = plans[0];
      $(".ks-opts").style.gridTemplateColumns = plans.length === 2 ? "1fr 1fr" : "";
      $(".ks-opts").innerHTML = plans.map(p => { const d = c.delivery[p]; return `<button type="button" class="ks-opt${p === state.plan ? " on" : ""}" data-plan="${p}"><b>${esc(p === "digital" ? prod.name + " · Digital" : d.name)}</b><span class="ks-pp">${full(p).was > total(p) ? `<s class="ks-was">${money(full(p).was)}</s> ` : ""}${money(total(p))}</span><small>${esc(d.desc || "")}</small></button>`; }).join("");
      const frame = state.plan !== "digital";
      $(".ks-frame").hidden = !frame;
      el.querySelectorAll(".ks-pill").forEach(b => b.classList.toggle("on", b.dataset.print === state.print));
      $(".ks-photo").hidden = state.print !== "photo";
      const img = $(".ks-photo img"); img.hidden = !state.photo; if (state.photo) img.src = state.photo;
      $(".ks-up").firstChild.textContent = state.photo ? "Change photo" : "Upload photo to print";
      const cd = state.code, off = cd ? full(state.plan).sum - total(state.plan) : 0;
      $(".ks-code").hidden = state.mode === "upgrade"; $(".ks-con").hidden = !cd; $(".ks-cask").hidden = !!cd; if (cd) $(".ks-crow").hidden = true;
      if (cd) $(".ks-con").innerHTML = `<span class="ks-on">✓ Code ${esc(cd.code)} applied: ${cd.off ? money(cd.off) : cd.discount + "%"} off${off ? " (you save " + money(off) + ")" : ""}</span> · <button type="button" class="ks-link ks-cdel">Remove</button>`;
      const was = full(state.plan).was;
      $(".ks-pay").innerHTML = "Pay " + money(total(state.plan)) + (was > total(state.plan) ? `<span class="ks-was">${money(was)}</span>` : "") + (state.mode === "upgrade" ? " & order frame" : " & activate");
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
      if (c && c.code) { state.code = c; saveCode(c.code); if (loud) status(""); render(); }
      else if (loud) status((c && c.error) || "That code isn't valid.", "bad"); else saveCode(null);
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
      const claim = typeof opts.claim === "function" ? opts.claim() : opts.claim; if (claim) body.claim = claim;
      const sp = typeof opts.sp === "function" ? opts.sp() : opts.sp; if (sp) body.sp = sp;
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
        <div class="kl-photo"><span class="kl-thumb" hidden></span><label class="kl-up">Add a photo inside the gold frame (optional)<input type="file" accept="image/*" hidden></label><button type="button" class="kl-rm" hidden>Remove</button></div>
        <div class="kl-hint kl-pnote" hidden>Anyone with the link can see this photo before unlocking, so pick one that doesn't give the surprise away.</div>
        <button type="button" class="kl-prev">Preview the lock screen</button>
      </div><div class="kl-hint"></div>`;
    const on = el.querySelector(".kl-on"), opts = el.querySelector(".kl-opts"), pw = el.querySelector(".kl-pw"), hn = el.querySelector(".kl-hn"), hint = el.querySelector(".kl-hint");
    let saved = false, savedStyle = "pin", style = "pin", photo = "";
    const thumb = el.querySelector(".kl-thumb"), up = el.querySelector(".kl-up"), rm = el.querySelector(".kl-rm"), pnote = el.querySelector(".kl-pnote"), file = up.querySelector("input");
    const PNOTE = pnote.textContent;
    const setPhoto = u => { photo = u || ""; thumb.hidden = !photo; thumb.style.backgroundImage = photo ? `url("${photo}")` : ""; rm.hidden = !photo; up.firstChild.textContent = photo ? "Change photo" : "Add a photo inside the gold frame (optional)"; pnote.hidden = !photo; pnote.textContent = PNOTE; };
    rm.addEventListener("click", () => setPhoto(""));
    file.addEventListener("change", async () => { const f = file.files[0]; file.value = ""; if (!f) return; up.firstChild.textContent = "Uploading…"; try { setPhoto(await uploadPhoto(f)); } catch (x) { setPhoto(photo); pnote.hidden = false; pnote.textContent = x.message || "Couldn't upload that photo."; } });
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
      unlock({ kind: "keepsake", style, hint: hn.value.trim(), photo, preview: true,
        onTry: async v => (!want ? (v.length >= (style === "pin" ? 4 : 1) ? true : "Type the passcode") : (v === want ? true : "Not quite. Try again.")) });
    });
    setStyle("pin"); sync();
    return {
      set(isLocked, st, h, ph) { saved = !!isLocked; savedStyle = st === "word" ? "word" : "pin"; on.checked = saved; pw.value = ""; hn.value = h || ""; setStyle(saved ? savedStyle : "pin"); setPhoto(ph); },
      // Everything besides the password itself, ready to merge into the save request.
      extra() { return on.checked ? { lockStyle: style, lockHint: hn.value.trim(), lockPhoto: photo } : {}; },
      load(j) { this.set(j.locked, j.lockStyle, j.lockHint, j.lockPhoto); },
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
      saved(isLocked, st, h, ph) { this.set(isLocked, st, h, ph); }
    };
  }

  // The lock screen people see before a locked keepsake opens. onTry(code) resolves true when it worked.
  const LK = n => `/assets/lock/${n}.webp`;
  function unlock({ kind, style, hint, photo, onTry, preview }) {
    css();
    if (!document.getElementById("ks-lock-fonts")) { const l = document.createElement("link"); l.id = "ks-lock-fonts"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap"; document.head.appendChild(l); }
    const pin = style === "pin";
    const w = document.createElement("div"); w.className = "kslk"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Enter the passcode to open");
    const keys = ["1","2","3","4","5","6","7","8","9","♥","0","⌫"];
    const fl = (n, c) => `<i class="lk-fl ${c}" aria-hidden="true"><img src="${LK(n)}" alt=""></i>`;
    w.innerHTML = `<i class="lk-sun" aria-hidden="true"><img src="${LK("sun")}" alt=""></i><img class="lk-vine" src="${LK("vine")}" alt="" aria-hidden="true">
      <form class="lk-card lk-g" novalidate>
        <div class="lk-title"><span class="lk-s">for your eyes only</span><span class="lk-sub">a little surprise is waiting</span></div>
        <div class="lk-stage">
          <div class="lk-glass${photo ? " lk-has-photo" : ""}">${photo ? `<img src="${esc(photo)}" alt="">` : ""}
            <div class="lk-label">${pin ? "enter the passcode" : "enter the secret word"}</div>
            ${hint ? `<div class="lk-hintx">${esc(hint)}</div>` : ""}
            ${pin ? `<div class="lk-dots" aria-live="polite"><i></i><i></i><i></i><i></i></div>` : ""}
          </div>
          <img class="lk-frame" src="${LK("frame-gold")}" alt="" aria-hidden="true">
          ${fl("lily-red", "lk-f1")}${fl("lily-pink", "lk-f2")}${fl("clematis", "lk-f3")}${fl("gerbera", "lk-f4")}
        </div>
        <div class="lk-pane">
          ${pin ? `<div class="lk-pad">${keys.map(k => `<button type="button" class="lk-k${k === "♥" ? " lk-deco" : ""}" data-k="${k}" ${k === "♥" ? 'tabindex="-1" aria-hidden="true"' : `aria-label="${k === "⌫" ? "Delete" : k}"`}>${k}</button>`).join("")}</div>`
            : `<input class="lk-word" type="password" autocomplete="off" aria-label="Secret word" placeholder="type it here" required>`}
          <button type="submit" class="lk-enter">open ✦</button>
          <div class="lk-msg" role="alert"></div>
          ${preview ? `<button type="button" class="lk-close">Close preview</button>` : ""}
        </div>
      </form><div class="lk-burst" aria-hidden="true"></div>`;
    document.body.appendChild(w); document.documentElement.style.overflow = "hidden";
    const f = w.querySelector("form"), msg = w.querySelector(".lk-msg"), dots = [...w.querySelectorAll(".lk-dots i")], word = w.querySelector(".lk-word");
    let code = "", busy = false;
    const paint = () => dots.forEach((d, i) => { d.classList.toggle("on", i < code.length); d.textContent = i < code.length ? "✱" : ""; });
    const close = () => { document.documentElement.style.overflow = ""; w.remove(); document.removeEventListener("keydown", onKey); };
    const celebrate = () => {
      const b = w.querySelector(".lk-burst"), cols = ["#f2c65c", "#ff9eb0", "#fff", "#e96a4f", "#ffd9e1"], pet = ["gerbera", "clematis", "lily-pink"];
      for (let i = 0; i < 24; i++) {
        let s; if (i % 4 === 0) { s = document.createElement("img"); s.src = LK(pet[i % 3]); s.alt = ""; } else { s = document.createElement("i"); s.textContent = i % 3 ? "✦" : "♥"; s.style.color = cols[i % cols.length]; }
        s.style.setProperty("--x", (Math.random() * 2 - 1) * 46 + "vw"); s.style.setProperty("--y", (-10 - Math.random() * 55) + "vh"); s.style.setProperty("--r", Math.random() * 360 + "deg"); s.style.animationDelay = Math.random() * .15 + "s"; b.appendChild(s);
      }
      w.classList.add("lk-ok"); setTimeout(close, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1650);
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
        kind: j.kind, style: j.style, hint: j.hint, photo: j.photo, onTry: async pw => {
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
