// Salespeople for business pages.
// sp:<CODE>          = { code, name, phone, comm, salt, hash, tok, active, created, paidOut, payouts:[] }
// sps                = zset of codes
// sp-shops:<CODE>    = zset of business page ids they activated (score = time)
// sp-credit:<PAGE>   = which salesperson got credit for a page (only ever once)
// sp-visits:<CODE>   = list of shop visits they logged (newest first, last 1000): { id, at, shop, area, phone, kind, status, note, lat, lng, acc }
const crypto = require("crypto");
const db = require("./_db");
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const norm = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
const valid = c => /^SP[A-Z0-9]{4,8}$/.test(c);
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString("hex");
const same = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const newPin = () => String(crypto.randomInt(0, 1e6)).padStart(6, "0");
const pub = s => ({ code: s.code, name: s.name, phone: s.phone || "", comm: s.comm || 0, active: s.active !== false, created: s.created });

async function get(code) { code = norm(code); return valid(code) ? await db.getj("sp:" + code) : null; }

async function create({ name, phone, comm }) {
  name = String(name || "").trim().slice(0, 50); if (!name) return { error: "Enter the salesperson's name." };
  let code = "";
  for (let i = 0; i < 20 && !code; i++) {
    const c = "SP" + [...crypto.randomBytes(4)].map(b => ALPHA[b % ALPHA.length]).join("");
    if ((await db.cmd("SET", "sp-lock:" + c, "1", "NX")) === "OK") code = c;
  }
  const pin = newPin(), salt = crypto.randomBytes(12).toString("hex");
  const s = { code, name, phone: String(phone || "").replace(/[^\d+ ]/g, "").slice(0, 16), comm: Math.max(0, Math.min(5000, Math.round(+comm || 0))),
    salt, hash: hashPin(pin, salt), tok: crypto.randomBytes(18).toString("hex"), active: true, created: Date.now(), paidOut: 0, payouts: [] };
  await db.setj("sp:" + code, s); await db.cmd("ZADD", "sps", s.created, code);
  return { sp: pub(s), pin };
}
async function update(code, f) {
  const s = await get(code); if (!s) return null;
  if (f.comm !== undefined) s.comm = Math.max(0, Math.min(5000, Math.round(+f.comm || 0)));
  if (f.active !== undefined) s.active = !!f.active;
  if (f.phone !== undefined) s.phone = String(f.phone || "").replace(/[^\d+ ]/g, "").slice(0, 16);
  let pin;
  if (f.resetPin) { pin = newPin(); s.salt = crypto.randomBytes(12).toString("hex"); s.hash = hashPin(pin, s.salt); s.tok = crypto.randomBytes(18).toString("hex"); }
  await db.setj("sp:" + s.code, s); return { sp: pub(s), ...(pin ? { pin } : {}) };
}
// Credit a salesperson once for a business page that was just paid for.
async function credit(code, pageId) {
  const s = await get(code); if (!s || s.active === false) return false;
  if ((await db.cmd("SET", "sp-credit:" + pageId, s.code, "NX")) !== "OK") return false;
  await db.cmd("ZADD", "sp-shops:" + s.code, Date.now(), pageId);
  // Phone alert to the salesperson's app (best effort).
  try { const H = require("./_hq"); await Promise.race([H.notify("sp-push:" + s.code), new Promise(r => setTimeout(r, 5000))]); } catch (e) {}
  return true;
}
async function summary(s) {
  const ids = await db.cmd("ZRANGE", "sp-shops:" + s.code, 0, -1, "REV"), n = ids.length, comm = s.comm || 0, paid = Math.min(s.paidOut || 0, n);
  return { ...pub(s), shops: n, earned: n * comm, paid: paid * comm, owed: (n - paid) * comm, ids };
}
async function list() {
  const codes = await db.cmd("ZRANGE", "sps", 0, -1, "REV");
  return (await Promise.all(codes.map(async c => { const s = await db.getj("sp:" + c); if (!s) return null; const x = await summary(s); delete x.ids; return x; }))).filter(Boolean);
}
async function payout(code) {
  const s = await get(code); if (!s) return null;
  const n = +(await db.cmd("ZCARD", "sp-shops:" + s.code)) || 0, k = n - (s.paidOut || 0);
  if (k <= 0) return { paid: 0 };
  s.payouts = (s.payouts || []).concat({ at: Date.now(), shops: k, amount: k * (s.comm || 0) }).slice(-100); s.paidOut = n;
  await db.setj("sp:" + s.code, s); return { paid: k * (s.comm || 0), shops: k };
}
// Login with code + PIN (10 tries per hour per code). Returns a token kept on the salesperson's phone.
async function login(code, pin, ip) {
  code = norm(code);
  const t = "sp-tries:" + code + ":" + ip, n = await db.cmd("INCR", t); if (n === 1) await db.cmd("EXPIRE", t, 3600);
  if (n > 10) return { status: 429, error: "Too many tries. Please wait an hour, or ask GetKeepsake to reset your PIN." };
  const s = await get(code);
  if (!s || s.active === false || !same(s.hash, hashPin(String(pin || "").replace(/\D/g, ""), s.salt))) return { status: 401, error: "Wrong code or PIN." };
  return { code: s.code, tok: s.tok, name: s.name };
}
async function me(code, tok) {
  const s = await get(code); if (!s || s.active === false || !same(s.tok, tok)) return null;
  const x = await summary(s);
  const shops = (await Promise.all(x.ids.slice(0, 200).map(async id => {
    const m = await db.getj("customer-memory:" + id), at = +(await db.cmd("ZSCORE", "sp-shops:" + s.code, id)) || 0;
    return m ? { name: String(m.title || "Shop").slice(0, 60), at, url: "/b/" + id, area: String((m.data && m.data.area) || "").slice(0, 40) } : null;
  }))).filter(Boolean);
  delete x.ids;
  const vs = await visits(s.code, 250), t0 = dayStart(Date.now());
  return { ...x, shopsList: shops, payouts: (s.payouts || []).map(p => ({ at: p.at, amount: p.amount, shops: p.shops })), visits: vs, visitsToday: vs.filter(v => v.at >= t0).length };
}
// ---------- field visits ----------
const STATUS = { sold: "Sold", interested: "Interested", follow: "Follow up", no: "Not interested" };
const DAY = 864e5, IST = 5.5 * 36e5, dayStart = t => { const d = new Date(t + IST); d.setUTCHours(0, 0, 0, 0); return d.getTime() - IST; };
const txt = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
async function auth(code, tok) { const s = await get(code); return s && s.active !== false && same(s.tok, tok) ? s : null; }
async function visits(code, n = 300) { return (await db.cmd("LRANGE", "sp-visits:" + code, 0, n - 1)).map(v => { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean); }
async function logVisit(code, tok, v) {
  const s = await auth(code, tok); if (!s) return { status: 401, error: "Please log in again." };
  v = v || {};
  const shop = txt(v.shop, 60); if (!shop) return { status: 400, error: "Enter the shop name." };
  if (!STATUS[v.status]) return { status: 400, error: "Choose how the visit went." };
  const phone = String(v.phone || "").replace(/\D/g, "").slice(-10);
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return { status: 400, error: "Enter a 10-digit mobile number, or leave it empty." };
  const lat = +v.lat, lng = +v.lng, geo = isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng);
  const rl = "sp-visit-rate:" + s.code + ":" + dayStart(Date.now()), n = await db.cmd("INCR", rl); if (n === 1) await db.cmd("EXPIRE", rl, 2 * 86400);
  if (n > 150) return { status: 429, error: "That's a lot of visits for one day! Try again tomorrow." };
  const e = { id: db.rid(8), at: Date.now(), shop, area: txt(v.area, 60), phone, kind: txt(v.kind, 30), status: v.status, note: txt(v.note, 240),
    ...(geo ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, acc: Math.min(99999, Math.round(+v.acc || 0)) } : {}) };
  await db.cmd("LPUSH", "sp-visits:" + s.code, JSON.stringify(e)); await db.cmd("LTRIM", "sp-visits:" + s.code, 0, 999);
  return { visit: e };
}
// Shops credited, with the time each was activated.
async function shopTimes(code) {
  const r = await db.cmd("ZRANGE", "sp-shops:" + code, 0, -1, "WITHSCORES"), out = [];
  for (let i = 0; i < r.length; i += 2) out.push({ id: r[i], at: +r[i + 1] });
  return out.sort((a, b) => b.at - a.at);
}
function periods(times, now) {
  const t0 = dayStart(now), wk = t0 - 6 * DAY, mo = t0 - 29 * DAY;
  return { today: times.filter(t => t >= t0).length, week: times.filter(t => t >= wk).length, month: times.filter(t => t >= mo).length, all: times.length };
}
// Leaderboard for the admin app.
async function team() {
  const codes = await db.cmd("ZRANGE", "sps", 0, -1, "REV"), now = Date.now();
  return (await Promise.all(codes.map(async c => {
    const s = await db.getj("sp:" + c); if (!s) return null;
    const [sh, vs] = await Promise.all([shopTimes(s.code), visits(s.code, 1000)]);
    const n = sh.length, comm = s.comm || 0, paid = Math.min(s.paidOut || 0, n);
    return { ...pub(s), shops: periods(sh.map(x => x.at), now), visits: periods(vs.map(x => x.at), now),
      sold: vs.filter(v => v.status === "sold").length, follow: vs.filter(v => v.status === "follow" || v.status === "interested").length,
      earned: n * comm, paid: paid * comm, owed: (n - paid) * comm, last: Math.max(sh[0] ? sh[0].at : 0, vs[0] ? vs[0].at : 0) };
  }))).filter(Boolean);
}
// One salesperson in detail for the admin app.
async function detail(code) {
  const s = await get(code); if (!s) return null;
  const [sh, vs] = await Promise.all([shopTimes(s.code), visits(s.code, 300)]);
  const ms = sh.length ? await db.cmd("MGET", ...sh.slice(0, 200).map(x => "customer-memory:" + x.id)) : [];
  const shops = sh.slice(0, 200).map((x, i) => { let m = null; try { m = ms[i] ? JSON.parse(ms[i]) : null; } catch (e) {} return { id: x.id, at: x.at, name: m ? m.title || "Shop" : "(deleted page)", area: m && m.data ? m.data.area || "" : "", live: !!m && m.paid !== false }; });
  const batches = (await require("./_prepaid").batches()).filter(b => b.sp === s.code).map(b => ({ id: b.id, shop: b.shop, count: b.count, claimed: b.claimed, created: b.created }));
  const now = Date.now(), n = sh.length, comm = s.comm || 0, paid = Math.min(s.paidOut || 0, n);
  return { ...pub(s), shopsN: periods(sh.map(x => x.at), now), visitsN: periods(vs.map(x => x.at), now), earned: n * comm, paid: paid * comm, owed: (n - paid) * comm,
    shops, visits: vs, payouts: (s.payouts || []).slice().reverse(), batches };
}
// Phone alerts for the salesperson app.
async function push(code, tok, b) {
  const s = await auth(code, tok); if (!s) return { status: 401, error: "Please log in again." };
  const H = require("./_hq"), set = "sp-push:" + s.code;
  if (b.action === "sp-push-key") return { key: (await H.vapid()).pub };
  if (b.action === "sp-push-sub") { const r = await H.subscribe(b.sub, s.code, set); return r.error ? { status: 400, error: r.error } : r; }
  if (b.action === "sp-push-unsub") return H.unsubscribe(b.endpoint, set);
  if (b.action === "sp-push-test") return H.notify(set);
  return { status: 400, error: "Unknown action." };
}
module.exports = { norm, valid, get, create, update, credit, list, payout, login, me, pub, logVisit, visits, team, detail, STATUS, push };
