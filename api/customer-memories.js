const db = require("./_db");
const auth = require("./customer-auth");
const crypto = require("crypto");
const idPattern = /^[a-z0-9]{8,16}$/i;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n);
module.exports = async (req, res) => {
  if (!db.ok()) return db.reply(res, 501, { error: "Memory storage is not configured yet." });
  try {
    const q = req.query || {};
    if (req.method === "GET" && q.id) {
      const id = String(q.id);
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory link." });
      const memory = await db.getj("customer-memory:" + id);
      if (!memory) return db.reply(res, 404, { error: "Memory not found." });
      await db.cmd("INCR", "customer-memory-views:" + id);
      return db.reply(res, 200, { id, data: memory.data, title: memory.title, created: memory.created });
    }
    const user = await auth.currentUser(req);
    if (!user) return db.reply(res, 401, { error: "Please log in to manage your memories." });
    if (req.method === "GET") {
      const ids = await db.cmd("SMEMBERS", "customer-memories:" + user.id);
      const memories = (await Promise.all(ids.map(async id => {
        const m = await db.getj("customer-memory:" + id);
        if (!m || m.owner !== user.id) return null;
        return { id, title: m.title || "Our Memories", created: m.created, updated: m.updated || m.created, views: +(await db.cmd("GET", "customer-memory-views:" + id)) || 0 };
      }))).filter(Boolean).sort((a, b) => b.created - a.created);
      return db.reply(res, 200, { memories });
    }
    if (req.method === "POST") {
      const b = req.body || {}, data = b.data;
      if (!data || !Array.isArray(data.i) || JSON.stringify(data).length > 30000)
        return db.reply(res, 400, { error: "This memory is empty or too large. Reduce its content and try again." });
      const id = crypto.randomBytes(6).toString("hex");
      const now = Date.now();
      const memory = { owner: user.id, ownerName: user.name, title: clip(data.t || "Our Memories", 80) || "Our Memories", data, created: now, updated: now };
      await db.setj("customer-memory:" + id, memory, "NX");
      await db.cmd("SADD", "customer-memories:" + user.id, id);
      return db.reply(res, 201, { id, url: "/m/" + id, title: memory.title, created: now });
    }
    if (req.method === "PUT") {
      const b = req.body || {}, id = String(b.id || ""), data = b.data;
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory." });
      if (!data || !Array.isArray(data.i) || JSON.stringify(data).length > 30000)
        return db.reply(res, 400, { error: "This memory is empty or too large." });
      const key = "customer-memory:" + id, memory = await db.getj(key);
      if (!memory || memory.owner !== user.id) return db.reply(res, 404, { error: "Memory not found in your account." });
      memory.data = data; memory.title = clip(data.t || "Our Memories", 80) || "Our Memories"; memory.updated = Date.now();
      await db.setj(key, memory);
      return db.reply(res, 200, { id, url: "/m/" + id, title: memory.title, updated: memory.updated });
    }
    if (req.method === "DELETE") {
      const id = String(q.id || (req.body || {}).id || "");
      if (!idPattern.test(id)) return db.reply(res, 400, { error: "Invalid memory." });
      const key = "customer-memory:" + id, memory = await db.getj(key);
      if (!memory || memory.owner !== user.id) return db.reply(res, 404, { error: "Memory not found in your account." });
      await db.cmd("DEL", key, "customer-memory-views:" + id);
      await db.cmd("SREM", "customer-memories:" + user.id, id);
      return db.reply(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return db.reply(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return db.reply(res, 500, { error: "Could not process the memory. Please try again." });
  }
};
