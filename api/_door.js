// The secret door for the admin pages and API (see middleware.js). The cookie is an HMAC of ADMIN_DOOR, so it can't be guessed.
const crypto = require("crypto");
const token = secret => crypto.createHmac("sha256", String(secret)).update("ks-hq-door-v1").digest("hex");
function open(req) {
  const secret = process.env.ADMIN_DOOR || "";
  if (secret.length < 12) return false;
  const m = String((req.headers || {}).cookie || "").match(/(?:^|;\s*)ks_door=([^;]+)/), got = Buffer.from(m ? m[1] : ""), want = Buffer.from(token(secret));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
module.exports = { open, token };
