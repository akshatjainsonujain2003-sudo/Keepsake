const db = require("./_db");
const pp = require("./_prepaid");
const ref = require("./_ref");
const pay = require("./_pay");
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Storage not configured. Add Upstash Redis in Vercel → Storage." });
  const ak = process.env.ADMIN_KEY;
  // Guessing the admin key: after 10 wrong tries an address is locked out for an hour.
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?", bad = "adm-bad:" + ip;
  if (+(await db.cmd("GET", bad)) >= 10) return db.reply(res, 429, { error: "Too many wrong tries. Try again in an hour." });
  const given = Buffer.from(String(req.headers["x-admin-key"] || "")), want = Buffer.from(String(ak || ""));
  if (!ak || given.length !== want.length || !require("crypto").timingSafeEqual(given, want)) {
    const n = await db.cmd("INCR", bad); if (n === 1) await db.cmd("EXPIRE", bad, 3600);
    return db.reply(res, 401, { error: "Wrong admin key (or ADMIN_KEY not set in Vercel)." });
  }
  try {
    const b = req.body || {}, days = Math.min(Math.max(+b.days || 30, 1), 3650) * 864e5;
    if (b.action === "create") {
      const key = require("crypto").randomBytes(9).toString("base64url");
      await db.setj("shop:" + key, { name: String(b.name || "Gift Shop").slice(0, 60), whatsapp: String(b.whatsapp || "").slice(0, 20), active: true, exp: Date.now() + days, created: Date.now() });
      await db.cmd("SADD", "shops", key); return db.reply(res, 200, { key });
    }
    if (b.action === "extend" || b.action === "toggle") {
      const s = await db.getj("shop:" + b.key); if (!s) return db.reply(res, 404, { error: "Shop not found." });
      if (b.action === "extend") { s.exp = Math.max(Date.now(), s.exp) + days; s.active = true; } else s.active = s.active === false;
      await db.setj("shop:" + b.key, s); return db.reply(res, 200, { ok: true });
    }
    if (b.action === "update") {
      const s = await db.getj("shop:" + b.key); if (!s) return db.reply(res, 404, { error: "Shop not found." });
      s.name = String(b.name || s.name).slice(0, 60); s.whatsapp = String(b.whatsapp ?? s.whatsapp).slice(0, 20);
      await db.setj("shop:" + b.key, s); return db.reply(res, 200, { ok: true });
    }
    if (b.action === "remove") {
      if (!db.KEY.test(String(b.key || ""))) return db.reply(res, 400, { error: "Bad key." });
      for (const id of await db.cmd("SMEMBERS", "shopcards:" + b.key)) { await db.cmd("DEL", "card:" + id); await db.cmd("DEL", "views:" + id); }
      for (const id of await db.cmd("SMEMBERS", "shopimgs:" + b.key)) await db.cmd("DEL", "img:" + id);
      await db.cmd("DEL", "shopimgs:" + b.key); await db.cmd("DEL", "shopcards:" + b.key); await db.cmd("DEL", "shop:" + b.key); await db.cmd("SREM", "shops", b.key);
      return db.reply(res, 200, { ok: true });
    }
    // Admin app (/hq)
    if (typeof b.action === "string" && b.action.startsWith("hq-") || b.action && String(b.action).startsWith("push-")) {
      const H = require("./_hq");
      if (b.action === "hq-summary") return db.reply(res, 200, await H.summary());
      if (b.action === "hq-orders") return db.reply(res, 200, { orders: await H.orders() });
      if (b.action === "hq-pages") return db.reply(res, 200, { pages: await H.pages() });
      if (b.action === "hq-people") return db.reply(res, 200, { people: await H.people() });
      if (b.action === "hq-flags") return db.reply(res, 200, await require("./_camp").flags());
      // Cash payment taken in person: start Keepsake Pro, monthly or yearly (and make the page live, if it isn't yet) without Razorpay.
      // It is saved as a normal paid order (method: cash) so it shows in HQ sales and orders.
      if (b.action === "hq-cash") {
        const id = String(b.id || ""), plan = String(b.plan || "");
        if (!pay.proPlan(plan)) return db.reply(res, 400, { error: "Only Keepsake Pro (monthly or yearly) can be paid in cash." });
        if (!/^[a-z0-9]{8,16}$/i.test(id)) return db.reply(res, 400, { error: "Invalid page." });
        const memory = await db.getj("customer-memory:" + id);
        if (!memory) return db.reply(res, 404, { error: "Page not found." });
        const amt = pay.amountFor(memory, plan, { cash: true }); if (amt.error) return db.reply(res, 400, { error: amt.error });
        const rupees = Math.round(+b.amount); if (!(rupees >= 0 && rupees <= 100000)) return db.reply(res, 400, { error: "Enter the amount received." });
        const orderId = "cash_" + Date.now().toString(36) + require("crypto").randomBytes(3).toString("hex");
        await db.setj("order:" + orderId, { memory: id, owner: memory.owner, title: memory.title || "", kind: pay.kindOf(memory), plan, upgrade: amt.upgrade, amount: rupees, listPrice: amt.rupees, method: "cash", note: String(b.note || "").slice(0, 120), status: "created", created: Date.now() });
        await pay.markPaid(orderId, "cash");
        return db.reply(res, 200, { ok: true, orderId, amount: rupees });
      }
      // Pro given free (no payment): one or many shops, for a number of days. Or ended on one shop.
      // Page builder from Google Maps (private preview to show a shop owner)
      if (/^hq-pb-(search|build|quick)$/.test(b.action)) { const P = require("./_places"); if (await P.guard("hq", 300)) return db.reply(res, 429, { error: "Daily limit reached. Try tomorrow." });
        const r = b.action === "hq-pb-search" ? await P.search(b.q) : b.action === "hq-pb-quick" ? await P.quick(b, "hq") : await P.build(b.place, "hq"); return r.error ? db.reply(res, r.status || 400, { error: r.error }) : db.reply(res, 200, r); }
      if (b.action === "hq-scans") return db.reply(res, 200, await H.scans());
      // Tell Bing and the other IndexNow engines about every page in the sitemap (marketing pages and live shops).
      if (b.action === "hq-indexnow") { const S = require("./_shopseo"), shops = await S.sitemapShops();
        const urls = [...require("./seo").PAGES.map(p => S.BASE + p), ...shops.map(x => S.BASE + "/b/" + x.id)]; const ok = await S.indexNow(urls); return db.reply(res, ok ? 200 : 502, ok ? { ok: true, n: urls.length } : { error: "Couldn't reach IndexNow. Try again in a minute." }); }
      if (b.action === "hq-give-pro") { const r = await H.givePro(b.ids, b.days, b.note); return db.reply(res, r.error ? 400 : 200, r); }
      if (b.action === "hq-end-pro") { const r = await H.endPro(b.id); return db.reply(res, r.error ? 400 : 200, r); }
      if (b.action === "hq-team") return db.reply(res, 200, { team: await require("./_sales").team() });
      if (b.action === "hq-sp") { const x = await require("./_sales").detail(b.code); return x ? db.reply(res, 200, { sp: x }) : db.reply(res, 404, { error: "Salesperson not found." }); }
      if (b.action === "push-key") return db.reply(res, 200, { key: (await H.vapid()).pub });
      if (b.action === "push-sub") { const r = await H.subscribe(b.sub, b.label); return db.reply(res, r.error ? 400 : 200, r); }
      if (b.action === "push-unsub") return db.reply(res, 200, await H.unsubscribe(b.endpoint));
      if (b.action === "push-test") return db.reply(res, 200, await H.notify());
      if (b.action === "push-latest") return db.reply(res, 200, { order: await H.latest() });
      return db.reply(res, 400, { error: "Unknown action." });
    }
    if (b.action === "orders") {
      // Most recent 200 paid customer orders, newest first.
      const ids = await db.cmd("ZRANGE", "orders-paid", 0, 199, "REV");
      const orders = (await Promise.all(ids.map(async id => { const o = await db.getj("order:" + id); return o && { id, ...o }; }))).filter(Boolean);
      return db.reply(res, 200, { orders });
    }
    if (b.action === "ship") {
      const id = String(b.order || "");
      if (!/^order_\w+$/.test(id)) return db.reply(res, 400, { error: "Bad order." });
      const o = await db.getj("order:" + id);
      if (!o || !(o.plan === "frameQr" || o.plan === "frameNfc" || o.plan === "bizQr" || o.withQr) || o.status !== "paid") return db.reply(res, 404, { error: "Order not found." });
      o.ship = b.undo ? "to-ship" : "shipped"; o.tracking = String(b.tracking || o.tracking || "").slice(0, 120); o.shippedAt = b.undo ? null : Date.now();
      await db.setj("order:" + id, o); return db.reply(res, 200, { ok: true });
    }
    // Creator referral codes
    if (b.action === "codes") {
      const codes = await db.cmd("SMEMBERS", "refcodes");
      const rows = (await Promise.all(codes.map(async c => { const r = await ref.get(c); return r && { ...r, ...(await ref.stats(r)), recent: undefined }; }))).filter(Boolean);
      return db.reply(res, 200, { codes: rows.sort((a, b) => b.revenue - a.revenue || b.created - a.created) });
    }
    if (b.action === "code-create") {
      const x = await ref.create(b); if (x.error) return db.reply(res, 400, { error: x.error });
      return db.reply(res, 200, { code: x.rec });
    }
    if (b.action === "code-toggle" || b.action === "code-payout") {
      const r = await ref.get(b.code); if (!r) return db.reply(res, 404, { error: "Code not found." });
      if (b.action === "code-toggle") r.active = r.active === false;
      else { const n = Math.round(+b.amount); if (!(n > 0 && n < 10000000)) return db.reply(res, 400, { error: "Enter the amount you paid." }); r.paidOut = (+r.paidOut || 0) + n; r.payouts = [...(r.payouts || []), { at: Date.now(), amount: n }].slice(-100); }
      await db.setj("refcode:" + r.code, r); return db.reply(res, 200, { ok: true });
    }
    // Physical gift cards (/card-hq): designs, print runs, stock and card lookup
    if (typeof b.action === "string" && b.action.startsWith("cards-")) { const r = await require("./_cards").handle(b); return db.reply(res, r.status || (r.error ? 400 : 200), r); }
    // Coupon generator
    if (b.action === "coupon-create") { const x = await ref.createCoupons(b); if (x.error) return db.reply(res, 400, { error: x.error }); return db.reply(res, 200, { batch: x.batch }); }
    if (b.action === "coupons") return db.reply(res, 200, { batches: await ref.couponBatches() });
    if (b.action === "coupon-toggle") { const x = await ref.toggleBatch(String(b.id || "")); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "Not found." }); }
    // Prepaid QR codes for shops
    if (b.action === "prepaid-create") {
      const tier = b.tier === "vip" ? "site" : b.tier;
      let sp = "";
      if (b.sp) { const s = await require("./_sales").get(b.sp); if (!s) return db.reply(res, 400, { error: "Salesperson not found." }); sp = s.code; }
      const x = await pp.createBatch({ count: b.count, tier, shop: b.shop, note: b.note, comm: b.comm, phone: b.phone, sp }); if (x.error) return db.reply(res, 400, { error: x.error });
      return db.reply(res, 200, { batch: { id: x.batch.id, count: x.batch.count } });
    }
    if (b.action === "prepaid-unlock") { const r = await pp.unlock(b.code); return r ? db.reply(res, 200, { ok: true, code: r.code }) : db.reply(res, 404, { error: "Code not found." }); }
    // Salesperson accounts
    if (b.action === "sp-create") { const x = await require("./_sales").create(b); return x.error ? db.reply(res, 400, x) : db.reply(res, 200, x); }
    if (b.action === "sp-list") return db.reply(res, 200, { sps: await require("./_sales").list() });
    if (b.action === "sp-update") { const x = await require("./_sales").update(b.code, b); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "Salesperson not found." }); }
    if (b.action === "sp-payout") { const x = await require("./_sales").payout(b.code); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "Salesperson not found." }); }
    if (b.action === "prepaid-batches") return db.reply(res, 200, { batches: await pp.batches() });
    if (b.action === "prepaid-comm") { const x = await pp.setComm(b.id, b.comm); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "Batch not found." }); }
    if (b.action === "prepaid-payout") { const x = await pp.payout(b.id); return x ? db.reply(res, 200, x) : db.reply(res, 404, { error: "Batch not found." }); }
    if (b.action === "prepaid-batch") { const x = await pp.batchCodes(b.id); return x ? db.reply(res, 200, { batch: x }) : db.reply(res, 404, { error: "Batch not found." }); }
    if (b.action === "leads") {
      const rows = (await db.cmd("LRANGE", "leads", 0, 99)).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return db.reply(res, 200, { leads: rows });
    }
    const keys = await db.cmd("SMEMBERS", "shops");
    const shops = await Promise.all(keys.map(async key => { const s = await db.getj("shop:" + key); return s && { key, ...s, cards: +(await db.cmd("SCARD", "shopcards:" + key)) || 0 }; }));
    return db.reply(res, 200, { shops: shops.filter(Boolean).sort((a, b) => b.created - a.created) });
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
