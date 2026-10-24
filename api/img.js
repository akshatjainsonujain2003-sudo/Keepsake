// Stores card photos (already shrunk by the browser) and serves them with long cache headers.
const db = require("./_db");
const auth = require("./customer-auth");
const MAGIC = { jpeg: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, png: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, webp: b => b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP" };
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "not configured" });
  try {
    if (req.method === "POST") {
      const b = req.body || {};
      // Read a menu / rate card photo or PDF with AI and return its items (nothing is stored).
      if (b.action === "scan") {
        const user = await auth.currentUser(req);
        if (!user) return db.reply(res, 401, { error: "Please log in to scan a menu." });
        const r = await require("./_scan").scan(b, user);
        return r.error ? db.reply(res, r.status || 400, { error: r.error, ...(r.detail ? { detail: r.detail } : {}), ...(r.busy ? { busy: true } : {}) }) : db.reply(res, 200, r);
      }
      // Uploader is either a logged-in customer or (kept for later) a shop with an active key.
      let owner;
      if (b.key) {
        if (!(await db.activeShop(b.key))) return db.reply(res, 403, { error: "Your plan is inactive or the shop key is invalid." });
        owner = { set: "shopimgs:" + b.key, max: 400 };
      } else {
        const user = await auth.currentUser(req);
        if (!user) return db.reply(res, 401, { error: "Please log in to upload photos." });
        // Shops with the online store upload a photo per product.
        owner = { set: "custimgs:" + user.id, max: (await db.cmd("GET", "store-user:" + user.id)) ? 1500 : 150 };
      }
      const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
      if (!m) return db.reply(res, 400, { error: "Please upload a JPG, PNG or WebP photo." });
      const buf = Buffer.from(m[2], "base64");
      // Photos printed in a frame need more detail than photos shown on a phone.
      const maxKb = b.purpose === "print" && !b.key ? 700 : 350;
      if (buf.length > maxKb * 1024) return db.reply(res, 413, { error: "Photo is too large. Try a smaller one." });
      if (!MAGIC[m[1]](buf)) return db.reply(res, 400, { error: "That file isn't a valid image." });
      if ((await db.cmd("SCARD", owner.set)) >= owner.max) return db.reply(res, 429, { error: "Photo limit reached for your account. Contact us for more." });
      const id = db.rid(10);
      await db.setj("img:" + id, { t: m[1], b: m[2] }); await db.cmd("SADD", owner.set, id);
      return db.reply(res, 200, { url: "/api/img?id=" + id });
    }
    const id = String((req.query || {}).id || "");
    if (!/^[a-z0-9]{6,16}$/i.test(id)) return db.reply(res, 400, { error: "Bad image link." });
    const o = await db.getj("img:" + id);
    if (!o) return db.reply(res, 404, { error: "Image not found." });
    res.setHeader("Content-Type", "image/" + o.t); res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(Buffer.from(o.b, "base64"));
  } catch (e) { return db.reply(res, 500, { error: "Server error." }); }
};
