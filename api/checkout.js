// Customer checkout with Razorpay.
// GET                         -> prices and whether payments are set up (public)
// POST {action:"create", id, plan, address?} -> creates a Razorpay order for one of your memories
// POST {action:"verify", razorpay_order_id, razorpay_payment_id, razorpay_signature} -> activates it
const db = require("./_db");
const pay = require("./_pay");
const auth = require("./customer-auth");

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
    if (req.method === "GET") {
      const p = pay.plans();
      return db.reply(res, 200, { ready: pay.configured() && db.ok(), currency: "INR", plans: p });
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
      let address = null;
      if (plan === "nfc") { const a = readAddress(b.address); if (a.error) return db.reply(res, 400, { error: a.error }); address = a.addr; }
      // At most a few open orders per minute per account.
      const rl = "checkout-rate:" + user.id, n = await db.cmd("INCR", rl);
      if (n === 1) await db.cmd("EXPIRE", rl, 60);
      if (n > 6) return db.reply(res, 429, { error: "Too many attempts. Please wait a minute." });

      const order = await pay.createOrder({ rupees: amt.rupees, receipt: "ks_" + id, notes: { memory: id, plan, customer: user.id } });
      await db.setj("order:" + order.id, {
        memory: id, title: memory.title || "", owner: user.id, name: user.name, email: user.email, phone: user.phone || "",
        plan, upgrade: amt.upgrade, amount: amt.rupees, address, status: "created", created: Date.now()
      }, "EX", 60 * 60 * 24 * 30);
      return db.reply(res, 200, {
        keyId: pay.keyId(), orderId: order.id, amount: order.amount, currency: order.currency,
        prefill: { name: user.name, email: user.email, contact: user.phone || (address && address.phone) || "" },
        description: plan === "nfc" ? (amt.upgrade ? "NFC card for your keepsake" : pay.plans().nfc.name) : pay.plans().digital.name
      });
    }

    if (b.action === "verify") {
      const orderId = String(b.razorpay_order_id || ""), paymentId = String(b.razorpay_payment_id || "");
      if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId)) return db.reply(res, 400, { error: "Missing payment details." });
      const order = await db.getj("order:" + orderId);
      if (!order || order.owner !== user.id) return db.reply(res, 404, { error: "Order not found." });
      if (!pay.verifyPayment(orderId, paymentId, b.razorpay_signature)) return db.reply(res, 400, { error: "Payment could not be verified. If money was taken, contact us with your payment ID." });
      const done = await pay.markPaid(orderId, paymentId);
      return db.reply(res, 200, { ok: true, id: done.memory, url: "/m/" + done.memory, plan: done.plan });
    }

    return db.reply(res, 400, { error: "Unknown action." });
  } catch (e) {
    return db.reply(res, 500, { error: "Could not start the payment. Please try again." });
  }
};
