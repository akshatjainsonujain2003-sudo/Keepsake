const db = require("./_db");
const lock = require("./_lock");
const shopOf = async c => { const s = (await db.getj("shop:" + c.shop)) || {}; return { name: s.name || "", whatsapp: s.whatsapp || "" }; };
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "not configured" });
  try {
    const q = req.query || {};
    if (req.method === "POST" && (req.body || {}).unlock) {
      // A visitor opening a password-protected card. The card's content is only sent when the password (or its owner's shop key) is right.
      const b = req.body, id = String(b.id || "");
      if (!/^[a-z0-9]{4,12}$/i.test(id)) return db.reply(res, 400, { error: "Bad link." });
      const c = await db.getj("card:" + id);
      if (!c) return db.reply(res, 404, { error: "Card not found." });
      if (c.lock && !(db.KEY.test(String(b.key || "")) && b.key === c.shop)) {
        const r = await lock.attempt(req, "c", id, b.password, c.lock);
        if (!r.ok) return db.reply(res, r.status, { error: r.error, locked: true });
      }
      await db.cmd("INCR", "views:" + id);
      return db.reply(res, 200, { data: c.data, shop: await shopOf(c) });
    }
    if (req.method === "POST") {
      const b = req.body || {}, s = await db.activeShop(b.key);
      if (!s) return db.reply(res, 403, { error: "Your plan is inactive or the shop key is invalid." });
      const data = b.data;
      if (!data || !Array.isArray(data.i) || JSON.stringify(data).length > 20000) return db.reply(res, 400, { error: "Card is empty or too large." });
      const pw = lock.clean(b.lock);
      if (pw === null) return db.reply(res, 400, { error: `Choose a password of ${lock.MIN} to ${lock.MAX} characters.` });
      const rec = { shop: b.key, data, created: Date.now() };
      if (pw) rec.lock = await lock.make(pw);
      for (let n = 0; n < 6; n++) {
        const id = db.rid(6);
        if ((await db.setj("card:" + id, rec, "NX")) === "OK") { await db.cmd("SADD", "shopcards:" + b.key, id); return db.reply(res, 200, { id, locked: !!pw }); }
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
      const cards = (await Promise.all(ids.map(async id => { const c = await db.getj("card:" + id); if (!c) return null; return { id, title: (c.data.t || "Memory").slice(0, 60), created: c.created, locked: !!c.lock, views: +(await db.cmd("GET", "views:" + id)) || 0 }; }))).filter(Boolean);
      return db.reply(res, 200, { cards: cards.sort((a, b) => b.created - a.created) });
    }
    const id = String(q.id || "");
    if (!/^[a-z0-9]{4,12}$/i.test(id)) return db.reply(res, 400, { error: "Bad link." });
    const c = await db.getj("card:" + id);
    if (!c) return db.reply(res, 404, { error: "Card not found." });
    const shop = await shopOf(c);
    if (c.lock) return db.reply(res, 200, { locked: true, shop: { name: shop.name } }); // nothing about the card itself is sent
    await db.cmd("INCR", "views:" + id);
    return db.reply(res, 200, { data: c.data, shop });
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
