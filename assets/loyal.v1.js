/* Loyalty stamp card on a live business page (/b/:id). The renderer (biz.v7.js) draws the empty card; this makes it work:
   join with a phone number, then at the counter staff type their 4-digit PIN on the customer's phone to add a stamp
   or hand over the reward. The card is remembered on this phone (and can be reopened anywhere with the same number). */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = p => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const GIFT = svg('<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.5 9 8 12 8Zm0 0s1.5-4.5 4-3.5S15 8 12 8Z"/>');
  const CHECK = svg('<path d="m5 12.5 4.5 4.5L19 7"/>'), STAMP = svg('<path d="M9 4h6l-1 6h4v4H6v-4h4zM5 18h14v2H5z"/>');
  const CSS = `.bz .lm{position:fixed;inset:0;z-index:90;display:grid;align-items:end;justify-items:center;background:#0009;backdrop-filter:blur(4px);animation:lmf .2s}
.bz .lmc{width:min(460px,100%);max-height:92svh;overflow:auto;background:var(--bg);color:var(--tx);border-radius:26px 26px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));animation:lmu .28s cubic-bezier(.2,.9,.3,1)}
@media(min-width:620px){.bz .lm{align-items:center}.bz .lmc{border-radius:26px}}
@keyframes lmf{from{opacity:0}}@keyframes lmu{from{transform:translateY(40px);opacity:0}}
.bz .lmc h3{margin:0 0 4px;font:500 23px/1.2 var(--fh)}.bz .lmc>p{margin:0 0 16px;font:400 14px/1.45 var(--fn);color:var(--mu)}
.bz .lmc label{display:block;margin:0 0 12px;font:600 12.5px var(--fn);color:var(--mu)}
.bz .lmc input{display:block;width:100%;margin-top:6px;padding:14px 15px;border-radius:14px;border:1.5px solid color-mix(in srgb,var(--tx) 16%,transparent);background:var(--sf);color:var(--tx);font:500 16px var(--fn);outline:0}
.bz .lmc input:focus{border-color:var(--ac)}
.bz .lmc .btn{width:100%;margin-top:6px}.bz .lmc .x{display:block;margin:12px auto 0;background:none;border:0;color:var(--mu);font:600 13px var(--fn);cursor:pointer}
.bz .lmc .er{min-height:20px;margin:8px 0 0;font:600 13px/1.4 var(--fn);color:#e5484d;text-align:center}
.bz .lmc .dots{display:flex;justify-content:center;gap:14px;margin:8px 0 6px}.bz .lmc .dots i{width:16px;height:16px;border-radius:50%;border:2px solid var(--tx);opacity:.5}.bz .lmc .dots i.on{background:var(--tx);opacity:1}
.bz .lmc .pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.bz .lmc .pad button{height:58px;border-radius:16px;border:0;background:var(--sf);color:var(--tx);font:600 22px var(--fn);cursor:pointer}
.bz .lmc .pad button:active{background:var(--sf2)}.bz .lmc .pad .e{background:none}
.bz .lmc .who{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:var(--sf);margin-bottom:6px}
.bz .lmc .who b{display:block;font:600 15px var(--fn)}.bz .lmc .who small{font:500 12.5px var(--fn);color:var(--mu)}
.bz .lmc .who span{width:42px;height:42px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--ac);color:var(--on)}
.bz .loy .lsx{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 4px}
.bz .loy .lsx div{padding:10px 6px;border-radius:14px;background:var(--sf2);text-align:center}.bz .loy .lsx b{display:block;font:700 20px/1.1 var(--fn);color:var(--tx)}.bz .loy .lsx small{font:600 10.5px var(--fn);letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}
.bz .lfab{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:55;display:flex;align-items:center;gap:7px;padding:10px 15px;border-radius:999px;border:0;background:var(--ac);color:var(--on);font:700 13.5px var(--fn);box-shadow:0 10px 26px -8px #0007;cursor:pointer}
.bz .bk.on~.lfab{display:none}
.bz .loy .lw{font:500 12.5px/1.4 var(--fn);color:var(--mu);text-align:center}`;

  function mount(root, id) {
    const el = root.querySelector("[data-loy]"); if (!el || !id) return;
    if (!document.getElementById("ks-loy-css")) { const s = document.createElement("style"); s.id = "ks-loy-css"; s.textContent = CSS; document.head.appendChild(s); }
    const n = +el.dataset.n, reward = (el.querySelector(".lr") || {}).textContent || "your reward", SK = "ks-loy:" + id;
    const note = el.querySelector("[data-lp]").innerHTML;
    const load = () => { try { return JSON.parse(localStorage.getItem(SK) || "null"); } catch (e) { return null; } };
    const store = v => { try { v ? localStorage.setItem(SK, JSON.stringify(v)) : localStorage.removeItem(SK); } catch (e) {} };
    let me = load(), card = null, prev = -1;
    const toast = t => { const e = root.querySelector(".toast"); if (!e) return; e.textContent = t; e.classList.add("on"); clearTimeout(e._h); e._h = setTimeout(() => e.classList.remove("on"), 2400); };
    const api = async body => {
      try { const r = await fetch("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); const j = await r.json(); return r.ok ? j : { ...j, error: j.error || "Something went wrong." }; }
      catch (e) { return { error: "No internet. Please try again." }; }
    };

    function draw() {
      const s = card ? card.s : 0, ready = !!(card && card.ready);
      el.classList.toggle("rdy", ready);
      [...el.querySelectorAll("[data-lst] i")].forEach((d, i) => {
        const on = i < s; d.className = (on ? "on" : "") + (i === n - 1 ? " gf" : "") + (on && prev >= 0 && i >= prev ? " pop" : "");
        d.innerHTML = i === n - 1 && !on ? GIFT : on ? (i === n - 1 ? GIFT : CHECK) : `<u>${i + 1}</u>`;
      });
      prev = s; fab();
      el.querySelector("[data-lc]").textContent = card ? s + " / " + n : "Free to join";
      const lp = el.querySelector("[data-lp]"), la = el.querySelector("[data-la]");
      if (!card) { lp.innerHTML = note; la.innerHTML = `<button type="button" class="btn" data-lj>${GIFT} Get my free card</button>`; return; }
      const first = esc(String(card.name || "").split(" ")[0]);
      const left = n - s;
      lp.innerHTML = ready ? `🎉 ${first}, your <b>${esc(reward)}</b> is ready! Show this card at the counter.`
        : s ? `Hi ${first}! You've collected <b>${s} of ${n}</b> stamps. Just <b>${left} more visit${left > 1 ? "s" : ""}</b> to your ${esc(reward.toLowerCase())}.`
        : `Hi ${first}! Your card is ready. Get your first stamp on this visit, ${left} visits to your ${esc(reward.toLowerCase())}.`;
      la.innerHTML = `<div class="lsx"><div><b>${card.visits || s}</b><small>Visits</small></div><div><b>${ready ? "0" : left}</b><small>To go</small></div><div><b>${card.rewards || 0}</b><small>Rewards won</small></div></div>`
        + (ready ? `<button type="button" class="btn" data-lr>${GIFT} Claim my reward</button>` : (card.today ? `<button type="button" class="btn" disabled style="opacity:.6">${CHECK} Today's stamp added · see you tomorrow</button>` : `<button type="button" class="btn" data-ls>${STAMP} Add today's stamp</button>`))
        + `<div class="lw">One stamp a day. At the counter, staff type their PIN on your phone.</div><button type="button" class="lk" data-lo>Not ${first}? Use another number</button>`;
    }

    // A small "My card" button so a returning customer finds their card straight away.
    function fab() {
      let f = root.querySelector(".lfab");
      if (!card) { if (f) f.remove(); return; }
      if (!f) { f = document.createElement("button"); f.type = "button"; f.className = "lfab"; f.onclick = () => el.scrollIntoView({ behavior: "smooth", block: "center" }); root.appendChild(f); }
      f.innerHTML = GIFT + (card.ready ? " Reward ready!" : " My card " + card.s + "/" + n);
    }
    function sheet(html) {
      close(); const w = document.createElement("div"); w.className = "lm"; w.innerHTML = `<div class="lmc" role="dialog" aria-modal="true">${html}</div>`;
      w.onclick = e => { if (e.target === w || e.target.closest("[data-x]")) close(); };
      root.appendChild(w); return w;
    }
    function close() { const w = root.querySelector(".lm"); if (w) w.remove(); }

    function join() {
      const w = sheet(`<h3>Your loyalty card</h3><p>Collect ${n} stamps and get <b>${esc(reward)}</b>. Free, no app needed. Your card stays on this phone.</p>
        <form data-f><label>Your name<input name="nm" maxlength="40" autocomplete="name" placeholder="e.g. Riya" required></label>
        <label>Mobile number<input name="ph" inputmode="tel" maxlength="14" autocomplete="tel" placeholder="98765 43210" required></label>
        <button class="btn" type="submit">Get my card</button><div class="er" data-er></div></form><button type="button" class="x" data-x>Not now</button>`);
      const f = w.querySelector("[data-f]"); setTimeout(() => f.nm.focus(), 50);
      f.onsubmit = async e => {
        e.preventDefault(); const er = w.querySelector("[data-er]"), b = f.querySelector(".btn"); er.textContent = ""; b.disabled = true; b.textContent = "Opening your card…";
        const j = await api({ action: "loy-join", name: f.nm.value, phone: f.ph.value });
        b.disabled = false; b.textContent = "Get my card";
        if (j.error) { er.textContent = j.error; return; }
        me = { phone: j.card.phone, tok: j.tok }; store(me); card = j.card; prev = card.s; draw(); close();
        toast(card.s ? "Welcome back! Your card is open." : "Your card is ready. Show it on your next visit!");
      };
    }

    function pin(kind) {
      const isR = kind === "loy-redeem";
      const w = sheet(`<div class="who"><span>${isR ? GIFT : STAMP}</span><div><b>${esc(card.name)}</b><small>${card.s} of ${n} stamps · ${esc(reward)}</small></div></div>
        <h3 style="margin-top:14px;text-align:center">${isR ? "Staff: give the reward" : "Hand your phone to the staff"}</h3><p style="text-align:center">Staff PIN</p>
        <div class="dots">${"<i></i>".repeat(4)}</div><div class="er" data-er></div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button type="button" data-k="${k}">${k}</button>`).join("")}<button type="button" class="e" data-x aria-label="Cancel" style="font-size:14px">Cancel</button><button type="button" data-k="0">0</button><button type="button" class="e" data-k="del" aria-label="Delete">⌫</button></div>`);
      let v = "", busy = false;
      const dots = () => w.querySelectorAll(".dots i").forEach((d, i) => d.classList.toggle("on", i < v.length));
      w.querySelector(".pad").addEventListener("click", async e => {
        const k = e.target.closest("[data-k]"); if (!k || busy) return;
        if (k.dataset.k === "del") v = v.slice(0, -1); else if (v.length < 4) v += k.dataset.k;
        dots(); if (v.length < 4) return;
        busy = true; const er = w.querySelector("[data-er]"); er.textContent = "Checking…";
        const j = await api({ action: kind, phone: me.phone, tok: me.tok, pin: v });
        busy = false; v = ""; dots();
        if (j.gone) { store(null); me = card = null; draw(); close(); return; }
        if (j.error) { er.textContent = j.error; if (j.card) { card = j.card; draw(); } return; }
        card = j.card; draw(); close();
        toast(isR ? "Enjoy your " + reward.toLowerCase() + "! A new card starts now." : card.ready ? "Card full! Your reward is ready 🎉" : "Stamp added · " + card.s + " of " + n);
        if (navigator.vibrate) navigator.vibrate(isR || card.ready ? [60, 60, 120] : 40);
      });
    }

    el.addEventListener("click", e => {
      if (e.target.closest("[data-lj]")) return join();
      if (e.target.closest("[data-ls]")) return pin("loy-stamp");
      if (e.target.closest("[data-lr]")) return pin("loy-redeem");
      if (e.target.closest("[data-lo]")) { store(null); me = card = null; prev = -1; draw(); join(); }
    });
    draw();
    if (me && me.phone && me.tok) api({ action: "loy-card", phone: me.phone, tok: me.tok }).then(j => {
      if (j.gone) { store(null); me = null; return; }
      if (j.card) { card = j.card; prev = card.s; draw(); }
    });
  }
  window.KSLoyal = { mount };
})();
