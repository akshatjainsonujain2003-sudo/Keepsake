// Creator referral codes. Not a route.
// A code gives the buyer a discount on the digital part of an order and earns its creator a commission.
// refcode:<CODE> = { code, name, contact, discount, commission, key, active, created, paidOut }
// Coupons live in the same place with kind:"coupon": no creator and no commission, and either
// discount (%) or off (flat ₹), plus optional maxUses, oncePer (one use per customer) and expires (YYYY-MM-DD, India time).
// coupon-batch:<id> = { id, name, created, codes[], ...settings }, listed in the set coupon-batches.
// coupon-users:<CODE> = customers who have paid with it.
// ref-orders:<CODE> = sorted set of paid order ids (score = paid time)
const crypto = require("crypto");
const db = require("./_db");

const norm = c => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
const valid = c => /^[A-Z0-9]{3,20}$/.test(c);

async function get(code) {
  code = norm(code);
  if (!valid(code)) return null;
  return await db.getj("refcode:" + code);
}
const expired = rec => !!rec.expires && Date.now() > Date.parse(rec.expires + "T23:59:59+05:30");
const uses = async code => +(await db.cmd("ZCARD", "ref-orders:" + code)) || 0;

// The active code, or null.
async function active(code) { const r = await get(code); return r && r.active !== false ? r : null; }

// Can this code be used right now (by this customer, when known)? -> { rec } or { error, coupon }
async function check(code, userId) {
  const r = await get(code);
  if (!r || r.active === false) return { error: "That code isn't valid." };
  if (r.kind !== "coupon") return { rec: r };
  const no = error => ({ error, coupon: true });
  if (expired(r)) return no("That code has expired.");
  if (r.maxUses && (await uses(r.code)) >= r.maxUses) return no("That code has already been used up.");
  if (userId && r.oncePer && +(await db.cmd("SISMEMBER", "coupon-users:" + r.code, userId))) return no("You've already used this code.");
  return { rec: r };
}
// What the browser needs to show the discount.
const pub = r => ({ code: r.code, discount: +r.discount || 0, off: +r.off || 0 });

// Discount and commission for an order. digital = rupees of the order that aren't a frame.
function apply(rec, total, frame) {
  const digital = Math.max(0, total - (frame || 0));
  // A flat ₹ coupon never takes the keepsake below ₹1.
  const discount = rec.off ? Math.min(+rec.off, Math.max(0, digital - 1)) : Math.round(digital * (+rec.discount || 0) / 100);
  const commission = Math.round((digital - discount) * (+rec.commission || 0) / 100);
  return { rupees: total - discount, discount, commission };
}

async function create({ code, name, contact, discount, commission }) {
  code = norm(code);
  if (!valid(code)) return { error: "Code must be 3–20 letters or numbers." };
  const pct = (v, d, max) => { const n = Math.round(+v); return n >= 0 && n <= max ? n : d; };
  const rec = { code, name: String(name || code).slice(0, 60), contact: String(contact || "").slice(0, 80),
    discount: pct(discount, 10, 50), commission: pct(commission, 25, 60), key: crypto.randomBytes(9).toString("base64url"),
    active: true, created: Date.now(), paidOut: 0 };
  if ((await db.cmd("SET", "refcode:" + code, JSON.stringify(rec), "NX")) !== "OK") return { error: "That code already exists." };
  await db.cmd("SADD", "refcodes", code);
  return { rec };
}

// Coupon generator: one named code, or a batch of random ones that all share the same settings.
const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const rand = n => Array.from(crypto.randomBytes(n), x => ALPHA[x % ALPHA.length]).join("");
async function createCoupons(b) {
  const type = b.type === "flat" ? "flat" : "percent", val = Math.round(+b.value);
  if (type === "percent" && !(val >= 1 && val <= 90)) return { error: "Percent off must be 1–90." };
  if (type === "flat" && !(val >= 1 && val <= 5000)) return { error: "Rupees off must be ₹1–₹5,000." };
  const count = Math.round(+b.count || 1);
  if (!(count >= 1 && count <= 200)) return { error: "You can make 1–200 codes at a time." };
  const maxUses = Math.max(0, Math.min(100000, Math.round(+b.maxUses || 0)));
  const expires = /^\d{4}-\d{2}-\d{2}$/.test(b.expires || "") ? b.expires : "";
  if (expires && Date.now() > Date.parse(expires + "T23:59:59+05:30")) return { error: "The expiry date is in the past." };
  const prefix = norm(b.prefix).slice(0, 10), custom = norm(b.code);
  if (custom && count > 1) return { error: "Leave the code empty to make several random codes." };
  if (custom && !valid(custom)) return { error: "Code must be 3–20 letters or numbers." };
  const id = crypto.randomBytes(5).toString("hex"), now = Date.now();
  const base = { kind: "coupon", name: String(b.name || "").slice(0, 60), discount: type === "percent" ? val : 0, off: type === "flat" ? val : 0,
    commission: 0, maxUses, oncePer: b.oncePer !== false, expires, active: true, created: now, batch: id };
  const codes = [];
  for (let i = 0, tries = 0; codes.length < count && tries < count * 5; tries++) {
    const code = custom || prefix + rand(prefix ? 6 : 8);
    if ((await db.cmd("SET", "refcode:" + code, JSON.stringify({ ...base, code }), "NX")) === "OK") codes.push(code);
    else if (custom) return { error: "That code already exists." };
  }
  if (!codes.length) return { error: "Couldn't make the codes. Try again." };
  const batch = { id, name: base.name, created: now, type, value: val, maxUses, oncePer: base.oncePer, expires, codes };
  await db.setj("coupon-batch:" + id, batch);
  await db.cmd("SADD", "coupon-batches", id);
  return { batch };
}
async function couponBatches() {
  const ids = await db.cmd("SMEMBERS", "coupon-batches") || [];
  const out = await Promise.all(ids.map(async id => {
    const b = await db.getj("coupon-batch:" + id); if (!b) return null;
    const u = await Promise.all(b.codes.map(uses)), first = await get(b.codes[0]);
    return { ...b, uses: u, used: u.reduce((x, y) => x + y, 0), active: !!first && first.active !== false, expired: !!b.expires && Date.now() > Date.parse(b.expires + "T23:59:59+05:30") };
  }));
  return out.filter(Boolean).sort((a, b) => b.created - a.created);
}
async function toggleBatch(id) {
  const b = await db.getj("coupon-batch:" + id); if (!b) return null;
  const first = await get(b.codes[0]), on = !(first && first.active !== false);
  for (const c of b.codes) { const r = await get(c); if (r) { r.active = on; await db.setj("refcode:" + c, r); } }
  return { active: on };
}

// Sales so far for a code.
async function stats(rec) {
  const ids = await db.cmd("ZRANGE", "ref-orders:" + rec.code, 0, -1, "REV");
  const orders = (await Promise.all(ids.map(id => db.getj("order:" + id)))).filter(Boolean);
  const revenue = orders.reduce((a, o) => a + (+o.amount || 0), 0), earned = orders.reduce((a, o) => a + (+o.commission || 0), 0);
  return { sales: orders.length, revenue, earned, paidOut: +rec.paidOut || 0, owed: Math.max(0, earned - (+rec.paidOut || 0)),
    recent: orders.slice(0, 50).map(o => ({ at: o.paidAt, amount: o.amount, commission: o.commission || 0, what: o.kind === "site" ? "Website" : "Card" })) };
}

module.exports = { norm, valid, get, active, check, pub, apply, create, stats, createCoupons, couponBatches, toggleBatch };
