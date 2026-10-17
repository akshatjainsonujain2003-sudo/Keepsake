// Customer checkout with Razorpay.
// GET                         -> prices and whether payments are set up (public)
// POST {action:"create", id, plan, print?, photo?, address?} -> creates a Razorpay order for one of your memories
//   plan: "digital" | "frameQr" | "frameNfc"; frames need a delivery address and what to print:
//   print "photo" (with an uploaded photo) or "design" (we print the card design)
// POST {action:"verify", razorpay_order_id, razorpay_payment_id, razorpay_signature} -> activates it
const db = require("./_db");
const pay = require("./_pay");
const auth = require("./customer-auth");
const ref = require("./_ref");
const sameKey = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && require("crypto").timingSafeEqual(x, y); };

const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);

function readAddress(a) {
  a = a || {};
  const addr = {
    name: clip(a.name, 80), phone: String(a.phone || "").replace(/\D/g, "").slice(-10),
    line1: clip(a.line1, 120), line2: clip(a.line2, 120), city: clip(a.city, 60), state: clip(a.state, 60),
    pincode: String(a.pincode || "").replace(/\D/g, "")
  };
  if (!addr.name) return { error: "Enter the name for delivery." };
  if (!/^[6-9]\d{9}$/.test(addr.phone)) return { error: "Enter a 10-digit mobile number for delivery." };
  if (!addr.line1) return { error: "Enter the delivery address." };
  if (!addr.city || !addr.state) return { error: "Enter the city and state." };
  if (!/^[1-9]\d{5}$/.test(addr.pincode)) return { error: "Enter a valid 6-digit PIN code." };
  return { addr };
}

module.exports = async (req, res) => {
  try {
    // Creator codes. GET ?code=X -> { code: { code, discount } } when X is an active code
    if (req.method === "GET" && (req.query || {}).code) {
      if (!db.ok()) return db.reply(res, 404, { error: "That code isn't valid." });
      const x = await ref.check(req.query.code);
      if (!x.rec) return db.reply(res, 404, { error: x.error });
      return db.reply(res, 200, { code: ref.pub(x.rec) });
    }
    // A creator's own sales page: GET ?creator=CODE&key=K -> sales, earned, owed (no customer details)
    if (req.method === "GET" && (req.query || {}).creator) {
      if (!db.ok()) return db.reply(res, 501, { error: "Storage is not configured yet." });
      const q = req.query, r = await ref.get(q.creator);
      if (!r || !sameKey(r.key, q.key)) return db.reply(res, 404, { error: "This link isn't valid. Ask Keepsake for your creator link." });
      const s = await ref.stats(r);
      return db.reply(res, 200, { code: r.code, name: r.name, discount: r.discount, commission: r.commission, active: r.active !== false, ...s });
    }
    if (req.method === "GET") {
      return db.reply(res, 200, { ready: pay.configured() && db.ok(), free: !pay.configured(), currency: "INR", ...pay.catalog() });
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return db.reply(res, 405, { error: "Method not allowed." }); }
    if (!db.ok()) return db.reply(res, 501, { error: "Storage is not configured yet." });
    if (!pay.configured()) return db.reply(res, 503, { error: "Payments are not set up yet. Please try again soon." });
    const user = await auth.currentUser(req);
    if (!user) return db.reply(res, 401, { error: "Please log in to continue." });
    const b = req.body || {};

    if (b.action === "create") {
      const id = String(b.id || ""), plan = String(b.plan || "");
      if (!/^[a-z0-9]{8,16}$/i.test(id)) return db.reply(res, 400, { error: "Save your card first." });
      const memory = await db.getj("customer-memory:" + id);
      if (!memory || memory.owner !== user.id) return db.reply(res, 404, { error: "Card not found in your account." });
      const amt = pay.amountFor(memory, plan);
      if (amt.error) return db.reply(res, 400, { error: amt.error });
      // A creator's code takes a discount off the keepsake (never a frame) and records their commission.
      let code = null, off = 0, commission = 0;
      if (b.ref) {
        const x = await ref.check(b.ref, user.id);
        // A coupon that can't be used is an error (the buyer saw a lower price); an old creator link is just ignored.
        if (x.coupon) return db.reply(res, 400, { error: x.error + " Remove it to pay the regular price." });
        code = x.rec || null;
        if (code) { const fr = pay.isFrame(plan) ? (pay.catalog().delivery[plan] || {}).price || 0 : 0; const x = ref.apply(code, amt.rupees, fr); off = x.discount; commission = x.commission; amt.rupees = x.rupees; }
      }
      // A blank business QR card being set up: remember it so paying links the card to this page.
      let claim = null;
      if (b.claim && pay.kindOf(memory) === "biz") {
        const pc = await require("./_prepaid").get(b.claim);
        if (!pc || pc.tier !== "biz") return db.reply(res, 400, { error: "That QR card isn't a business card." });
        if (pc.status !== "new" && pc.memory !== id) return db.reply(res, 409, { error: "That QR card is already linked to another page." });
        claim = pc.code;
      }
      let address = null, frame = null;
      if (pay.isFrame(plan)) {
        const a = readAddress(b.address); if (a.error) return db.reply(res, 400, { error: a.error }); address = a.addr;
        if (b.print === "photo") {
          const m = /^\/api\/img\?id=([a-z0-9]{6,16})$/i.exec(String(b.photo || ""));
          if (!m || !(await db.cmd("SISMEMBER", "custimgs:" + user.id, m[1]))) return db.reply(res, 400, { error: "Upload the photo you'd like printed in the frame." });
          frame = { print: "photo", photo: "/api/img?id=" + m[1] };
        } else if (b.print === "design") frame = { print: "design" };
        else return db.reply(res, 400, { error: "Choose what to print in the frame." });
      }
      // Razorpay won't take less than ₹1 (100 paise), even after a creator's discount.
      if (!(amt.rupees >= 1)) return db.reply(res, 400, { error: "This order total is too low to pay online. Please contact us." });
      // At most a few open orders per minute per account.
      const rl = "checkout-rate:" + user.id, n = await db.cmd("INCR", rl);
      if (n === 1) await db.cmd("EXPIRE", rl, 60);
      if (n > 6) return db.reply(res, 429, { error: "Too many attempts. Please wait a minute." });

      const order = await pay.createOrder({ rupees: amt.rupees, receipt: "ks_" + id, notes: { memory: id, plan, customer: user.id } });
      await db.setj("order:" + order.id, {
        memory: id, title: memory.title || "", owner: user.id, name: user.name, email: user.email, phone: user.phone || "",
        kind: pay.kindOf(memory), plan, frame, upgrade: amt.upgrade, amount: amt.rupees, ...(code ? { ref: code.code, refDiscount: off, commission } : {}), address, ...(claim ? { claim } : {}), status: "created", created: Date.now()
      }, "EX", 60 * 60 * 24 * 30);
      return db.reply(res, 200, {
        keyId: pay.keyId(), orderId: order.id, amount: order.amount, currency: order.currency,
        prefill: { name: user.name, email: user.email, contact: user.phone || (address && address.phone) || "" },
        description: pay.describe(memory, plan, amt.upgrade) + (code ? " (code " + code.code + ")" : ""), amountRupees: amt.rupees, ref: code ? code.code : null
      });
    }

    if (b.action === "verify") {
      const orderId = String(b.razorpay_order_id || ""), paymentId = String(b.razorpay_payment_id || "");
      if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId)) return db.reply(res, 400, { error: "Missing payment details." });
      const order = await db.getj("order:" + orderId);
      if (!order || order.owner !== user.id) return db.reply(res, 404, { error: "Order not found." });
      if (!pay.verifyPayment(orderId, paymentId, b.razorpay_signature)) return db.reply(res, 400, { error: "Payment could not be verified. If money was taken, contact us with your payment ID." });
      const done = await pay.markPaid(orderId, paymentId);
      return db.reply(res, 200, { ok: true, id: done.memory, url: (done.kind === "site" ? "/s/" : done.kind === "biz" ? "/b/" : "/m/") + done.memory, plan: done.plan, amount: done.amount });
    }

    return db.reply(res, 400, { error: "Unknown action." });
  } catch (e) {
    if (e && e.razorpayAuth) { console.error("Razorpay rejected the API keys. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in Vercel."); return db.reply(res, 503, { error: "Payments are temporarily unavailable. Please try again soon." }); }
    return db.reply(res, 500, { error: "Could not start the payment. Please try again." });
  }
};
