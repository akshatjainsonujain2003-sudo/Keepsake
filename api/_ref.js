// Creator referral codes. Not a route.
// A code gives the buyer a discount on the digital part of an order and earns its creator a commission.
// refcode:<CODE> = { code, name, contact, discount, commission, key, active, created, paidOut }
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
// The active code, or null.
async function active(code) { const r = await get(code); return r && r.active !== false ? r : null; }

// Discount and commission for an order. digital = rupees of the order that aren't a frame.
function apply(rec, total, frame) {
  const digital = Math.max(0, total - (frame || 0));
  const discount = Math.round(digital * rec.discount / 100);
  const commission = Math.round((digital - discount) * rec.commission / 100);
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

// Sales so far for a code.
async function stats(rec) {
  const ids = await db.cmd("ZRANGE", "ref-orders:" + rec.code, 0, -1, "REV");
  const orders = (await Promise.all(ids.map(id => db.getj("order:" + id)))).filter(Boolean);
  const revenue = orders.reduce((a, o) => a + (+o.amount || 0), 0), earned = orders.reduce((a, o) => a + (+o.commission || 0), 0);
  return { sales: orders.length, revenue, earned, paidOut: +rec.paidOut || 0, owed: Math.max(0, earned - (+rec.paidOut || 0)),
    recent: orders.slice(0, 50).map(o => ({ at: o.paidAt, amount: o.amount, commission: o.commission || 0, what: o.kind === "site" ? "Website" : "Card" })) };
}

module.exports = { norm, valid, get, active, apply, create, stats };
