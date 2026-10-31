// Prepaid QR codes.
// GET  /k/CODE (rewritten to ?code=CODE)  -> opens the keepsake if the code is used, otherwise the studio/builder to make one
// GET  ?code=CODE&info=1                   -> { code, tier, status } (never the PIN)
// POST { code, pin, id }                   -> claims the code for one of your keepsakes (must be logged in)
const db = require("./_db");
const auth = require("./customer-auth");
const pp = require("./_prepaid");
const ip = req => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
const page = (res, code, title, text) => { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.status(code).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Keepsake</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at top,#5a0f17,#1b0306 70%);color:#f8f0df;font:17px/1.6 system-ui,sans-serif;text-align:center;padding:24px}h1{font:500 34px/1.2 Georgia,serif;color:#e4c680;margin:0 0 10px}a{display:inline-block;margin:8px 6px 0;padding:12px 22px;border-radius:999px;background:#d6b06a;color:#2a0409;font-weight:700;text-decoration:none}a.l{background:none;border:1px solid #e4c68088;color:#f8f0df}</style></head><body><div><h1>${title}</h1><p>${text}</p><a href="https://wa.me/918302791217">WhatsApp us</a><a class="l" href="/">Keepsake home</a></div></body></html>`); };

module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Storage is not configured yet." });
  try {
    const q = req.query || {};
    if (req.method === "GET") {
      // Salesperson accounts: check a code (for the shop owner's form) and the salesperson's own panel
      if (q.spcheck) { const s = await require("./_sales").get(q.spcheck); return s && s.active !== false ? db.reply(res, 200, { code: s.code, name: s.name.split(" ")[0] }) : db.reply(res, 404, { error: "That salesperson code isn't valid." }); }
      if (q.spme) { const x = await require("./_sales").me(q.spme, q.t); return x ? db.reply(res, 200, x) : db.reply(res, 401, { error: "Please log in again." }); }
      // Salesperson's private stats: ?sales=BATCH&key=KEY
      if (q.sales) { const x = await pp.salesView(q.sales, q.key); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "This link isn't valid. Ask GetKeepsake for a new one." }); }
      // A tap on a business page (Call, WhatsApp, Directions…): ?ev=PAGE_ID&t=call. Counted once per person per day.
      if (q.ev) {
        const id = String(q.ev), t = String(q.t || "");
        if (/^[a-z0-9]{8,16}$/i.test(id)) await require("./_stats").tap(id, t, ip(req));
        res.setHeader("Cache-Control", "no-store"); return res.status(204).end();
      }
      const rec = await pp.get(q.code);
      if (q.info) {
        if (!rec) return db.reply(res, 404, { error: "That code isn't valid." });
        let sp = "";
        if (rec.tier === "biz" && rec.status === "new") { const bt = await db.getj("pbatch:" + rec.batch); if (bt && bt.sp) sp = bt.sp; }
        return db.reply(res, 200, { code: rec.code, tier: rec.tier, status: rec.status, locked: !!rec.locked, ...(sp ? { sp } : {}) });
      }
      if (!rec) return page(res, 404, "This code isn't valid", "Please check the card, or message us and we'll sort it out.");
      if (rec.status === "claimed" && rec.memory) { res.setHeader("Cache-Control", "no-store"); return res.redirect(302, pp.urlFor(rec.kind, rec.memory)); }
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, (rec.tier === "site" ? "/builder" : rec.tier === "biz" ? "/shops/studio" : "/studio") + "?claim=" + rec.code);
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return db.reply(res, 405, { error: "Method not allowed." }); }
    // Geofence walk-in offer + nearby SMS (/api/geofence/<action> is rewritten here with ?gf=<action>)
    if (q.gf) { const r = await require("./_geo").handle(String(q.gf), req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error, ...(r.distance !== undefined ? { distance: r.distance } : {}), ...(r.need ? { need: r.need, credits: r.credits } : {}) }) : db.reply(res, 200, r); }
    // Offer QR campaigns (/api/campaign/<action> is rewritten here with ?cp=<action>)
    if (q.cp) { const r = await require("./_camp").handle(String(q.cp), req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error, ...(r.noCredits ? { noCredits: true } : {}) }) : db.reply(res, 200, r); }
    if (/^sp-push-/.test(String((req.body || {}).action || ""))) { const b = req.body, r = await require("./_sales").push(b.code, b.tok, b); return r.error ? db.reply(res, r.status, { error: r.error }) : db.reply(res, 200, r); }
    if ((req.body || {}).action === "sp-visit") { const r = await require("./_sales").logVisit(req.body.code, req.body.tok, req.body.visit); return r.error ? db.reply(res, r.status, { error: r.error }) : db.reply(res, 200, r); }
    if (/^loy-/.test(String((req.body || {}).action || ""))) { const r = await require("./_loyal").handle(req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error, ...(r.card ? { card: r.card } : {}), ...(r.gone ? { gone: true } : {}) }) : db.reply(res, 200, r); }
    if (/^(sp-pb-|pv-get$)/.test(String((req.body || {}).action || ""))) { const b = req.body, P = require("./_places");
      if (b.action === "pv-get") { const r = await P.get(b.tok, ip(req)); return r.error ? db.reply(res, r.status, { error: r.error }) : db.reply(res, 200, r); }
      const sp = await require("./_sales").auth(b.code, b.tok); if (!sp) return db.reply(res, 401, { error: "Please log in again." });
      if (await P.guard("sp:" + sp.code, 60)) return db.reply(res, 429, { error: "You've built 60 previews today. Try tomorrow." });
      const r = b.action === "sp-pb-search" ? await P.search(b.q) : b.action === "sp-pb-quick" ? await P.quick(b, sp.code) : await P.build(b.place, sp.code); return r.error ? db.reply(res, r.status || 400, { error: r.error }) : db.reply(res, 200, r); }
    if (/^kh-/.test(String((req.body || {}).action || ""))) { const r = await require("./_khata").handle(req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error }) : db.reply(res, 200, r); }
    if (/^bl-/.test(String((req.body || {}).action || ""))) { const r = await require("./_bill").handle(req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error }) : db.reply(res, 200, r); }
    if (/^bz-/.test(String((req.body || {}).action || ""))) { const r = await require("./_biz").handle(req.body, { ip: ip(req), user: () => auth.currentUser(req) }); return r.error ? db.reply(res, r.status || 400, { error: r.error }) : db.reply(res, 200, r); }
    if ((req.body || {}).action === "sp-login") { const r = await require("./_sales").login(req.body.code, req.body.pin, ip(req)); return r.error ? db.reply(res, r.status, { error: r.error }) : db.reply(res, 200, r); }
    const user = await auth.currentUser(req);
    if (!user) return db.reply(res, 401, { error: "Please log in to activate your code." });
    const b = req.body || {};
    const r = await pp.claim({ code: b.code, pin: b.pin, id: b.id, user, ip: ip(req) });
    if (r.error) return db.reply(res, r.status || 400, { error: r.error });
    return db.reply(res, 200, r);
  } catch (e) {
    return db.reply(res, 500, { error: "Could not process the code. Please try again." });
  }
};
