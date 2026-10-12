// Products, prices and Razorpay helpers. Not a route (files starting with _ are not deployed as functions).
const crypto = require("crypto");
const db = require("./_db");

const env = process.env;
const rupees = (v, d) => { const n = Math.round(+v); return n >= 1 ? n : d; };

// Everything sold is: a product (template card or custom website) + how it's delivered
// (digital only, or a printed photo frame with a QR code or an NFC chip).
// Prices are in rupees and can be changed in Vercel without code changes.
function catalog() {
  return {
    products: {
      card: { name: "Template", price: rupees(env.PRICE_TEMPLATE, 99), desc: "One beautiful memory card from our designs." },
      site: { name: "Custom website", price: rupees(env.PRICE_WEBSITE, 299), desc: "A full page for your story: photos, videos, songs, timeline and letters." }
    },
    delivery: {
      digital: { name: "Digital", price: 0, desc: "Short link, QR code and NFC-ready link to share or print." },
      frameQr: { name: "Photo frame with QR", price: rupees(env.PRICE_FRAME_QR, 399), desc: "A printed photo frame with a scannable QR code, delivered to you." },
      frameNfc: { name: "Photo frame with NFC", price: rupees(env.PRICE_FRAME_NFC, 599), desc: "A printed photo frame with a hidden NFC chip. Tap a phone to open.", }
    }
  };
}
const isFrame = plan => plan === "frameQr" || plan === "frameNfc";
const kindOf = memory => (memory.kind === "site" ? "site" : "card");

// What this customer pays for a delivery option on this memory.
// An already-active memory only pays for the frame.
function amountFor(memory, plan) {
  const c = catalog();
  if (!c.delivery[plan]) return { error: "Choose how you'd like it delivered." };
  const active = memory.paid !== false, base = c.products[kindOf(memory)].price;
  if (active && !isFrame(plan)) return { error: "This keepsake is already active." };
  const total = (active ? 0 : base) + c.delivery[plan].price;
  return { rupees: total, upgrade: active };
}
function describe(memory, plan, upgrade) {
  const c = catalog(), product = c.products[kindOf(memory)].name;
  if (upgrade) return c.delivery[plan].name;
  return isFrame(plan) ? `${product} + ${c.delivery[plan].name.toLowerCase()}` : `${product} (digital)`;
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
    if (isFrame(order.plan)) order.ship = "to-ship";
    await db.setj(key, order);
    const mk = "customer-memory:" + order.memory, memory = await db.getj(mk);
    if (memory) {
      memory.paid = true; memory.activatedAt = memory.activatedAt || order.paidAt;
      memory.plan = isFrame(order.plan) ? order.plan : (memory.plan || "digital");
      memory.orders = [...(memory.orders || []), orderId].slice(-20);
      await db.setj(mk, memory);
    }
    await db.cmd("ZADD", "orders-paid", order.paidAt, orderId);
    return order;
  } finally {
    await db.cmd("DEL", "order-lock:" + orderId);
  }
}

module.exports = { catalog, amountFor, describe, isFrame, kindOf, keyId, configured, createOrder, verifyPayment, verifyWebhook, markPaid };
