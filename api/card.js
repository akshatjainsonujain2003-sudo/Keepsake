const db = require("./_db");
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "not configured" });
  try {
    const q = req.query || {};
    if (req.method === "POST") {
      const b = req.body || {}, s = await db.activeShop(b.key);
      if (!s) return db.reply(res, 403, { error: "Your plan is inactive or the shop key is invalid." });
      const data = b.data;
      if (!data || !Array.isArray(data.i) || JSON.stringify(data).length > 20000) return db.reply(res, 400, { error: "Card is empty or too large." });
      for (let n = 0; n < 6; n++) {
        const id = db.rid(6);
        if ((await db.setj("card:" + id, { shop: b.key, data, created: Date.now() }, "NX")) === "OK") { await db.cmd("SADD", "shopcards:" + b.key, id); return db.reply(res, 200, { id }); }
      }
      return db.reply(res, 500, { error: "Could not create a link, try again." });
    }
    if (req.method === "DELETE") {
      const c = await db.getj("card:" + q.id);
      if (!c || c.shop !== q.key) return db.reply(res, 403, { error: "Not allowed." });
      await db.cmd("DEL", "card:" + q.id); await db.cmd("DEL", "views:" + q.id); await db.cmd("SREM", "shopcards:" + q.key, q.id);
      return db.reply(res, 200, { ok: true });
    }
    if (q.list) {
      if (!db.KEY.test(String(q.key || "")) || !(await db.getj("shop:" + q.key))) return db.reply(res, 403, { error: "Invalid shop key." });
      const ids = (await db.cmd("SMEMBERS", "shopcards:" + q.key)).slice(0, 300);
      const cards = (await Promise.all(ids.map(async id => { const c = await db.getj("card:" + id); if (!c) return null; return { id, title: (c.data.t || "Memory").slice(0, 60), created: c.created, views: +(await db.cmd("GET", "views:" + id)) || 0 }; }))).filter(Boolean);
      return db.reply(res, 200, { cards: cards.sort((a, b) => b.created - a.created) });
    }
    const id = String(q.id || "");
    if (!/^[a-z0-9]{4,12}$/i.test(id)) return db.reply(res, 400, { error: "Bad link." });
    const c = await db.getj("card:" + id);
    if (!c) return db.reply(res, 404, { error: "Card not found." });
    const s = (await db.getj("shop:" + c.shop)) || {};
    await db.cmd("INCR", "views:" + id);
    return db.reply(res, 200, { data: c.data, shop: { name: s.name || "", whatsapp: s.whatsapp || "" } });
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
