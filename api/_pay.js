// Products, prices and Razorpay helpers. Not a route (files starting with _ are not deployed as functions).
const crypto = require("crypto");
const db = require("./_db");

const env = process.env;
const rupees = (v, d) => { const n = Math.round(+v); return n >= 1 ? n : d; };
const rupees0 = (v, d) => (v === undefined || v === "" || !(Math.round(+v) >= 0) ? d : Math.round(+v));

// Everything sold is: a product (template card or custom website) + how it's delivered
// (digital only, or a printed photo frame with a QR code or an NFC chip).
// Prices are in rupees and can be changed in Vercel without code changes.
// Photo frames are paused: they are only sold when FRAMES=on is set in Vercel.
const framesOn = () => String(env.FRAMES || "").toLowerCase() === "on";
// Launch offer: a % off every keepsake (cards and websites), on by default at 50%.
// In Vercel: SALE_PERCENT=0 switches it off, SALE_ENDS=2026-11-30 moves the last day (India time),
// SALE_NAME changes the label. Photo frames are never discounted (printing and shipping cost real money).
function sale() {
  const pct = Math.min(90, Math.max(0, Math.round(env.SALE_PERCENT === undefined || env.SALE_PERCENT === "" ? 50 : +env.SALE_PERCENT || 0)));
  if (!pct) return null;
  // The launch offer runs for two days: until 17 Oct 2026, 11:59 PM India time (override with SALE_ENDS).
  const ends = /^\d{4}-\d{2}-\d{2}$/.test(env.SALE_ENDS || "") ? env.SALE_ENDS : "2026-10-17";
  if (ends && Date.now() > Date.parse(ends + "T23:59:59+05:30")) return null;
  return { percent: pct, name: String(env.SALE_NAME || "Launch offer").slice(0, 40), ends };
}
const onSale = (full, s) => s ? Math.max(1, Math.floor(full * (100 - s.percent) / 100)) : full;
function catalog() {
  const s = sale(), card = rupees(env.PRICE_TEMPLATE, 99), site = rupees(env.PRICE_WEBSITE, 299);
  const c = {
    sale: s,
    products: {
      card: { name: "Template", price: onSale(card, s), ...(s ? { was: card } : {}), desc: "One beautiful memory card from our designs." },
      site: { name: "Custom website", price: onSale(site, s), ...(s ? { was: site } : {}), desc: "A full page for your story: photos, videos, songs, timeline and letters." },
      // Business pages for shops and cafes (sold by QR card, paid online by the shop). Never on sale.
      biz: { name: "Business page", price: rupees(env.PRICE_BUSINESS, 499), desc: "A premium page for your shop: links, menu, photos, offers and UPI." }
    },
    delivery: {
      digital: { name: "Digital", price: 0, desc: "Short link, QR code and NFC-ready link to share or print." },
      frameQr: { name: "Photo frame with QR", price: rupees(env.PRICE_FRAME_QR, 399), desc: "A printed photo frame with a scannable QR code, delivered to you." },
      frameNfc: { name: "Photo frame with NFC", price: rupees(env.PRICE_FRAME_NFC, 599), desc: "A printed photo frame with a hidden NFC chip. Tap a phone to open.", }
    },
    frames: framesOn()
  };
  // Printed QR sticker for a business page, couriered to the shop (all India).
  // PRICE_BIZ_QR is added to the ₹499 page (default ₹99). PRICE_BIZ_QR_REORDER is for a page that's already live.
  c.delivery.bizQr = { name: "Printed QR, delivered", price: rupees0(env.PRICE_BIZ_QR, 99), reorder: rupees(env.PRICE_BIZ_QR_REORDER, 149),
    desc: "Your QR printed on a 3.5 × 5 in counter board in the colour you pick, couriered to your shop anywhere in India." };
  // Loyalty stamp card add-on for a business page, one-time: ₹499 page + ₹300 = ₹799 together, or ₹300 later. PRICE_LOYALTY changes it.
  c.delivery.loyalty = { name: "Loyalty card", price: rupees(env.PRICE_LOYALTY, 300),
    desc: "A stamp card for repeat customers, e.g. 10 visits = a free coffee. Staff PIN and member list." };
  if (!c.frames) { delete c.delivery.frameQr; delete c.delivery.frameNfc; }
  return c;
}
const isFrame = plan => plan === "frameQr" || plan === "frameNfc";
// Anything that gets printed and couriered (photo frames, business QR stickers).
const isShip = plan => isFrame(plan) || plan === "bizQr";
// A business order that includes a printed QR: the QR on its own, or page + loyalty card + QR together.
const hasQr = o => !!o && (o.plan === "bizQr" || !!o.withQr);
const kindOf = memory => (memory.kind === "site" || memory.kind === "biz" ? memory.kind : "card");

// What this customer pays for a delivery option on this memory.
// An already-active memory only pays for the frame.
function amountFor(memory, plan, extra) {
  extra = extra || {};
  const c = catalog();
  if (!c.delivery[plan]) return { error: "Choose how you'd like it delivered." };
  if (kindOf(memory) === "biz" && isFrame(plan)) return { error: "Business pages are digital only." };
  if (plan === "bizQr" && kindOf(memory) !== "biz") return { error: "Printed QRs are for business pages." };
  const active = memory.paid !== false, base = c.products[kindOf(memory)].price;
  if (plan === "loyalty") {
    if (kindOf(memory) !== "biz") return { error: "The loyalty card is for business pages." };
    if (memory.loyalty) return { error: "The loyalty card is already unlocked on this page." };
    // A live page pays only the add-on; a new page pays page + add-on and goes live with it.
    // With a printed QR too (extra.qr): the QR is added at its delivery price (reorder price for a live page).
    const q = extra.qr ? (active ? c.delivery.bizQr.reorder : c.delivery.bizQr.price) : 0;
    return active ? { rupees: c.delivery.loyalty.price + q, upgrade: true, ...(q ? { ship: q } : {}) } : { rupees: base + c.delivery.loyalty.price + q, upgrade: false, ...(q ? { ship: q } : {}) };
  }
  // A live business page ordering another sticker pays the reorder price.
  if (plan === "bizQr") return active ? { rupees: c.delivery.bizQr.reorder, upgrade: true, ship: c.delivery.bizQr.reorder } : { rupees: base + c.delivery.bizQr.price, upgrade: false, ship: c.delivery.bizQr.price };
  if (active && !isFrame(plan)) return { error: "This keepsake is already active." };
  const total = (active ? 0 : base) + c.delivery[plan].price;
  return { rupees: total, upgrade: active };
}
function describe(memory, plan, upgrade, withQr) {
  const c = catalog(), product = c.products[kindOf(memory)].name;
  if (plan === "loyalty" && withQr) return upgrade ? "Loyalty card + printed QR delivered" : `${product} + loyalty card + printed QR delivered`;
  if (upgrade) return c.delivery[plan].name;
  if (plan === "bizQr") return `${product} + printed QR delivered`;
  if (plan === "loyalty") return `${product} + loyalty card`;
  return isFrame(plan) ? `${product} + ${c.delivery[plan].name.toLowerCase()}` : `${product} (digital)`;
}

const keyId = () => env.RAZORPAY_KEY_ID || "";
const configured = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

async function createOrder({ rupees, receipt, notes }) {
  if (!(rupees >= 1)) throw new Error("Razorpay needs at least ₹1 (100 paise).");
  const auth = Buffer.from(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: rupees * 100, currency: "INR", receipt, notes })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) {
    // 401 from Razorpay means the key ID / secret in Vercel are wrong (or test and live keys are mixed).
    const e = new Error((j.error && j.error.description) || "Payment provider error.");
    e.razorpayAuth = r.status === 401; throw e;
  }
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
    if (isShip(order.plan) || order.withQr) order.ship = "to-ship";
    await db.setj(key, order);
    const mk = "customer-memory:" + order.memory, memory = await db.getj(mk);
    if (memory) {
      memory.paid = true; memory.activatedAt = memory.activatedAt || order.paidAt;
      memory.plan = isFrame(order.plan) ? order.plan : (memory.plan || "digital");
      if (order.plan === "loyalty") { memory.loyalty = true; memory.loyaltyAt = order.paidAt; }
      if (hasQr(order)) memory.qrOrders = [...(memory.qrOrders || []), orderId].slice(-10);
      memory.orders = [...(memory.orders || []), orderId].slice(-20);
      await db.setj(mk, memory);
    }
    await db.cmd("ZADD", "orders-paid", order.paidAt, orderId);
    // Phone alert to the admin app (best effort, never blocks the payment for long).
    try { await Promise.race([require("./_hq").notify(), new Promise(r => setTimeout(r, 5000))]); } catch (e) {}
    if (order.sp) { try { await require("./_sales").credit(order.sp, order.memory); } catch (e) {} }
    if (order.claim) { try { await require("./_prepaid").linkBiz(order.claim, order.memory, order.owner); } catch (e) {} }
    // Printed QR to deliver: make its own QR code (getkeepsake.in/k/CODE) already linked to this page, ready to print in admin.
    if (hasQr(order) && !order.qrCode) {
      try {
        const P = require("./_prepaid"), r = await P.createBatch({ count: 1, tier: "biz", shop: "Online · " + String(order.title || "Shop").slice(0, 50), note: "Delivery for order " + orderId });
        const code = r.batch.codes[0]; await P.linkBiz(code, order.memory, order.owner);
        order.qrCode = code; order.qrBatch = r.batch.id; await db.setj(key, order);
      } catch (e) {}
    }
    if (order.ref) { await db.cmd("ZADD", "ref-orders:" + order.ref, order.paidAt, orderId); await db.cmd("SADD", "coupon-users:" + order.ref, order.owner); }
    return order;
  } finally {
    await db.cmd("DEL", "order-lock:" + orderId);
  }
}

module.exports = { catalog, amountFor, describe, isFrame, isShip, hasQr, kindOf, keyId, configured, createOrder, verifyPayment, verifyWebhook, markPaid };
