// Admin app (/hq): business summary, lists and new-order phone alerts. Not a route.
// Alerts are Web Push without a payload: the phone wakes up and the app's service worker
// fetches the latest order itself. The VAPID key pair is made once and kept in the database.
const crypto = require("crypto");
const db = require("./_db");

const DAY = 864e5, IST = 5.5 * 36e5;
const dayKey = t => new Date(t + IST).toISOString().slice(0, 10);
const startOfDay = t => { const d = new Date(t + IST); d.setUTCHours(0, 0, 0, 0); return d.getTime() - IST; };

async function mget(keys) {
  const out = [];
  for (let i = 0; i < keys.length; i += 200) out.push(...(await db.cmd("MGET", ...keys.slice(i, i + 200))));
  return out.map(v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } });
}
async function scan(pattern, cap = 5000) {
  let cur = "0", keys = [];
  do { const r = await db.cmd("SCAN", cur, "MATCH", pattern, "COUNT", 500); cur = String(r[0]); keys.push(...r[1]); } while (cur !== "0" && keys.length < cap);
  return [...new Set(keys)];
}
const SHIP = p => p === "frameQr" || p === "frameNfc" || p === "bizQr";
const pathFor = (kind, id) => (kind === "biz" ? "/b/" : kind === "site" ? "/s/" : "/m/") + id;

// Paid orders, newest first (up to 2000).
async function orders(limit = 2000) {
  const ids = await db.cmd("ZRANGE", "orders-paid", 0, limit - 1, "REV");
  const os = await mget(ids.map(id => "order:" + id));
  return ids.map((id, i) => os[i] && { id, ...os[i] }).filter(Boolean);
}

async function summary() {
  const os = await orders(), now = Date.now(), today = startOfDay(now);
  const sum = (from) => os.filter(o => o.paidAt >= from).reduce((a, o) => a + (+o.amount || 0), 0);
  const cnt = (from) => os.filter(o => o.paidAt >= from).length;
  const days = [];
  for (let i = 29; i >= 0; i--) { const s = today - i * DAY; days.push({ d: dayKey(s), v: 0, n: 0 }); }
  const idx = Object.fromEntries(days.map((d, i) => [d.d, i]));
  for (const o of os) { const k = idx[dayKey(o.paidAt)]; if (k !== undefined) { days[k].v += +o.amount || 0; days[k].n++; } }
  const kinds = { biz: 0, site: 0, card: 0 }; for (const o of os) if (o.paidAt >= now - 30 * DAY) kinds[o.kind in kinds ? o.kind : "card"] += +o.amount || 0;
  return {
    today: { rev: sum(today), n: cnt(today) }, week: { rev: sum(today - 6 * DAY), n: cnt(today - 6 * DAY) },
    month: { rev: sum(today - 29 * DAY), n: cnt(today - 29 * DAY) }, all: { rev: sum(0), n: os.length },
    toShip: os.filter(o => SHIP(o.plan) && o.ship !== "shipped").length,
    newShops: os.filter(o => o.kind === "biz" && !o.upgrade && o.paidAt >= today - 6 * DAY).length,
    days, kinds, recent: os.slice(0, 8), alerts: await subCount()
  };
}

// Every saved page (business pages, websites, cards) with its owner's contact, for following up.
async function pages() {
  const keys = (await scan("customer-memory:*")).filter(k => /^customer-memory:[a-z0-9]{8,16}$/i.test(k));
  const ms = await mget(keys), ids = keys.map(k => k.slice(16));
  const views = await db.cmd("MGET", ...(ids.length ? ids.map(id => "customer-memory-views:" + id) : ["-"]));
  const owners = [...new Set(ms.filter(Boolean).map(m => m.owner))];
  const us = await mget(owners.map(o => "customer:" + o)), U = Object.fromEntries(owners.map((o, i) => [o, us[i]]));
  return ids.map((id, i) => {
    const m = ms[i]; if (!m) return null; const u = U[m.owner] || {}, d = m.data || {};
    return { id, kind: m.kind === "biz" || m.kind === "site" ? m.kind : "card", title: m.title || "", cat: d.cat || "", area: d.area || "",
      live: m.paid !== false, created: m.created || 0, updated: m.updated || m.created || 0, views: +views[i] || 0, path: pathFor(m.kind, id),
      owner: { name: u.name || m.ownerName || "", email: u.email || "", phone: u.phone || "", wa: (d.wa || "").replace(/\D/g, "") }, plan: m.plan || "", qr: (m.qrOrders || []).length };
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
}

async function people() {
  const keys = (await scan("customer:*")).filter(k => /^customer:[a-f0-9]{16,128}$/.test(k));
  const us = await mget(keys), [os, ps] = await Promise.all([orders(), pages()]);
  const spent = {}, nPages = {}, live = {};
  for (const o of os) spent[o.owner] = (spent[o.owner] || 0) + (+o.amount || 0);
  return keys.map((k, i) => {
    const u = us[i]; if (!u) return null; const id = k.slice(9), mine = ps.filter(p => p.owner.email === u.email);
    return { id, name: u.name || "", email: u.email || "", phone: u.phone || "", created: u.created || 0, spent: spent[id] || 0, pages: mine.length, live: mine.filter(p => p.live).length };
  }).filter(Boolean).sort((a, b) => b.created - a.created);
}

// ---------- Web Push (VAPID, no payload) ----------
const b64u = buf => Buffer.from(buf).toString("base64url");
async function vapid() {
  let v = await db.getj("vapid-keys");
  if (!v) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = publicKey.export({ format: "jwk" });
    v = { pub: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")])), priv: privateKey.export({ format: "jwk" }) };
    if ((await db.cmd("SET", "vapid-keys", JSON.stringify(v), "NX")) !== "OK") v = await db.getj("vapid-keys");
  }
  return v;
}
const subKey = ep => "push-sub:" + crypto.createHash("sha256").update(ep).digest("hex").slice(0, 32);
// set = which group of phones: "push-subs" (admin) or "sp-push:<CODE>" (one salesperson).
async function subscribe(sub, label, set = "push-subs") {
  const ep = String((sub && sub.endpoint) || "");
  if (!/^https:\/\/[^\s]{10,800}$/.test(ep)) return { error: "Bad subscription." };
  const k = subKey(ep); await db.setj(k, { endpoint: ep, label: String(label || "").slice(0, 60), at: Date.now() }); await db.cmd("SADD", set, k);
  return { ok: true };
}
async function unsubscribe(ep, set = "push-subs") { const k = subKey(String(ep || "")); await db.cmd("SREM", set, k); return { ok: true }; }
async function subCount(set = "push-subs") { return +(await db.cmd("SCARD", set)) || 0; }

function jwt(aud, v) {
  const h = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" })), p = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://getkeepsake.in" }));
  const key = crypto.createPrivateKey({ key: v.priv, format: "jwk" });
  return h + "." + p + "." + b64u(crypto.sign("sha256", Buffer.from(h + "." + p), { key, dsaEncoding: "ieee-p1363" }));
}
async function notify(set = "push-subs") {
  const ks = await db.cmd("SMEMBERS", set); if (!ks.length) return { sent: 0 };
  const v = await vapid(), subs = await mget(ks); let sent = 0;
  await Promise.all(subs.map(async (s, i) => {
    if (!s) { await db.cmd("SREM", set, ks[i]); return; }
    try {
      const u = new URL(s.endpoint), ac = new AbortController(), t = setTimeout(() => ac.abort(), 4000);
      const r = await fetch(s.endpoint, { method: "POST", signal: ac.signal, headers: { Authorization: `vapid t=${jwt(u.origin, v)}, k=${v.pub}`, TTL: "86400", Urgency: "high", "Content-Length": "0" } });
      clearTimeout(t);
      if (r.status === 404 || r.status === 410) { await db.cmd("SREM", set, ks[i]); } else if (r.ok) sent++;
    } catch (e) {}
  }));
  return { sent };
}

// What the phone shows when an alert arrives: the newest paid order.
async function latest() {
  const [o] = await orders(1); if (!o) return null;
  const what = o.plan === "bizQr" ? (o.upgrade ? "Printed QR reorder" : "Business page + printed QR") : o.upgrade ? "Photo frame" : o.kind === "biz" ? "Business page" : o.kind === "site" ? "Website" : "Memory card";
  return { id: o.id, at: o.paidAt, amount: o.amount, title: o.title || "", what, ship: SHIP(o.plan) };
}

module.exports = { summary, orders, pages, people, vapid, subscribe, unsubscribe, notify, latest, subCount };
