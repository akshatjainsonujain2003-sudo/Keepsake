// Razorpay webhook: activates a card even if the customer closes the page before the browser confirms payment.
// In the Razorpay dashboard add https://<your-domain>/api/razorpay-webhook with the events
// payment.captured and order.paid, and put the same secret in RAZORPAY_WEBHOOK_SECRET.
const db = require("./_db");
const pay = require("./_pay");

function rawBody(req) {
  return new Promise((ok, no) => {
    const parts = [];
    req.on("data", c => parts.push(c));
    req.on("end", () => ok(Buffer.concat(parts).toString("utf8")));
    req.on("error", no);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return db.reply(res, 405, { error: "Method not allowed." });
  try {
    // Read the untouched body; the signature is computed over the exact bytes Razorpay sent.
    const raw = typeof req.rawBody === "string" ? req.rawBody : await rawBody(req);
    if (!pay.verifyWebhook(raw, req.headers["x-razorpay-signature"])) return db.reply(res, 400, { error: "Bad signature." });
    const evt = JSON.parse(raw);
    const p = evt && evt.payload && evt.payload.payment && evt.payload.payment.entity;
    if ((evt.event === "payment.captured" || evt.event === "order.paid") && p && p.order_id) {
      await pay.markPaid(p.order_id, p.id);
    }
    return db.reply(res, 200, { ok: true });
  } catch (e) {
    return db.reply(res, 500, { error: "Webhook failed." });
  }
};
