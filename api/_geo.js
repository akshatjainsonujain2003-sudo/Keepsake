// Geofence walk-in reward + nearby SMS blast for business pages. Not a route: api/qr.js passes ?gf=<action> here,
// and vercel.json rewrites /api/geofence/<action> to it (so no extra serverless function is used).
//
// Storage (Upstash/Vercel KV):
//   customer-memory:<page>.gf = { on, lat, lng, r, offer, code, at }      the shop's geofence settings (owner only)
//   gfc:<page>              = SMS credits left (integer; starts at 50, recharged in packs of 500)
//   gfs:<page>:<+91phone>   = { phone, lat, lng, dist, optedAt, lastSmsAt }   one verified nearby subscriber
//   gfz:<page>              = sorted set of subscriber phones by opt-in time
//   gfcd:<page>:<+91phone>  = 24-hour check-in cooldown (one SMS per customer per shop per day)
//   gfl:<page>              = list of blast logs { id, tpl, n, credits, at } (newest first, last 100)
//   gfb:<page>              = 24-hour cooldown between promotional blasts
//
// SMS goes through MSG91's Flow API using TRAI DLT-approved templates. Set in Vercel:
//   MSG91_AUTH_KEY, MSG91_SENDER (6-letter DLT header), and one template id per message below
//   (MSG91_TPL_CHECKIN, MSG91_TPL_OFFER, MSG91_TPL_COMEBACK, MSG91_TPL_NEW). The exact texts to register are in
//   tools/geofence/DLT-TEMPLATES.md. Until MSG91 is set up, check-ins still work and show the code on screen.
const crypto = require("crypto");
const db = require("./_db");
const pay = require("./_pay");

const env = process.env;
const ID = /^[a-z0-9]{8,16}$/i;
const START_CREDITS = 50;
const PACK = () => Math.max(1, Math.round(+env.SMS_PACK_SIZE || 500));
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error, x) => ({ status, error, ...(x || {}) });
const ph10 = p => { const d = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? d : ""; };
const e164 = d => "+91" + d;
const mask = p => { const d = p.slice(-10); return "+91 " + d.slice(0, 2) + "••• ••" + d.slice(-3); };

// Great-circle distance in metres.
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, t = x => x * Math.PI / 180;
  const a = Math.sin(t(lat2 - lat1) / 2) ** 2 + Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
const okLat = v => typeof v === "number" && isFinite(v) && v >= -90 && v <= 90;
const okLng = v => typeof v === "number" && isFinite(v) && v >= -180 && v <= 180;
// Promotional SMS may only be sent 10 am – 9 pm India time (TRAI).
const promoHours = () => { const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours(); return h >= 10 && h < 21; };

// ---------- DLT templates ----------
// vars are sent to MSG91 as var1, var2… in this order; each must stay within DLT's 30-character limit per variable,
// so the link is fixed text in the template and only the page id (8–16 letters) is a variable.
const TPL = {
  checkin: { name: "Walk-in code", env: "MSG91_TPL_CHECKIN", vars: s => [s.offer, s.shop, s.code, s.pid],
    text: s => `Your walk-in reward ${s.offer} at ${s.shop}. Show code ${s.code} at the counter. https://getkeepsake.in/b/${s.pid} - GetKeepsake` },
  offer: { name: "Today's offer", env: "MSG91_TPL_OFFER", promo: true, vars: s => [s.shop, s.offer, s.code, s.pid],
    text: s => `${s.shop}: ${s.offer} today. Show code ${s.code} at the counter. https://getkeepsake.in/b/${s.pid} - GetKeepsake` },
  comeback: { name: "We miss you", env: "MSG91_TPL_COMEBACK", promo: true, vars: s => [s.shop, s.offer, s.pid],
    text: s => `${s.shop} misses you! Visit this week and get ${s.offer}. https://getkeepsake.in/b/${s.pid} - GetKeepsake` },
  newin: { name: "New at the shop", env: "MSG91_TPL_NEW", promo: true, vars: s => [s.shop, s.note, s.pid],
    text: s => `New at ${s.shop}: ${s.note}. See it here: https://getkeepsake.in/b/${s.pid} - GetKeepsake` }
};
const v30 = s => String(s || "").slice(0, 30);
const smsReady = () => !!env.MSG91_AUTH_KEY;
const tplReady = k => smsReady() && !!env[TPL[k].env];

// Sends one DLT template to many numbers through MSG91 (chunks of 500). Returns how many were accepted.
async function msg91(tplKey, list) {
  if (!tplReady(tplKey) || !list.length) return 0;
  let sent = 0;
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    const body = { template_id: env[TPL[tplKey].env], short_url: "0", recipients: chunk.map(x => { const o = { mobiles: x.phone.replace(/^\+/, "") }; x.vars.forEach((v, j) => o["var" + (j + 1)] = v30(v)); return o; }) };
    if (env.MSG91_SENDER) body.sender = env.MSG91_SENDER;
    try {
      const r = await fetch("https://control.msg91.com/api/v5/flow/", { method: "POST", headers: { authkey: env.MSG91_AUTH_KEY, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.type !== "error") sent += chunk.length; else console.error("MSG91 rejected the SMS:", r.status, j.message || "");
    } catch (e) { console.error("MSG91 unreachable:", e.message); }
  }
  return sent;
}

// ---------- credits (atomic) ----------
const ckey = id => "gfc:" + id;
async function credits(id) { await db.cmd("SET", ckey(id), String(START_CREDITS), "NX"); return +(await db.cmd("GET", ckey(id))) || 0; }
async function take(id, n) {
  await db.cmd("SET", ckey(id), String(START_CREDITS), "NX");
  const left = await db.cmd("DECRBY", ckey(id), n);
  if (left < 0) { await db.cmd("INCRBY", ckey(id), n); return false; }
  return true;
}
const give = (id, n) => db.cmd("INCRBY", ckey(id), n);

async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const shopName = m => clip((m.data && m.data.t) || m.title || "our shop", 30);
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }

// What a customer's phone may know about the geofence (never the coupon code).
function publicInfo(m) {
  const g = m.gf;
  return g && g.on && okLat(g.lat) && okLng(g.lng) && g.offer && m.paid !== false ? { on: true, lat: g.lat, lng: g.lng, r: g.r, offer: g.offer } : null;
}

// ---------- customer: check in from the shop's page ----------
async function checkin(b, ip) {
  const m = await page(b.id);
  if (!m || m.paid === false) return E(404, "This shop page wasn't found.");
  const g = m.gf;
  if (!publicInfo(m) || !g.code) return E(409, "This shop has no walk-in offer right now.");
  if (b.consent !== true) return E(400, "Tick the box to get your code by SMS.");
  const p = ph10(b.phone); if (!p) return E(400, "Enter your 10-digit mobile number.");
  const lat = +b.lat, lng = +b.lng, acc = Math.max(0, +b.acc || 0);
  if (!okLat(lat) || !okLng(lng)) return E(400, "We couldn't read your location. Allow location and try again.");
  if (acc > 1000) return E(400, "Your location isn't precise enough. Turn on GPS and try again.");
  if (await limit("gf-ip:" + ip, 12, 3600) || await limit("gf-day:" + b.id, 400, 86400)) return E(429, "Too many tries. Please wait a little.");
  // Checked again here, not trusted from the phone: the reported position must be inside the radius
  // (a little slack for a GPS fix that is fuzzy, never more than 60 m).
  const dist = Math.round(haversine(g.lat, g.lng, lat, lng));
  if (dist - Math.min(acc, 60) > g.r) return E(403, `You're about ${dist} m away. Come within ${g.r} m of ${shopName(m)} to unlock it.`, { distance: dist });
  const phone = e164(p), sk = "gfs:" + b.id + ":" + phone, now = Date.now();
  const sub = (await db.getj(sk)) || { phone, optedAt: now };
  Object.assign(sub, { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, dist, seenAt: now });
  // One SMS per customer per shop per day, so nobody can drain the shop's credits.
  if ((await db.cmd("SET", "gfcd:" + b.id + ":" + phone, "1", "NX", "EX", 86400)) !== "OK") {
    await db.setj(sk, sub);
    return { ok: true, again: true, distance: dist, masked: mask(phone), message: "Your code was already sent to this number today. Check your SMS." };
  }
  await db.setj(sk, sub); await db.cmd("ZADD", "gfz:" + b.id, sub.optedAt, phone);
  const vars = { offer: g.offer, shop: shopName(m), code: g.code, pid: b.id };
  let sms = false;
  if (tplReady("checkin") && await take(b.id, 1)) {
    sms = (await msg91("checkin", [{ phone, vars: TPL.checkin.vars(vars) }])) === 1;
    if (sms) { sub.lastSmsAt = now; await db.setj(sk, sub); } else await give(b.id, 1);
  }
  // No SMS possible (not set up, out of credits, or MSG91 failed): show the code on screen so the customer still gets it.
  return { ok: true, distance: dist, sms, masked: mask(phone), ...(sms ? {} : { code: g.code }), offer: g.offer };
}

// ---------- customer: stop SMS from this shop ----------
async function optout(b) {
  const p = ph10(b.phone); if (!p || !ID.test(String(b.id || ""))) return E(400, "Enter your 10-digit mobile number.");
  const phone = e164(p);
  await db.cmd("DEL", "gfs:" + b.id + ":" + phone); await db.cmd("ZREM", "gfz:" + b.id, phone);
  return { ok: true };
}

// ---------- owner ----------
async function owner(b, ctx) {
  const m = await page(b.id);
  if (!m) return { err: E(404, "This shop page wasn't found.") };
  const u = await ctx.user();
  if (!u || u.id !== m.owner) return { err: E(401, "Please log in as the owner of this page.") };
  return { m, u };
}
async function status(id, m) {
  const phones = await db.cmd("ZRANGE", "gfz:" + id, 0, -1, "REV");
  const recent = phones.slice(0, 30), subs = recent.length ? (await db.cmd("MGET", ...recent.map(p => "gfs:" + id + ":" + p))).map((v, i) => { try { const s = v && JSON.parse(v); return s ? { ...s, i } : null; } catch (e) { return null; } }).filter(Boolean) : [];
  const logs = (await db.cmd("LRANGE", "gfl:" + id, 0, 19)).map(v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch (e) { return null; } }).filter(Boolean);
  const wk = Date.now() - 7 * 864e5;
  return {
    ok: true, gf: m.gf || { on: false, r: 250, offer: "", code: "" }, credits: await credits(id),
    subscribers: phones.length, week: subs.filter(s => s.seenAt >= wk).length,
    recent: subs.map(s => ({ i: s.i, phone: mask(s.phone), dist: s.dist, at: s.seenAt || s.optedAt })),
    logs, smsReady: smsReady(), promoHours: promoHours(), nextBlast: Math.max(0, +(await db.cmd("TTL", "gfb:" + id)) || 0),
    templates: Object.entries(TPL).filter(([k, t]) => t.promo).map(([k, t]) => ({ key: k, name: t.name, ready: tplReady(k), preview: t.text({ shop: shopName(m), offer: (m.gf && m.gf.offer) || "your offer", code: (m.gf && m.gf.code) || "CODE", pid: id, note: "[your note]" }) })),
    checkinReady: tplReady("checkin"), pack: { size: PACK(), price: pay.catalog().sms.price }
  };
}
async function settings(b, m) {
  const g = Object.assign({ on: false, r: 250, offer: "", code: "" }, m.gf || {});
  if (b.lat !== undefined || b.lng !== undefined) {
    const lat = +b.lat, lng = +b.lng;
    if (!okLat(lat) || !okLng(lng)) return E(400, "That location isn't valid. Tap Lock my store location again.");
    g.lat = Math.round(lat * 1e6) / 1e6; g.lng = Math.round(lng * 1e6) / 1e6; g.at = Date.now();
    const acc = Math.round(+b.acc); if (acc >= 0 && acc < 10000) g.acc = acc; else delete g.acc;
  }
  if (b.r !== undefined) { const r = Math.round(+b.r); if (!(r >= 50 && r <= 1000)) return E(400, "Pick a radius between 50 m and 1000 m."); g.r = r; }
  if (b.offer !== undefined) g.offer = clip(b.offer, 30);
  if (b.code !== undefined) { const c = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); if (b.code && c.length < 3) return E(400, "The coupon code needs 3 to 12 letters or numbers."); g.code = c; }
  if (b.on !== undefined) g.on = !!b.on;
  if (g.on && !(okLat(g.lat) && okLng(g.lng))) return E(400, "Lock your store location first (stand at your counter and tap the button).");
  if (g.on && (!g.offer || !g.code)) return E(400, "Add the walk-in offer and a coupon code first.");
  // Fresh copy so nothing else on the page is overwritten.
  const key = "customer-memory:" + b.id, cur = await db.getj(key); cur.gf = g; await db.setj(key, cur);
  return { ok: true, gf: g };
}
async function blast(b, m) {
  const t = TPL[b.tpl];
  if (!t || !t.promo) return E(400, "Pick a message to send.");
  if (!tplReady(b.tpl)) return E(503, "This SMS template isn't approved and set up yet.");
  if (!promoHours()) return E(409, "Promotional SMS can only be sent between 10 am and 9 pm.");
  const g = m.gf || {};
  if ((b.tpl === "offer" || b.tpl === "comeback") && !g.offer) return E(400, "Add your walk-in offer first.");
  if (b.tpl === "offer" && !g.code) return E(400, "Add a coupon code first.");
  const note = clip(b.note, 30); if (b.tpl === "newin" && !note) return E(400, "Write what's new (up to 30 letters).");
  const phones = await db.cmd("ZRANGE", "gfz:" + b.id, 0, 4999);
  if (!phones.length) return E(409, "No nearby subscribers yet.");
  // One promotional blast per shop per day.
  if ((await db.cmd("SET", "gfb:" + b.id, "1", "NX", "EX", 86400)) !== "OK") return E(429, "You've already sent a blast today. Try again tomorrow.");
  if (!(await take(b.id, phones.length))) { await db.cmd("DEL", "gfb:" + b.id); return E(402, `You need ${phones.length} SMS credits for this. Recharge to send.`, { need: phones.length, credits: await credits(b.id) }); }
  const vars = t.vars({ shop: shopName(m), offer: g.offer, code: g.code, pid: b.id, note });
  const sent = await msg91(b.tpl, phones.map(phone => ({ phone, vars })));
  if (sent < phones.length) await give(b.id, phones.length - sent); // refund what MSG91 didn't accept
  if (!sent) { await db.cmd("DEL", "gfb:" + b.id); return E(502, "The SMS service didn't accept the messages. No credits were used. Try again in a few minutes."); }
  const log = { id: crypto.randomBytes(5).toString("hex"), tpl: b.tpl, n: sent, credits: sent, at: Date.now() };
  await db.cmd("LPUSH", "gfl:" + b.id, JSON.stringify(log)); await db.cmd("LTRIM", "gfl:" + b.id, 0, 99);
  return { ok: true, log, credits: await credits(b.id) };
}
async function removeSub(b) {
  const phones = await db.cmd("ZRANGE", "gfz:" + b.id, 0, -1, "REV"), phone = phones[Math.round(+b.index)]; if (!phone) return E(404, "Subscriber not found.");
  await db.cmd("DEL", "gfs:" + b.id + ":" + phone); await db.cmd("ZREM", "gfz:" + b.id, phone);
  return { ok: true };
}

// action = checkin | optout | status | settings | blast | remove
async function handle(action, b, ctx) {
  b = b || {};
  if (action === "checkin") return checkin(b, ctx.ip);
  if (action === "optout") return optout(b);
  const o = await owner(b, ctx); if (o.err) return o.err;
  if (action === "status") return status(b.id, o.m);
  if (action === "settings") { const r = await settings(b, o.m); return r.error ? r : status(b.id, await page(b.id)); }
  if (action === "blast") return blast(b, o.m);
  if (action === "remove") return removeSub(b);
  return E(400, "Unknown action.");
}
module.exports = { handle, publicInfo, give, haversine, TPL };
