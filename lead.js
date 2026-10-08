const db = require("./_db");
const clip = (v, n) => String(v || "").replace(/[<>]/g, "").trim().slice(0, n);
module.exports = async (req, res) => {
  if (req.method !== "POST") return db.reply(res, 405, { error: "POST only." });
  if (!db.ok()) return db.reply(res, 501, { error: "Enquiries are not set up yet." });
  try {
    const b = req.body || {};
    if (b.website) return db.reply(res, 200, { ok: true }); // honeypot for bots
    const lead = { name: clip(b.name, 80), phone: clip(b.phone, 30), business: clip(b.business, 80), type: clip(b.type, 40), message: clip(b.message, 600), at: Date.now() };
    if (!lead.name || lead.phone.replace(/\D/g, "").length < 7) return db.reply(res, 400, { error: "Please add your name and a valid phone number." });
    await db.cmd("LPUSH", "leads", JSON.stringify(lead)); await db.cmd("LTRIM", "leads", 0, 499);
    return db.reply(res, 200, { ok: true });
  } catch (e) { return db.reply(res, 500, { error: "Something went wrong. Please try again." }); }
};
