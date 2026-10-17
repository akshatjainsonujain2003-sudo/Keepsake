const db = require("./_db");
const pp = require("./_prepaid");
const ref = require("./_ref");
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Storage not configured. Add Upstash Redis in Vercel → Storage." });
  const ak = process.env.ADMIN_KEY;
  if (!ak || req.headers["x-admin-key"] !== ak) return db.reply(res, 401, { error: "Wrong admin key (or ADMIN_KEY not set in Vercel)." });
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
      if (!o || !(o.plan === "frameQr" || o.plan === "frameNfc") || o.status !== "paid") return db.reply(res, 404, { error: "Order not found." });
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
