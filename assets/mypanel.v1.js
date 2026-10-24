/* "My orders & offers" panel for a shop's public page (/b/:id).
   Shows this phone's orders (with live status) and offer codes claimed from a pamphlet or poster QR.
   Everything is read from this phone (localStorage); status comes from the shop through the public APIs.
   KSMine.mount(root, { pid, name }) */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN");
  const when = t => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const dayOf = d => d ? new Date(d + "T12:00:00+05:30").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  const STEPS = [["new", "Placed"], ["prep", "Accepted"], ["ready", "Ready"], ["done", "Done"]];
  const SAY = { new: "Sent. Waiting for the shop to accept…", prep: "Accepted. It's being prepared.", ready: "Ready! Please collect it or wait for delivery.", done: "Completed. Thank you!", cancel: "The shop couldn't take this order. Please call them." };
  const TOK = /^[a-f0-9]{24}$/;
  const CSS = `
.bz .myo.ksm{z-index:9}
.bz .myo:not(.ksm){display:none}
.bz .ksm i.dot{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--ac);color:var(--on);font:800 11px var(--fn);font-style:normal}
.bz .kp .ckb{padding-top:18px}
.bz .kp h2{margin:0 0 12px;font:800 20px var(--fn);padding-right:44px}
.bz .kp .tabs{display:flex;gap:6px;margin-bottom:14px;background:var(--sf2);padding:4px;border-radius:999px}
.bz .kp .tabs button{flex:1;border:0;border-radius:999px;padding:10px 8px;background:none;color:var(--mu);font:700 13.5px var(--fn);cursor:pointer}
.bz .kp .tabs button.on{background:var(--bg);color:var(--tx);box-shadow:0 1px 6px #0003}
.bz .kp .c{border:1px solid var(--sf2);background:var(--sf);border-radius:16px;padding:14px;margin-bottom:12px}
.bz .kp .c .t{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.bz .kp .c .t b{font:800 17px var(--fn)}.bz .kp .c .t span{font-weight:700;color:var(--mu)}
.bz .kp .c .m{color:var(--mu);font-size:12.5px;margin-top:2px}
.bz .kp .c .it{margin:8px 0 0;font-size:13px}
.bz .kp .st{margin-top:10px;font-weight:600;font-size:13.5px}
.bz .kp .st.cx{color:#c0392b}
.bz .kp .trs{margin:14px 0 4px}
.bz .kp .cd{margin:10px 0;padding:12px;border:2px dashed var(--ac);border-radius:12px;text-align:center}
.bz .kp .cd b{display:block;font:800 28px/1.1 ui-monospace,Menlo,monospace;letter-spacing:.08em}
.bz .kp .cd small{color:var(--mu);font-size:12px}
.bz .kp .pill{display:inline-block;padding:3px 10px;border-radius:999px;font:800 11px var(--fn);letter-spacing:.06em;text-transform:uppercase}
.bz .kp .pill.v{background:#16a34a;color:#fff}.bz .kp .pill.u{background:var(--sf2);color:var(--mu)}.bz .kp .pill.e{background:#c0392b;color:#fff}
.bz .kp .acts{display:grid;gap:8px;margin-top:10px}.bz .kp .acts .btn{width:100%}
.bz .kp .empty{text-align:center;color:var(--mu);padding:26px 8px}
.bz .kp .note{color:var(--mu);font-size:12px;text-align:center;margin:6px 0 0}
`;
  function mount(root, o) {
    if (!root || !o || !o.pid || root.querySelector(".ksm")) return;
    const pid = o.pid, name = o.name || "the shop";
    if (!document.getElementById("ksm-css")) { const s = document.createElement("style"); s.id = "ksm-css"; s.textContent = CSS; document.head.appendChild(s); }
    const rd = k => { try { const a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
    const orders = () => rd("bz-ord:" + pid).filter(x => x && typeof x.ref === "string");
    const claims = () => rd("ks-claims").filter(x => x && TOK.test(x.token) && x.page === pid);
    let data = { orders: [], codes: [] }, tab = "", pollT = 0, openNow = false;
    const live = c => !c.red && !(c.end && Date.now() > new Date(c.end + "T23:59:59+05:30").getTime());
    const active = x => !["done", "cancel"].includes(x.st);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "myo ksm"; btn.hidden = true;
    const sheet = document.createElement("div");
    sheet.className = "ck kp"; sheet.hidden = true;
    sheet.innerHTML = `<div class="ckb" role="dialog" aria-modal="true" aria-label="My orders and offers"><button type="button" class="ckx" data-kx aria-label="Close">×</button><h2>My orders &amp; offers</h2><div class="tabs" role="tablist"><button type="button" role="tab" data-kt="o">Orders</button><button type="button" role="tab" data-kt="c">Offer codes</button></div><div data-kb></div></div>`;
    root.appendChild(btn); root.appendChild(sheet);
    const body = sheet.querySelector("[data-kb]");

    const refreshBtn = () => {
      const no = orders().filter(active).length, nc = claims().length;
      const n = no + data.codes.filter(live).length || (no + nc);
      btn.hidden = !(orders().length || nc);
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg> My orders &amp; offers${n ? ` <i class="dot">${n}</i>` : ""}`;
    };
    const post = async (url, b) => { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); return { s: r.status, j }; };

    async function load() {
      // orders: ask the shop for the latest status of each
      const os = orders();
      data.orders = await Promise.all(os.map(async x => {
        try { const { s, j } = await post("/api/qr", { action: "bz-status", id: pid, ref: x.ref }); if (s === 404) return { ...x, gone: true }; if (j.st) return { ...x, st: j.st, tot: j.tot || x.tot, items: j.items || x.items, pay: j.pay || x.pay, mode: j.mode || x.mode, direct: !!j.direct }; } catch (e) {}
        return x;
      }));
      // offer codes: this phone's claims for this shop
      const toks = claims().map(c => c.token);
      if (toks.length) { try { const { j } = await post("/api/campaign/counter", { page: pid, tokens: toks }); data.codes = Array.isArray(j.claims) ? j.claims : []; } catch (e) {} } else data.codes = [];
      if (data.codes.length) try { localStorage.setItem("ks-claims-seen:" + pid, "1"); } catch (e) {}
      refreshBtn(); if (openNow) draw();
    }
    const orderCard = x => {
      const at = STEPS.findIndex(s => s[0] === x.st), cx = x.st === "cancel";
      const items = Array.isArray(x.items) && x.items.length ? `<div class="it">${x.items.slice(0, 6).map(i => `${esc(i.q)} × ${esc(i.n)}`).join(", ")}${x.items.length > 6 ? " …" : ""}</div>` : "";
      if (x.gone) return `<div class="c"><div class="t"><b>#${esc(x.ref)}</b></div><p class="st">This order is too old to track. Please contact ${esc(name)}.</p></div>`;
      return `<div class="c"><div class="t"><b>#${esc(x.ref)}</b>${x.tot ? `<span>${money(x.tot)}</span>` : ""}</div><div class="m">${esc(when(x.at))}${x.pay ? " · " + (x.pay === "upi" ? "UPI" : "Cash on delivery/pickup") : ""}</div>${items}
        ${cx ? "" : `<ol class="trs">${STEPS.map(([k, l], i) => `<li class="${i < at ? "dn" : i === at ? "on" : ""}"><i>${i <= at ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' : ""}</i><span>${l}</span></li>`).join("")}</ol>`}
        <div class="st${cx ? " cx" : ""}">${esc(SAY[x.st] || "Sent to " + name)}</div></div>`;
    };
    const codeCard = c => {
      const used = !!c.red, exp = !used && !live(c), ok = !used && !exp;
      return `<div class="c"><div class="t"><b>${esc(c.title)}</b><span class="pill ${ok ? "v" : used ? "u" : "e"}">${ok ? "Valid" : used ? "Used" : "Expired"}</span></div>
        ${c.details ? `<div class="m">${esc(c.details)}</div>` : ""}
        <div class="cd"><b>${esc(c.code)}</b><small>${used ? "Used on " + esc(when(c.red)) : exp ? "Ended " + esc(dayOf(c.end)) : "Show this at the counter" + (c.end ? " · valid till " + esc(dayOf(c.end)) : "")}</small></div>
        ${ok ? `<div class="acts"><a class="btn" href="/r/${esc(pid)}">Redeem at the counter</a></div>` : ""}</div>`;
    };
    function draw() {
      const os = data.orders, cs = data.codes;
      if (!tab) tab = os.some(active) || !cs.some(live) ? "o" : "c";
      sheet.querySelectorAll("[data-kt]").forEach(b => { const on = b.dataset.kt === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); b.textContent = (b.dataset.kt === "o" ? "Orders" : "Offer codes") + ((b.dataset.kt === "o" ? os.length : cs.length) ? " (" + (b.dataset.kt === "o" ? os.length : cs.length) + ")" : ""); });
      body.innerHTML = tab === "o"
        ? (os.length ? os.map(orderCard).join("") + `<p class="note">Status updates by itself. Orders stay here on this phone.</p>` : `<p class="empty">No orders from this phone yet.</p>`)
        : (cs.length ? cs.map(codeCard).join("") + `<p class="note">Codes are saved on this phone. Take a screenshot too.</p>` : `<p class="empty">No offer codes yet. Scan an offer QR from ${esc(name)} to get one.</p>`);
    }
    const schedule = () => { clearTimeout(pollT); if (openNow && data.orders.some(active)) pollT = setTimeout(async () => { await load(); schedule(); }, 12000); };
    const open = async () => {
      openNow = true; sheet.hidden = false; document.documentElement.style.overflow = "hidden"; requestAnimationFrame(() => sheet.classList.add("on"));
      data.orders = orders(); draw(); await load(); schedule();
    };
    const close = () => { openNow = false; tab = ""; clearTimeout(pollT); sheet.classList.remove("on"); document.documentElement.style.overflow = ""; setTimeout(() => { sheet.hidden = true; }, 220); };
    btn.addEventListener("click", open);
    sheet.addEventListener("click", e => {
      const t = e.target;
      if (t === sheet || t.closest("[data-kx]")) { close(); return; }
      const kt = t.closest("[data-kt]"); if (kt) { tab = kt.dataset.kt; draw(); }
    });
    refreshBtn(); load();
    setInterval(refreshBtn, 4000); // an order placed on the page makes the button appear
    // /b/<id>?panel=codes (or #bz-mine) opens the panel straight away
    if (/[?&]panel=(codes|orders)\b/.test(location.search) || location.hash === "#bz-mine") { tab = /panel=codes/.test(location.search) ? "c" : "o"; if (!btn.hidden || claims().length || orders().length) open(); }
  }
  window.KSMine = { mount };
})();
