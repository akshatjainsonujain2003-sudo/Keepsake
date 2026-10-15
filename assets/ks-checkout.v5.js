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
.kslk{position:fixed;inset:0;z-index:9999;overflow:auto;-webkit-overflow-scrolling:touch}
.lk-lilac{--lil:#c8b5f3;--lil2:#8a6fdc;--but:#fff2b8;--cream:#fffbea;background:repeating-linear-gradient(90deg,var(--lil) 0 42px,var(--but) 42px 84px);font-family:system-ui,sans-serif;color:var(--lil2);display:grid;place-items:center;padding:20px 16px 30px;transition:transform .9s cubic-bezier(.7,0,.2,1) .35s}
.lk-lilac.lk-ok{transform:translateY(-105%)}
.lk-lilac .lk-in{position:relative;width:min(760px,100%);display:grid;grid-template-columns:1fr;gap:6px;justify-items:center}
.lk-lilac .lk-title{position:relative;text-align:center;line-height:.9;margin-top:6px}
.lk-lilac .lk-big{display:block;font:400 clamp(58px,16vw,112px)/.95 "DM Serif Display",Georgia,serif;color:var(--lil2);letter-spacing:-.02em;text-shadow:0 3px 0 #fff8}
.lk-lilac .lk-script{display:block;margin-top:-.32em;font:400 clamp(36px,10vw,68px)/1 "Great Vibes",cursive;color:#fff;text-shadow:0 2px 8px #8a6fdc99,0 0 2px #8a6fdc}
.lk-lilac .lk-pic{position:relative;width:min(120px,32vw);margin:14px 0 -34px;z-index:2}
.lk-lilac .lk-ring{aspect-ratio:1;border-radius:50%;background:var(--cream);display:grid;place-items:center;box-shadow:0 0 0 7px var(--lil2),0 0 0 11px var(--cream),0 0 0 15px var(--lil2),0 10px 24px #6a4fc455}
.lk-lilac .lk-ring svg{width:62%}
@media (prefers-reduced-motion:no-preference){.lk-lilac .lk-ring svg{animation:lkbeat 1.4s ease-in-out infinite}}
@keyframes lkbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(1)}45%{transform:scale(1.08)}}
.lk-lilac .lk-hat{position:absolute;width:44%;right:-22%;top:-14%;transform:rotate(22deg);filter:drop-shadow(0 6px 6px #0003)}
.lk-lilac .lk-card{position:relative;width:min(340px,100%);background:var(--cream);padding:46px 20px 16px;text-align:center;border-radius:26px;
  box-shadow:0 0 0 3px var(--lil2),0 0 0 9px var(--cream),0 0 0 12px var(--lil2),0 18px 40px #6a4fc455}
.lk-lilac .lk-label{font:600 18px/1.2 system-ui,sans-serif;color:var(--lil2)}
.lk-lilac .lk-hintx{margin-top:6px;font:italic 15px/1.35 Georgia,serif;color:#7a64c2}
.lk-lilac .lk-dots{display:flex;justify-content:center;gap:10px;margin:12px 0 14px}
.lk-lilac .lk-dots i{width:42px;height:42px;border-radius:9px;background:#e6dcfb;display:grid;place-items:center;font:700 20px/1 system-ui;color:#fff;font-style:normal;transition:background .2s,transform .2s}
.lk-lilac .lk-dots i.on{background:var(--lil2);transform:scale(1.06)}
.lk-lilac .lk-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:9px 16px;max-width:228px;margin:0 auto}
.lk-lilac .lk-k{aspect-ratio:1;border-radius:50%;border:0;background:#f3edff;color:var(--lil2);font:400 30px/1 "DM Serif Display",Georgia,serif;cursor:pointer;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:5px;box-shadow:inset 0 -3px 0 #d9ccfa;transition:transform .12s,background .15s}
.lk-lilac .lk-k:focus-visible,.lk-lilac .lk-enter:focus-visible{outline:3px solid #ff8fb1;outline-offset:2px}
.lk-lilac .lk-k:active{transform:scale(.92);background:#e3d8ff}
.lk-lilac .lk-k.lk-deco{color:#ff8fb1;text-decoration:none;cursor:default;background:transparent;box-shadow:none}
.lk-lilac .lk-word{width:100%;box-sizing:border-box;margin:16px 0 4px;padding:14px;border-radius:14px;border:2px solid var(--lil2);background:#fff;font-size:18px;text-align:center;color:#3b2a74}
.lk-lilac .lk-enter{margin-top:12px;padding:8px 34px;border-radius:999px;border:2px solid var(--lil2);background:transparent;color:var(--lil2);font:400 26px/1 "DM Serif Display",Georgia,serif;cursor:pointer}
.lk-lilac .lk-enter:hover{background:#f3edff}
.lk-lilac .lk-msg{min-height:1.3em;margin-top:10px;font-size:14px;color:#d1336b}
.lk-lilac .lk-close{margin-top:4px;background:none;border:0;color:#7a64c2;text-decoration:underline;font-size:14px;cursor:pointer}
.kslk .lk-shake{animation:lkshake .45s}
@keyframes lkshake{20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}
.kslk .lk-burst{position:fixed;left:50%;top:55%;pointer-events:none}
.kslk .lk-burst i{position:absolute;font-style:normal;font-size:26px;animation:lkfly 1.1s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes lkfly{from{transform:translate(0,0) scale(.3);opacity:1}to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1.2);opacity:0}}
@media(min-width:760px){.lk-lilac .lk-in{grid-template-columns:1fr 1fr;align-items:center;column-gap:30px}.lk-lilac .lk-title{grid-column:1/-1}.lk-lilac .lk-pic{width:210px;margin:0;justify-self:end;margin-right:30px}.lk-lilac .lk-card{justify-self:start;padding-top:26px;margin-top:22px}}
@media(max-height:700px) and (max-width:759px){.lk-lilac .lk-pic{display:none}.lk-lilac .lk-card{padding-top:20px}}
@media (prefers-reduced-motion:reduce){.kslk,.kslk *{animation:none!important;transition:none!important}}
.lk-folder{--felt:#6b3d29;--felt2:#58301f;--paper:#f7f1e6;--ink:#2a1a12;--red:#8e1f22;background:#c7d5de;color:var(--ink);font-family:system-ui,-apple-system,sans-serif;padding:18px 12px 64px;display:flex;flex-direction:column;align-items:center;transition:opacity .55s .75s}
.lk-folder::before{content:"";position:fixed;inset:0;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");opacity:.18;pointer-events:none}
.lk-folder .lk-sky{position:fixed;inset:0;pointer-events:none}
.lk-folder .lk-sky svg{position:absolute;width:22px}
.lk-folder .lk-hills{position:fixed;left:0;right:0;bottom:0;height:min(34vh,300px);pointer-events:none}
.lk-folder .lk-hills svg{width:100%;height:100%;display:block}
.lk-folder .lk-top{position:relative;margin:4px 0 30px;color:#fff;font-size:14px;font-weight:600;letter-spacing:.01em;text-shadow:0 1px 6px #5a738544}
.lk-folder .lk-fold{position:relative;width:min(370px,100%);z-index:1;margin-bottom:auto}
.lk-folder .lk-top{margin-top:auto!important}
.lk-folder .lk-back{position:absolute;inset:10px -9px -8px 14px;background:#2b221d;border-radius:8px 16px 14px 8px;box-shadow:0 26px 40px -16px #22303a88}
.lk-folder .lk-back::after{content:"";position:absolute;top:-16px;right:26px;width:84px;height:130px;background:#fbfaf6;border-radius:3px;transform:rotate(3deg);box-shadow:0 2px 6px #0002}
.lk-folder .lk-front{position:relative;background:var(--felt);background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"),radial-gradient(120% 90% at 30% 10%,#7a4630,var(--felt2));border-radius:6px 16px 16px 6px;padding:0 0 14px;box-shadow:inset 0 0 0 1px #ffffff10,0 3px 0 #3b2014}
.lk-folder .lk-front::before{content:"";position:absolute;left:9px;top:12px;bottom:12px;width:14px;background:repeating-linear-gradient(90deg,#00000038 0 1.5px,transparent 1.5px 5px);border-radius:2px;opacity:.8}
.lk-folder .lk-front::after{content:"";position:absolute;top:-15px;left:30px;width:120px;height:18px;background:inherit;border-radius:10px 12px 0 0}
.lk-folder .lk-cover{position:relative;height:196px}
.lk-folder .lk-name{position:absolute;left:0;right:0;top:52px;margin:0;text-align:center;color:#f4ecdc;font-weight:400;line-height:.85;pointer-events:none}
.lk-folder .lk-s{display:block;font:400 44px/1 "Great Vibes",cursive;transform:translateX(-14px) rotate(-6deg)}
.lk-folder .lk-b{display:block;font:400 46px/1 "DM Serif Display",Georgia,serif;letter-spacing:-.01em;margin-top:2px}
.lk-folder .lk-pol{position:absolute;background:#fbf8f1;padding:6px 6px 20px;box-shadow:0 8px 16px -6px #0007,0 1px 2px #0003}
.lk-folder .lk-pol .lk-ph{aspect-ratio:1;overflow:hidden;background:#e9e2d4}
.lk-folder .lk-pol .lk-ph img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.9) contrast(1.02)}
.lk-folder .lk-pol .lk-ph svg{width:100%;height:100%;display:block}
.lk-folder .lk-pol b{position:absolute;left:0;right:0;bottom:2px;text-align:center;font:400 13px/1 "Special Elite",ui-monospace,monospace;color:#5b4a40;font-weight:400}
.lk-folder .lk-pol1{left:-6px;top:-26px;width:94px;transform:rotate(-9deg)}
.lk-folder .lk-pol2{right:-14px;top:-6px;width:104px;transform:rotate(7deg)}
.lk-folder .lk-tape{position:absolute;top:-9px;left:50%;width:46px;height:16px;margin-left:-23px;background:#e8a99a;opacity:.85;transform:rotate(-4deg);clip-path:polygon(3% 0,97% 4%,100% 50%,96% 100%,2% 96%,0 50%)}
.lk-folder .lk-bclip{position:absolute;top:-30px;left:50%;width:40px;margin-left:-20px}
.lk-folder .lk-bow{position:absolute;left:58px;top:-30px;width:70px;transform:rotate(-8deg);filter:drop-shadow(0 3px 3px #0004);z-index:2}
.lk-folder .lk-pclip{position:absolute;right:118px;top:-30px;width:16px;filter:drop-shadow(0 2px 2px #0003);z-index:2}
.lk-folder .lk-card{position:relative;margin:0 14px;background:var(--paper);background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .13 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");border-radius:3px;padding:20px 16px 14px;text-align:center;transform:rotate(.7deg);box-shadow:0 10px 18px -8px #0008,0 1px 0 #fff inset;transition:transform .6s,opacity .5s}
.lk-folder .lk-kick{font-size:12px;letter-spacing:.02em;color:#7b6a5d}
.lk-folder .lk-label{margin-top:3px;font:400 22px/1.15 "Special Elite",ui-monospace,monospace;color:var(--ink)}
.lk-folder .lk-hintx{margin-top:5px;font:italic 14px/1.35 Georgia,serif;color:#6e5a4c}
.lk-folder .lk-dots{display:flex;justify-content:center;gap:10px;margin:13px 0 14px}
.lk-folder .lk-dots i{width:38px;height:38px;border-radius:9px;background:#d8cfc1;display:grid;place-items:center;font:700 18px/1 system-ui;font-style:normal;color:#fbf6ec;transition:background .2s,transform .2s}
.lk-folder .lk-dots i.on{background:var(--felt);transform:scale(1.06)}
.lk-folder .lk-pad{display:grid;grid-template-columns:repeat(3,56px);justify-content:center;gap:9px 18px}
.lk-folder .lk-k{width:56px;height:56px;border-radius:50%;border:1.6px solid var(--ink);background:#fffdf8;color:var(--ink);font:500 21px/1 system-ui,sans-serif;cursor:pointer;transition:transform .12s,background .15s;box-shadow:0 2px 0 #2a1a1222}
.lk-folder .lk-k:active{transform:scale(.92);background:#efe6d6}
.lk-folder .lk-k.lk-deco{border:0;background:none;box-shadow:none;color:#d2475f;font-size:22px;cursor:default}
.lk-folder .lk-k:focus-visible,.lk-folder .lk-enter:focus-visible,.lk-folder .lk-word:focus-visible{outline:3px solid #e0466e;outline-offset:2px}
.lk-folder .lk-word{width:100%;box-sizing:border-box;margin:14px 0 2px;padding:13px;border-radius:10px;border:1.6px solid var(--ink);background:#fffdf8;font:400 18px "Special Elite",ui-monospace,monospace;text-align:center;color:var(--ink)}
.lk-folder .lk-enter{margin-top:14px;position:relative;padding:9px 26px;border:0;background:var(--red);color:#f6ead6;font:400 17px/1 "Special Elite",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transform:rotate(-1.5deg);box-shadow:0 0 0 3px var(--red),inset 0 0 0 1.5px #f6ead6aa,0 6px 12px -4px #0006}
.lk-folder .lk-msg{min-height:1.3em;margin-top:9px;font-size:13.5px;color:#b3263a}
.lk-folder .lk-close{background:none;border:0;color:#6e5a4c;text-decoration:underline;font-size:13px;cursor:pointer}
.lk-folder .lk-stamp{position:absolute;top:-22px;right:10px;width:74px;padding:5px;background:#f6ead6;transform:rotate(7deg);filter:drop-shadow(0 3px 3px #0004);
  -webkit-mask:radial-gradient(circle 3.2px at 3.2px 3.2px,#0000 98%,#000) -3.2px -3.2px/8px 8px,linear-gradient(#000 0 0) content-box;mask:radial-gradient(circle 3.2px at 3.2px 3.2px,#0000 98%,#000) -3.2px -3.2px/8px 8px,linear-gradient(#000 0 0) content-box;padding:6px}
.lk-folder .lk-stamp div{background:var(--red);color:#f6ead6;text-align:center;padding:7px 3px 6px;outline:1px dashed #f6ead6aa;outline-offset:-4px}
.lk-folder .lk-stamp small{display:block;font:600 7px/1.2 system-ui;letter-spacing:.18em}
.lk-folder .lk-stamp strong{display:block;font:400 19px/1 "Great Vibes",cursive;margin-top:2px}
.lk-folder .lk-sign{display:block;margin:12px 0 0 30px;font:400 19px/1 "Great Vibes",cursive;color:#e9dcc6;opacity:.85;text-align:left}
.lk-folder .lk-foot{position:fixed;left:0;right:0;bottom:14px;display:flex;justify-content:space-between;padding:0 20px;margin:0;color:#fff;font-size:13px;font-weight:500;text-shadow:0 1px 4px #2c4a1a99;pointer-events:none;z-index:2}
.lk-folder .lk-foot span:nth-child(2){font-weight:700}
.lk-folder.lk-ok{opacity:0}
.lk-folder.lk-ok .lk-card{transform:translateY(-36px) rotate(-4deg);opacity:0}
.lk-folder.lk-ok .lk-pol1{transform:translate(-30px,-40px) rotate(-20deg);transition:transform .7s}
.lk-folder.lk-ok .lk-pol2{transform:translate(30px,-40px) rotate(18deg);transition:transform .7s}
@media(max-height:720px) and (max-width:819px){.lk-folder .lk-top{margin-bottom:22px}.lk-folder .lk-cover{height:168px}.lk-folder .lk-name{top:40px}}
@media(min-width:820px){
 .lk-folder{justify-content:center;padding-top:28px}
 .lk-folder .lk-top{font-size:16px;margin-bottom:40px}
 .lk-folder .lk-fold{width:800px}
 .lk-folder .lk-front{display:grid;grid-template-columns:1fr 360px;align-items:center;padding:30px 30px 26px 40px;min-height:470px;box-sizing:border-box}
 .lk-folder .lk-cover{height:430px}
 .lk-folder .lk-name{top:96px}
 .lk-folder .lk-s{font-size:76px}.lk-folder .lk-b{font-size:78px}
 .lk-folder .lk-pol1{left:-60px;top:-56px;width:140px}
 .lk-folder .lk-pol2{right:4px;top:auto;bottom:-40px;width:140px}
 .lk-folder .lk-pol b{font-size:16px;bottom:5px}.lk-folder .lk-pol{padding:9px 9px 30px}
 .lk-folder .lk-bow{left:80px;top:-58px;width:96px}
 .lk-folder .lk-pclip{right:auto;left:320px;top:-58px;width:20px}
 .lk-folder .lk-card{margin:0}
 .lk-folder .lk-sign{position:absolute;left:40px;bottom:18px;margin:0}
 .lk-folder .lk-sky svg{width:30px}
}
.lk-mirror{background:#3b86a3;color:#fff;font-family:system-ui,-apple-system,sans-serif;transition:opacity .6s 1s}
.lk-mirror .lk-scene{position:relative;min-height:max(100%,720px);overflow:hidden}
.lk-mirror .lk-bg{position:absolute;inset:-60px;filter:blur(20px) saturate(1.15)}
.lk-mirror .lk-bg::before,.lk-mirror .lk-bg::after{content:"";position:absolute;left:0;right:0;background-image:url(/assets/lock/mirror-meadow.webp);background-size:cover}
.lk-mirror .lk-bg::before{top:0;height:62%;background-position:center top}
.lk-mirror .lk-bg::after{bottom:0;height:52%;background-position:center bottom;-webkit-mask:linear-gradient(#0000,#000 30%);mask:linear-gradient(#0000,#000 30%)}
.lk-mirror .lk-stage{--H:980px;position:absolute;height:var(--H);width:calc(var(--H) / 2);left:calc(50% - var(--H) * .2517);top:calc(var(--cy,283px) - var(--H) * .5);background:url(/assets/lock/mirror-meadow.webp) center/100% 100%;
  -webkit-mask:linear-gradient(90deg,#0000,#000 14%,#000 86%,#0000);mask:linear-gradient(90deg,#0000,#000 14%,#000 86%,#0000);transform-origin:50.3% 51%;transition:transform 1.3s cubic-bezier(.6,0,.2,1)}
.lk-mirror .lk-glass{position:absolute;left:33%;width:35.4%;top:36.6%;height:30%;box-sizing:border-box;border-radius:50% 50% 4px 4px/22% 22% 4px 4px;overflow:hidden;
  -webkit-backdrop-filter:blur(7px) brightness(1.12) saturate(.9);backdrop-filter:blur(7px) brightness(1.12) saturate(.9);background:linear-gradient(170deg,#ffffff5e,#ffffff1c 55%,#ffffff33);box-shadow:inset 0 0 26px #ffffffa0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:26px 10px 6px;transition:opacity .7s,backdrop-filter .7s}
.lk-mirror .lk-glass>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;filter:blur(1.5px);z-index:-1}
.lk-mirror .lk-s{font:400 30px/1 "Great Vibes",cursive;text-shadow:0 1px 10px #1d5a7488}
.lk-mirror .lk-label{margin-top:6px;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 6px #1d5a7499}
.lk-mirror .lk-hintx{margin-top:5px;font:italic 13px/1.3 Georgia,serif;text-shadow:0 1px 6px #1d5a74aa}
.lk-mirror .lk-dots{display:flex;justify-content:center;gap:8px;margin-top:12px}
.lk-mirror .lk-dots i{width:30px;height:36px;border-radius:8px;background:#ffffff40;border:1.5px solid #ffffffc0;display:grid;place-items:center;font:700 16px/1 system-ui;font-style:normal;color:#fff;transition:background .2s,transform .2s}
.lk-mirror .lk-dots i.on{background:#ffffffcc;color:#2c6f8c;transform:scale(1.06)}
.lk-mirror .lk-top{position:absolute;top:16px;left:0;right:0;margin:0;text-align:center;font:600 14px/1.3 system-ui,sans-serif;text-shadow:0 1px 8px #1d5a74aa;z-index:2;padding:0 16px}
.lk-mirror .lk-pane{position:absolute;left:0;right:0;bottom:14px;margin:0 auto;width:min(330px,calc(100% - 24px));box-sizing:border-box;padding:16px 16px 10px;text-align:center;border-radius:30px;border:1px solid #ffffff70;
  background:#ffffff26;-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);box-shadow:0 22px 44px -20px #0008;transition:opacity .5s,transform .6s}
.lk-mirror .lk-pad{display:grid;grid-template-columns:repeat(3,58px);justify-content:center;gap:9px 20px}
.lk-mirror .lk-k{width:58px;height:58px;border-radius:50%;border:1px solid #ffffffb0;background:#ffffff30;color:#fff;font:400 25px/1 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 4px #0003;transition:transform .12s,background .15s}
.lk-mirror .lk-k:active{transform:scale(.92);background:#ffffff70}
.lk-mirror .lk-k.lk-deco{border:0;background:none;color:#fff;font-size:22px;cursor:default}
.lk-mirror .lk-k:focus-visible,.lk-mirror .lk-enter:focus-visible,.lk-mirror .lk-word:focus-visible{outline:3px solid #fff;outline-offset:2px}
.lk-mirror .lk-word{width:100%;box-sizing:border-box;padding:14px;border-radius:16px;border:1px solid #ffffffb0;background:#ffffff38;color:#fff;font-size:18px;text-align:center}
.lk-mirror .lk-enter{margin-top:12px;padding:11px 30px;border:0;border-radius:999px;background:#fff;color:#2c6f8c;font:600 15px/1 system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 6px 16px -6px #0006}
.lk-mirror .lk-msg{min-height:1.3em;margin-top:8px;font-size:13.5px;font-weight:600;text-shadow:0 1px 6px #7a1f2e}
.lk-mirror .lk-close{background:none;border:0;color:#fff;text-decoration:underline;font-size:13px;cursor:pointer}
.lk-mirror .lk-card.lk-shake{animation:none}.lk-mirror .lk-card.lk-shake .lk-glass,.lk-mirror .lk-card.lk-shake .lk-pane{animation:lkshake .45s}
.lk-mirror.lk-ok{opacity:0}
.lk-mirror.lk-ok .lk-stage{transform:scale(3.4)}
.lk-mirror.lk-ok .lk-glass{opacity:0}
.lk-mirror.lk-ok .lk-pane{opacity:0;transform:translateY(60px)}
.lk-mirror.lk-ok .lk-top{opacity:0;transition:opacity .4s}
@media(max-height:740px){.lk-mirror .lk-scene{min-height:max(100%,700px)}.lk-mirror .lk-stage{--H:840px;--cy:236px}.lk-mirror .lk-top{top:10px}.lk-mirror .lk-k{width:50px;height:50px;font-size:22px}.lk-mirror .lk-pad{grid-template-columns:repeat(3,50px);gap:7px 18px}.lk-mirror .lk-pane{padding-top:13px}.lk-mirror .lk-s{font-size:26px}.lk-mirror .lk-glass{padding:22px 4px 6px}.lk-mirror .lk-dots{gap:6px}.lk-mirror .lk-dots i{width:26px;height:32px}}
@media(min-width:820px) and (min-height:760px){.lk-mirror .lk-stage{--H:1040px;--cy:300px}}
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
        <div class="kl-sub">Lock screen design</div>
        <div class="kl-style kl-look" role="group" aria-label="Lock screen design"><button type="button" data-l="folder" class="on">Secret folder</button><button type="button" data-l="mirror">Magic mirror</button><button type="button" data-l="lilac">Lilac keypad</button></div>
        <div class="kl-photo"><span class="kl-thumb" hidden></span><label class="kl-up">Add a teaser photo (optional)<input type="file" accept="image/*" hidden></label><button type="button" class="kl-rm" hidden>Remove</button></div>
        <div class="kl-hint kl-pnote" hidden>Anyone with the link can see this photo before unlocking, so pick one that doesn't give the surprise away.</div>
        <button type="button" class="kl-prev">Preview the lock screen</button>
      </div><div class="kl-hint"></div>`;
    const on = el.querySelector(".kl-on"), opts = el.querySelector(".kl-opts"), pw = el.querySelector(".kl-pw"), hn = el.querySelector(".kl-hn"), hint = el.querySelector(".kl-hint");
    let saved = false, savedStyle = "pin", style = "pin", look = "folder", photo = "";
    const lookBtns = el.querySelector(".kl-look"), thumb = el.querySelector(".kl-thumb"), up = el.querySelector(".kl-up"), rm = el.querySelector(".kl-rm"), pnote = el.querySelector(".kl-pnote"), file = up.querySelector("input");
    const PNOTE = pnote.textContent;
    const setLook = l => { look = ["lilac", "mirror"].includes(l) ? l : "folder"; lookBtns.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.l === look)); el.querySelector(".kl-photo").hidden = look === "lilac"; pnote.hidden = look === "lilac" || !photo; };
    const setPhoto = u => { photo = u || ""; thumb.hidden = !photo; thumb.style.backgroundImage = photo ? `url("${photo}")` : ""; rm.hidden = !photo; up.firstChild.textContent = photo ? "Change photo" : "Add a teaser photo (optional)"; pnote.hidden = look === "lilac" || !photo; pnote.textContent = PNOTE; };
    lookBtns.addEventListener("click", e => { const b = e.target.closest("button"); if (b) setLook(b.dataset.l); });
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
    el.querySelector(".kl-style:not(.kl-look)").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setStyle(b.dataset.s); });
    pw.addEventListener("input", () => { if (style === "pin") pw.value = pw.value.replace(/\D/g, "").slice(0, 4); });
    on.addEventListener("change", sync);
    el.querySelector(".kl-prev").addEventListener("click", () => {
      const want = pw.value.trim();
      unlock({ kind: "keepsake", style, hint: hn.value.trim(), look, photo, preview: true,
        onTry: async v => (!want ? (v.length >= (style === "pin" ? 4 : 1) ? true : "Type the passcode") : (v === want ? true : "Not quite. Try again.")) });
    });
    setStyle("pin"); setLook("folder"); sync();
    return {
      set(isLocked, st, h, lk, ph) { saved = !!isLocked; savedStyle = st === "word" ? "word" : "pin"; on.checked = saved; pw.value = ""; hn.value = h || ""; setStyle(saved ? savedStyle : "pin"); setLook(lk); setPhoto(ph); },
      // Everything besides the password itself, ready to merge into the save request.
      extra() { return on.checked ? { lockStyle: style, lockHint: hn.value.trim(), lockLook: look, lockPhoto: photo } : {}; },
      load(j) { this.set(j.locked, j.lockStyle, j.lockHint, j.lockLook, j.lockPhoto); },
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
      saved(isLocked, st, h, lk, ph) { this.set(isLocked, st, h, lk, ph); }
    };
  }

  // The lock screen people see before a locked keepsake opens. onTry(code) resolves true when it worked.
  const STAR = c => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 1.8l2.9 6.6 7.1.7-5.4 4.7 1.6 7L12 17.2l-6.2 3.6 1.6-7L2 9.1l7.1-.7Z"/></svg>`;
  function folderArt(photo) {
    const stars = [["#7a3b1e", "8%", "22%"], ["#e0466e", "88%", "34%"], ["#fff", "12%", "58%"], ["#fff", "92%", "12%"], ["#e0466e", "4%", "40%"], ["#7a3b1e", "94%", "62%"]]
      .map(([c, x, y], i) => STAR(c).replace("<svg", `<svg style="left:${x};top:${y};transform:rotate(${i * 23}deg)"`)).join("");
    const hills = `<svg viewBox="0 0 400 200" preserveAspectRatio="none"><defs><filter id="lkgr" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.6 .5" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .22  0 0 0 0 .06  0 0 0 1.4 -.55"/><feComposite in2="SourceGraphic" operator="in" result="g"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge></filter>
      <linearGradient id="lkh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8dbb5c"/><stop offset="1" stop-color="#4f8a33"/></linearGradient><linearGradient id="lkh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76a94a"/><stop offset="1" stop-color="#3d7426"/></linearGradient></defs>
      <path filter="url(#lkgr)" fill="url(#lkh1)" d="M0 70C40 40 90 34 130 58s70 30 110 6 90-40 160 4V200H0Z"/><path filter="url(#lkgr)" fill="url(#lkh2)" d="M0 120c50-34 110-40 170-14s90 20 130 2 70-20 100-6V200H0Z"/></svg>`;
    const env = `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#ecd4cf"/><g transform="rotate(-6 50 50)"><rect x="16" y="30" width="68" height="46" rx="3" fill="#fbf6ec" stroke="#2a1a12" stroke-width="1.8"/><path d="M16 32l34 25 34-25" fill="none" stroke="#2a1a12" stroke-width="1.8" stroke-linejoin="round"/><path d="M50 66c-8-5-12-9-12-13 0-3 2-5 5-5 3 0 5 2 7 4 2-2 4-4 7-4 3 0 5 2 5 5 0 4-4 8-12 13Z" fill="#d2475f"/></g></svg>`;
    const gift = `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#f4e6b9"/><g stroke="#2a1a12" stroke-width="1.8" stroke-linejoin="round"><rect x="24" y="44" width="52" height="38" fill="#e0466e"/><rect x="20" y="34" width="60" height="12" fill="#ef6a8a"/><path d="M46 34h8v48h-8Z" fill="#fbf6ec"/><path d="M50 34c-6-12-20-14-20-6 0 6 12 6 20 6Zm0 0c6-12 20-14 20-6 0 6-12 6-20 6Z" fill="#fbf6ec"/></g><text x="50" y="22" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="11" fill="#7a3b1e">for you</text></svg>`;
    const bclip = `<svg viewBox="0 0 40 46"><path d="M12 22 8 4a4 4 0 0 1 8 0l2 18M28 22l4-18a4 4 0 0 0-8 0l-2 18" fill="none" stroke="#b9bec4" stroke-width="2.2"/><path d="M4 22h32l-4 22H8Z" fill="#ec5d86"/><path d="M4 22h32" stroke="#fff6" stroke-width="2"/></svg>`;
    const bow = `<svg viewBox="0 0 120 90"><defs><pattern id="lkgh" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><rect width="9" height="9" fill="#fff6f4"/><rect width="4.5" height="9" fill="#e06c7d" opacity=".55"/><rect width="9" height="4.5" fill="#e06c7d" opacity=".55"/></pattern></defs><g fill="url(#lkgh)" stroke="#c4475c" stroke-width="1.4" stroke-linejoin="round"><path d="M56 40C40 20 12 10 8 22s14 30 48 22Z"/><path d="M64 40C80 20 108 10 112 22s-14 30-48 22Z"/><path d="M54 46 34 86l10-2 6 6 10-40Z"/><path d="M66 46l20 40-10-2-6 6-10-40Z"/><rect x="51" y="34" width="18" height="16" rx="5"/></g></svg>`;
    const pclip = `<svg viewBox="0 0 20 60"><path d="M6 18v30a5 5 0 0 0 10 0V10a7.5 7.5 0 0 0-15 0v38" fill="none" stroke="#a9aeb5" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    return { stars, hills, env, gift: photo ? `<img src="${esc(photo)}" alt="">` : gift, bclip, bow, pclip };
  }

  // The lock screen people see before a locked keepsake opens. onTry(code) resolves true when it worked.
  function unlock({ kind, style, hint, look, photo, onTry, preview }) {
    css();
    if (!document.getElementById("ks-lock-fonts")) { const l = document.createElement("link"); l.id = "ks-lock-fonts"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Great+Vibes&family=Special+Elite&display=swap"; document.head.appendChild(l); }
    const pin = style === "pin", L = ["lilac", "mirror"].includes(look) ? look : "folder", F = L === "folder";
    const w = document.createElement("div"); w.className = "kslk lk-" + L; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Enter the passcode to open");
    const keys = ["1","2","3","4","5","6","7","8","9","♥","0","⌫"];
    const P = {
      label: `<div class="lk-label">${pin ? (L === "lilac" ? "Enter passcode" : "enter the passcode") : (L === "lilac" ? "Enter the secret word" : "enter the secret word")}</div>`,
      hint: hint ? `<div class="lk-hintx">Hint: ${esc(hint)}</div>` : "",
      dots: pin ? `<div class="lk-dots" aria-live="polite"><i></i><i></i><i></i><i></i></div>` : "",
      input: pin ? `<div class="lk-pad">${keys.map(k => `<button type="button" class="lk-k${k === "♥" ? " lk-deco" : ""}" data-k="${k}" ${k === "♥" ? 'tabindex="-1" aria-hidden="true"' : `aria-label="${k === "⌫" ? "Delete" : k}"`}>${k}</button>`).join("")}</div>`
        : `<input class="lk-word" type="password" autocomplete="off" aria-label="Secret word" required>`,
      enter: `<button type="submit" class="lk-enter">${F ? "open ♥" : L === "mirror" ? "step through ✦" : "enter"}</button>`,
      msg: `<div class="lk-msg" role="alert"></div>` + (preview ? `<button type="button" class="lk-close">Close preview</button>` : "")
    };
    const form = `<form class="lk-card" novalidate>
        ${F ? `<div class="lk-stamp" aria-hidden="true"><div><small>SEALED</small><strong>for you</strong></div></div><div class="lk-kick">our little secret ahead</div>` : ""}
        ${P.label}${P.hint}${P.dots}${P.input}${P.enter}${P.msg}
      </form>`;
    if (L === "mirror") {
      w.innerHTML = `<div class="lk-scene"><div class="lk-bg" aria-hidden="true"></div>
      <p class="lk-top">There's a little magic on the other side.</p>
      <form class="lk-card" novalidate><div class="lk-stage"><div class="lk-glass">${photo ? `<img src="${esc(photo)}" alt="">` : ""}<span class="lk-s">for your eyes only</span>${P.label}${P.hint}${P.dots}</div></div>
      <div class="lk-pane">${P.input}${P.enter}${P.msg}</div></form></div><div class="lk-burst" aria-hidden="true"></div>`;
    } else if (F) {
      const A = folderArt(photo);
      w.innerHTML = `<div class="lk-sky" aria-hidden="true">${A.stars}</div><div class="lk-hills" aria-hidden="true">${A.hills}</div>
      <p class="lk-top">It starts with a little secret.</p>
      <div class="lk-fold"><div class="lk-back" aria-hidden="true"></div><div class="lk-front">
        <div class="lk-cover"><i class="lk-bow" aria-hidden="true">${A.bow}</i><i class="lk-pclip" aria-hidden="true">${A.pclip}</i>
          <div class="lk-pol lk-pol1" aria-hidden="true"><span class="lk-tape"></span><div class="lk-ph">${A.env}</div><b>open me</b></div>
          <h1 class="lk-name"><span class="lk-s">Our little</span><span class="lk-b">secret</span></h1>
          <div class="lk-pol lk-pol2" aria-hidden="true"><i class="lk-bclip">${A.bclip}</i><div class="lk-ph">${A.gift}</div><b>${photo ? "guess who" : "just for you"}</b></div>
        </div>
        ${form}<span class="lk-sign" aria-hidden="true">sealed with love</span>
      </div></div>
      <p class="lk-foot" aria-hidden="true"><span>Private</span><span>A keepsake · ${new Date().getFullYear()}</span><span>Just for you</span></p>
      <div class="lk-burst" aria-hidden="true"></div>`;
    } else {
      w.innerHTML = `<div class="lk-in">
      <div class="lk-title"><span class="lk-big">unlock</span><span class="lk-script">for your surprise</span></div>
      <div class="lk-pic" aria-hidden="true"><div class="lk-ring"><svg viewBox="0 0 100 100"><path d="M50 84C24 66 12 52 12 37c0-11 8-19 18-19 9 0 15 5 20 13 5-8 11-13 20-13 10 0 18 8 18 19 0 15-12 29-38 47Z" fill="#ff8fb1"/><path d="M50 84C24 66 12 52 12 37c0-11 8-19 18-19 9 0 15 5 20 13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg></div>
        <svg class="lk-hat" viewBox="0 0 80 90"><path d="M40 4 74 82H6Z" fill="#3f6fe0"/><g fill="#ffd84a"><path d="M40 22l2.6 5.4 6 .8-4.3 4.2 1 5.9L40 35.5l-5.3 2.8 1-5.9-4.3-4.2 6-.8Z"/><path d="M26 54l2 4 4.4.6-3.2 3 .8 4.4L26 64l-4 2 .8-4.4-3.2-3 4.4-.6Z"/><path d="M54 52l2 4 4.4.6-3.2 3 .8 4.4L54 62l-4 2 .8-4.4-3.2-3 4.4-.6Z"/><path d="M40 68l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z"/></g><circle cx="40" cy="5" r="6" fill="#ffd84a"/><rect x="3" y="80" width="74" height="8" rx="4" fill="#ffd84a"/></svg>
      </div>${form}</div><div class="lk-burst" aria-hidden="true"></div>`;
    }
    document.body.appendChild(w); document.documentElement.style.overflow = "hidden";
    const f = w.querySelector("form"), msg = w.querySelector(".lk-msg"), dots = [...w.querySelectorAll(".lk-dots i")], word = w.querySelector(".lk-word");
    let code = "", busy = false;
    const paint = () => dots.forEach((d, i) => { d.classList.toggle("on", i < code.length); d.textContent = i < code.length ? "✱" : ""; });
    const close = () => { document.documentElement.style.overflow = ""; w.remove(); document.removeEventListener("keydown", onKey); };
    const celebrate = () => {
      const b = w.querySelector(".lk-burst"), cols = L === "mirror" ? ["#fff", "#fffbe0", "#ffd6e2", "#e8f6ff", "#fff3a8"] : F ? ["#e0466e", "#7a3b1e", "#fff", "#f4c542", "#ec5d86"] : ["#ff8fb1", "#ffd84a", "#8a6fdc", "#fff", "#ff5d8f"];
      for (let i = 0; i < 26; i++) { const s = document.createElement("i"); s.textContent = i % 3 ? "♥" : "✦"; s.style.cssText = `--x:${(Math.random() * 2 - 1) * 46}vw;--y:${-20 - Math.random() * 60}vh;--r:${Math.random() * 360}deg;color:${cols[i % cols.length]};animation-delay:${Math.random() * .15}s`; b.appendChild(s); }
      w.classList.add("lk-ok"); setTimeout(close, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : L === "mirror" ? 1650 : 1350);
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
        kind: j.kind, style: j.style, hint: j.hint, look: j.look, photo: j.photo, onTry: async pw => {
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
