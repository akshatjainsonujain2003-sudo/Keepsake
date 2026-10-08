const db = require("./_db");
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
      await db.cmd("DEL", "shopcards:" + b.key); await db.cmd("DEL", "shop:" + b.key); await db.cmd("SREM", "shops", b.key);
      return db.reply(res, 200, { ok: true });
    }
    if (b.action === "leads") {
      const rows = (await db.cmd("LRANGE", "leads", 0, 99)).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return db.reply(res, 200, { leads: rows });
    }
    const keys = await db.cmd("SMEMBERS", "shops");
    const shops = await Promise.all(keys.map(async key => { const s = await db.getj("shop:" + key); return s && { key, ...s, cards: +(await db.cmd("SCARD", "shopcards:" + key)) || 0 }; }));
    return db.reply(res, 200, { shops: shops.filter(Boolean).sort((a, b) => b.created - a.created) });
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
