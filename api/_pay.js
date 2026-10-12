// Razorpay helpers and the one place prices are defined. Not a route (files starting with _ are not deployed as functions).
const crypto = require("crypto");
const db = require("./_db");

const env = process.env;
const rupees = (v, d) => { const n = Math.round(+v); return n >= 1 ? n : d; };

// Prices in rupees. Change them in Vercel with PRICE_DIGITAL and PRICE_NFC, no code change needed.
function plans() {
  const digital = rupees(env.PRICE_DIGITAL, 99), nfc = Math.max(rupees(env.PRICE_NFC, 349), digital);
  return {
    digital: { price: digital, name: "Digital keepsake", desc: "Your card, its short link and QR code, live for good." },
    nfc: { price: nfc, name: "Keepsake + NFC card", desc: "Everything in Digital, plus a printed NFC card delivered to your door." }
  };
}

// What this customer pays for a plan on this memory. An already-active card pays only the difference for an NFC card.
function amountFor(memory, plan) {
  const p = plans();
  if (!p[plan]) return { error: "Choose a plan." };
  const active = memory.paid !== false;
  if (plan === "digital" && active) return { error: "This keepsake is already active." };
  if (plan === "nfc" && active) return { rupees: Math.max(p.nfc.price - p.digital.price, 1), upgrade: true };
  return { rupees: p[plan].price, upgrade: false };
}

const keyId = () => env.RAZORPAY_KEY_ID || "";
const configured = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

async function createOrder({ rupees, receipt, notes }) {
  const auth = Buffer.from(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: rupees * 100, currency: "INR", receipt, notes })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error((j.error && j.error.description) || "Payment provider error.");
  return j;
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ""), "utf8"), y = Buffer.from(String(b || ""), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const hmac = (secret, text) => crypto.createHmac("sha256", secret).update(text).digest("hex");

// Signature Razorpay Checkout returns to the browser after a successful payment.
const verifyPayment = (orderId, paymentId, signature) =>
  !!env.RAZORPAY_KEY_SECRET && safeEqualHex(hmac(env.RAZORPAY_KEY_SECRET, orderId + "|" + paymentId), signature);

// Signature on webhook calls (uses the separate webhook secret set in the Razorpay dashboard).
const verifyWebhook = (rawBody, signature) =>
  !!env.RAZORPAY_WEBHOOK_SECRET && safeEqualHex(hmac(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

// Marks an order paid and activates its memory. Safe to call more than once for the same order
// (the browser and the webhook can both report the same payment).
async function markPaid(orderId, paymentId) {
  const key = "order:" + orderId;
  let locked = false;
  for (let n = 0; n < 8 && !locked; n++) {
    locked = (await db.cmd("SET", "order-lock:" + orderId, "1", "NX", "EX", 30)) === "OK";
    if (!locked) await new Promise(r => setTimeout(r, 400));
  }
  if (!locked) { const o = await db.getj(key); if (o && o.status === "paid") return o; throw new Error("Busy, try again."); }
  try {
    const order = await db.getj(key);
    if (!order) return null;
    if (order.status === "paid") return order;
    order.status = "paid"; order.paymentId = String(paymentId || ""); order.paidAt = Date.now();
    if (order.plan === "nfc") order.ship = "to-ship";
    await db.setj(key, order);
    const mk = "customer-memory:" + order.memory, memory = await db.getj(mk);
    if (memory) {
      memory.paid = true; memory.activatedAt = memory.activatedAt || order.paidAt;
      memory.plan = order.plan === "nfc" ? "nfc" : (memory.plan || "digital");
      memory.orders = [...(memory.orders || []), orderId].slice(-20);
      await db.setj(mk, memory);
    }
    await db.cmd("ZADD", "orders-paid", order.paidAt, orderId);
    return order;
  } finally {
    await db.cmd("DEL", "order-lock:" + orderId);
  }
}

module.exports = { plans, amountFor, keyId, configured, createOrder, verifyPayment, verifyWebhook, markPaid };
