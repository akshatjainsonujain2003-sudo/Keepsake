// A creator's own sales page data. GET ?code=X&key=K -> sales, revenue, commission owed (no customer details).
const db = require("./_db");
const ref = require("./_ref");
const crypto = require("crypto");
const same = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Storage is not configured yet." });
  try {
    const q = req.query || {}, r = await ref.get(q.code);
    if (!r || !same(r.key, q.key)) return db.reply(res, 404, { error: "This link isn't valid. Ask Keepsake for your creator link." });
    const s = await ref.stats(r);
    return db.reply(res, 200, { code: r.code, name: r.name, discount: r.discount, commission: r.commission, active: r.active !== false, ...s });
  } catch (e) { return db.reply(res, 500, { error: "Could not load your sales." }); }
};
