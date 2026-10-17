// Salespeople for business pages.
// sp:<CODE>          = { code, name, phone, comm, salt, hash, tok, active, created, paidOut, payouts:[] }
// sps                = zset of codes
// sp-shops:<CODE>    = zset of business page ids they activated (score = time)
// sp-credit:<PAGE>   = which salesperson got credit for a page (only ever once)
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
  await db.cmd("ZADD", "sp-shops:" + s.code, Date.now(), pageId); return true;
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
  return { ...x, shopsList: shops, payouts: (s.payouts || []).map(p => ({ at: p.at, amount: p.amount, shops: p.shops })) };
}
module.exports = { norm, valid, get, create, update, credit, list, payout, login, me, pub };
