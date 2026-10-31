/* GetKeepsake page builder: search a shop on Google Maps, build a private preview of its page, send it to the owner.
   KSBuilder.open({ post: (action, body) => Promise<json>, pre: "hq-pb" | "sp-pb" }) */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CSS = `
.kb-ov{position:fixed;inset:0;z-index:9000;background:rgba(8,6,40,.6);display:flex;align-items:flex-end;justify-content:center}
.kb{width:min(560px,100%);max-height:94vh;overflow:auto;background:#F2F2EE;color:#0B0B14;border-radius:26px 26px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));font:500 15px/1.45 Inter,system-ui,sans-serif;box-shadow:0 -20px 60px rgba(0,0,0,.3)}
@media (min-width:640px){.kb-ov{align-items:center}.kb{border-radius:26px}}
.kb h2{margin:0;font:800 24px/1.1 'Inter Tight',Inter,sans-serif;letter-spacing:-.03em}
.kb .kb-hd{display:flex;align-items:center;justify-content:space-between;gap:12px}
.kb .kb-x{border:0;background:none;font:600 15px Inter,sans-serif;text-decoration:underline;color:#5B5B69;cursor:pointer;min-height:44px}
.kb p.kb-s{margin:6px 0 14px;color:#5B5B69;font-size:14px}
.kb form{display:flex;gap:8px}
.kb input{flex:1;min-width:0;min-height:50px;padding:0 14px;border-radius:14px;border:1.5px solid #DADAD3;background:#fff;font:500 16px Inter,sans-serif;color:#0B0B14}
.kb input:focus{outline:none;border-color:#1F1BF2;box-shadow:0 0 0 3px rgba(31,27,242,.15)}
.kb .kb-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 18px;border-radius:999px;border:0;background:#0B0B14;color:#fff;font:700 15px Inter,sans-serif;cursor:pointer;text-decoration:none}
.kb .kb-b.l{background:#D4FF3F;color:#0B0B14}.kb .kb-b.w{background:#25D366;color:#0B0B14}.kb .kb-b.g{background:#fff;color:#0B0B14;border:1.5px solid #0B0B14}
.kb .kb-b[disabled]{opacity:.55}
.kb ul{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}
.kb li button{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;border:1.5px solid #DADAD3;background:#fff;text-align:left;cursor:pointer;color:inherit;font:inherit}
.kb li button:hover{border-color:#1F1BF2}
.kb li i{flex:none;width:40px;height:40px;border-radius:12px;background:#1F1BF2;color:#D4FF3F;display:grid;place-items:center;font:800 16px 'Inter Tight',sans-serif;font-style:normal}
.kb li b{display:block}.kb li small{display:block;color:#5B5B69;font-size:13px}
.kb .kb-msg{margin-top:14px;padding:14px;border-radius:14px;background:#fff;color:#5B5B69;text-align:center}
.kb .kb-msg.bad{background:#fde8e6;color:#9b2c16}
.kb .kb-res{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start;margin-top:14px}
@media (max-width:480px){.kb .kb-res{grid-template-columns:1fr}.kb .kb-ph{margin:0 auto}}
.kb .kb-ph{width:200px;height:420px;border-radius:30px;background:#0E0E16;padding:8px;box-shadow:0 20px 40px -18px rgba(4,2,60,.6)}
.kb .kb-ph div{width:100%;height:100%;border-radius:23px;overflow:hidden;background:#fff;position:relative}
.kb .kb-ph iframe{position:absolute;left:0;top:0;width:375px;height:780px;border:0;transform:scale(.4987);transform-origin:0 0}
.kb .kb-act{display:grid;gap:8px}
.kb .kb-act b{font:800 20px/1.15 'Inter Tight',sans-serif}
.kb .kb-act small{color:#5B5B69}
.kb .kb-note{margin-top:14px;font-size:12.5px;color:#5B5B69}`;
  let ov = null, S = null;
  function close() { if (ov) ov.remove(); ov = null; }
  function draw() {
    const k = ov.querySelector(".kb");
    let body = "";
    if (S.view === "search") {
      body = `<form id="kbF"><input id="kbQ" placeholder="Shop name and area" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="Shop name and area"><button class="kb-b" ${S.busy ? "disabled" : ""}>${S.busy ? "…" : "Search"}</button></form>
        ${S.err ? `<div class="kb-msg bad">${esc(S.err)}</div>` : ""}
        ${S.results ? (S.results.length ? `<ul>${S.results.map((r, i) => `<li><button data-i="${i}" ${S.busy ? "disabled" : ""}><i>${esc((r.name || "S").charAt(0).toUpperCase())}</i><span><b>${esc(r.name)}</b><small>${esc(r.kind ? r.kind + " · " : "")}${esc(r.addr)}</small></span></button></li>`).join("")}</ul>` : `<div class="kb-msg">No shops found. Try the name with the area or city.</div>`) : ""}
        <p class="kb-note">We use the shop's public Google Maps details (name, address, timings, phone, review link). The preview is private: only people with the link can see it, and it disappears after 30 days.</p>`;
    } else {
      const R = S.res, d = R.data, wa = d.wa ? "91" + d.wa : "";
      const msg = `Namaste! 🙏 Humne aapki dukaan *${d.t}* ka online page bana ke dekha hai. Yahan dekhiye:\n${R.url}\n\nMenu, WhatsApp order, UPI payment aur Google reviews, sab ek QR mein. Pasand aaye toh ₹1,000 mein yeh aapka, printed QR board ke saath.`;
      body = `<div class="kb-res"><div class="kb-ph"><div><iframe src="/p/${esc(R.tok)}" title="Preview" loading="lazy"></iframe></div></div>
        <div class="kb-act"><b>${esc(d.t)}</b><small>${esc(d.addr || d.area)}${d.phone ? "<br>+91 " + esc(d.phone) : ""}</small>
          <a class="kb-b w" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${wa ? "Send to the owner on WhatsApp" : "Share on WhatsApp"}</a>
          <a class="kb-b l" href="/p/${esc(R.tok)}" target="_blank" rel="noopener">Show it on this phone</a>
          <button class="kb-b g" id="kbC">Copy link</button>
          <button class="kb-b g" id="kbBack">Build another</button></div></div>
        <p class="kb-note">Menu and photos are samples. When the owner taps “Make it mine”, everything opens in the page maker to check and edit before paying.${d.wa ? "" : " No mobile number on Google, so send it from your own WhatsApp."}</p>`;
    }
    k.innerHTML = `<div class="kb-hd"><h2>${S.view === "search" ? "Build a shop's page" : "Preview ready"}</h2><button class="kb-x" id="kbX">Close</button></div>
      ${S.view === "search" ? `<p class="kb-s">Type the shop's name and area as it appears on Google Maps. Show the owner their own page in 10 seconds.</p>` : ""}${body}`;
    k.querySelector("#kbX").onclick = close;
    const f = k.querySelector("#kbF");
    if (f) { const q = k.querySelector("#kbQ"); if (!S.results && !S.busy) setTimeout(() => q.focus(), 50);
      f.onsubmit = async e => { e.preventDefault(); S.q = q.value.trim(); S.err = ""; S.busy = true; draw();
        try { const j = await S.post(S.pre + "-search", { q: S.q }); S.results = j.results; } catch (x) { S.err = x.message; S.results = null; }
        S.busy = false; draw(); };
      k.querySelectorAll("[data-i]").forEach(b => b.onclick = async () => { const r = S.results[+b.dataset.i]; S.busy = true; S.err = ""; b.querySelector("small").textContent = "Building the page…"; k.querySelectorAll("[data-i]").forEach(x => x.disabled = true);
        try { S.res = await S.post(S.pre + "-build", { place: r.id }); S.view = "done"; } catch (x) { S.err = x.message; }
        S.busy = false; draw(); }); }
    const c = k.querySelector("#kbC"); if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(S.res.url); c.textContent = "Copied ✓"; } catch (e) { prompt("Copy this link:", S.res.url); } };
    const bk = k.querySelector("#kbBack"); if (bk) bk.onclick = () => { S.view = "search"; S.res = null; draw(); };
  }
  function open(o) {
    if (!document.getElementById("kb-css")) { const st = document.createElement("style"); st.id = "kb-css"; st.textContent = CSS; document.head.appendChild(st); }
    S = { post: o.post, pre: o.pre, view: "search", q: "", results: null, res: null, busy: false, err: "" };
    close(); ov = document.createElement("div"); ov.className = "kb-ov"; ov.innerHTML = '<div class="kb" role="dialog" aria-modal="true" aria-label="Build a shop\'s page"></div>';
    ov.onclick = e => { if (e.target === ov) close(); }; document.body.appendChild(ov); draw();
  }
  window.KSBuilder = { open };
})();
