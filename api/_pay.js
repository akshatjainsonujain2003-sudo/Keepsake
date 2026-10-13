// Products, prices and Razorpay helpers. Not a route (files starting with _ are not deployed as functions).
const crypto = require("crypto");
const db = require("./_db");

const env = process.env;
const rupees = (v, d) => { const n = Math.round(+v); return n >= 1 ? n : d; };

// Everything sold is: a product (template card or custom website), for how long its link stays live
// (30 days or forever), and how it's delivered (digital, or a printed 5x7 photo frame with a QR code
// or an NFC chip). Frames always come with a forever link.
// Prices are in rupees and can be changed in Vercel without code changes.
const TERMS = ["d30", "life"];
const DAY = 864e5;
// Photo frames are on sale unless FRAMES=off is set in Vercel (to pause them, e.g. when stock runs out).
const framesOn = () => String(env.FRAMES || "").toLowerCase() !== "off";
function catalog() {
  const c = {
    products: {
      card: { name: "Template card", price: rupees(env.PRICE_TEMPLATE, 149), price30: rupees(env.PRICE_TEMPLATE_30, 49), desc: "One beautiful memory card from our designs." },
      site: { name: "Website", price: rupees(env.PRICE_WEBSITE, 399), price30: rupees(env.PRICE_WEBSITE_30, 149), desc: "A full page for your story: photos, your song, letters and little surprises." }
    },
    terms: {
      d30: { name: "30 days", desc: "Live for 30 days. Perfect for a birthday or anniversary surprise. Keep it forever any time." },
      life: { name: "Forever", desc: "One payment, live for good. Best for gifts they'll keep." }
    },
    delivery: {
      digital: { name: "Digital", price: 0, desc: "Link, QR code and NFC-ready link to share or print yourself." },
      frameQr: { name: "5×7 photo frame with QR", price: rupees(env.PRICE_FRAME_QR, 599), desc: "Your photo or design printed in a 5×7 frame with a scannable QR code, delivered to you." },
      frameNfc: { name: "5×7 photo frame with NFC", price: rupees(env.PRICE_FRAME_NFC, 899), desc: "A 5×7 printed frame with a hidden NFC chip. Tap a phone to open." }
    },
    frames: framesOn()
  };
  if (!c.frames) { delete c.delivery.frameQr; delete c.delivery.frameNfc; }
  return c;
}
const isFrame = plan => plan === "frameQr" || plan === "frameNfc";
const kindOf = memory => (memory.kind === "site" ? "site" : "card");
const isThirty = memory => memory.term === "d30";
const isExpired = (memory, now) => isThirty(memory) && !!memory.expiresAt && memory.expiresAt <= (now || Date.now());

// What this customer pays. plan = delivery, term = "d30" | "life".
// - Not active yet: the product for that term, plus any frame.
// - Active on 30 days: keep it forever (pay the difference) or add 30 more days; frames need forever.
// - Active forever: only a frame.
function amountFor(memory, plan, term) {
  const c = catalog();
  if (!c.delivery[plan]) return { error: "Choose how you'd like it delivered." };
  if (!TERMS.includes(term)) term = "life";
  if (isFrame(plan)) term = "life";
  const P = c.products[kindOf(memory)], active = memory.paid !== false, frame = c.delivery[plan].price;
  if (!active) return { rupees: (term === "d30" ? P.price30 : P.price) + frame, upgrade: false, term, step: "activate" };
  if (isThirty(memory)) {
    if (term === "life") return { rupees: Math.max(0, P.price - P.price30) + frame, upgrade: true, term, step: "forever" };
    return { rupees: P.price30, upgrade: true, term, step: "extend" };
  }
  if (!isFrame(plan)) return { error: "This keepsake is already live forever." };
  return { rupees: frame, upgrade: true, term: "life", step: "frame" };
}
function describe(memory, plan, amt) {
  const c = catalog(), product = c.products[kindOf(memory)].name;
  if (amt.step === "frame") return c.delivery[plan].name;
  if (amt.step === "extend") return product + " · 30 more days";
  const when = amt.term === "d30" ? "30 days" : "forever";
  const what = amt.step === "forever" ? product + " · keep it forever" : product + " · " + when;
  return isFrame(plan) ? what + " + " + c.delivery[plan].name : what;
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
      if (order.term === "d30") { memory.term = "d30"; memory.expiresAt = Math.max(Date.now(), memory.expiresAt || 0) + 30 * DAY; }
      else { memory.term = "life"; delete memory.expiresAt; }
      memory.orders = [...(memory.orders || []), orderId].slice(-20);
      await db.setj(mk, memory);
    }
    await db.cmd("ZADD", "orders-paid", order.paidAt, orderId);
    return order;
  } finally {
    await db.cmd("DEL", "order-lock:" + orderId);
  }
}

module.exports = { catalog, amountFor, describe, isFrame, kindOf, isThirty, isExpired, keyId, configured, createOrder, verifyPayment, verifyWebhook, markPaid };
