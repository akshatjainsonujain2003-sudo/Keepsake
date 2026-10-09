const db = require("./_db");
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "not configured" });
  try {
    const key = String((req.query || {}).key || "");
    if (!db.KEY.test(key)) return db.reply(res, 400, { error: "Enter your shop key." });
    const s = await db.getj("shop:" + key);
    if (!s) return db.reply(res, 403, { error: "Shop key not recognised." });
    if (s.active === false || s.exp <= Date.now())
      return db.reply(res, 403, { error: "Your plan has expired or is paused. Please contact " + (s.whatsapp || "your provider") + " to renew." });
    return db.reply(res, 200, { ok: true, name: s.name, whatsapp: s.whatsapp, exp: s.exp });
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
