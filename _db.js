// Tiny Upstash/Vercel-KV REST client (no dependencies).
// Works with any env-var prefix Vercel gives the database (KV_, STORAGE_, UPSTASH_REDIS_ ...).
const env = process.env;
const pick = suf => { const k = Object.keys(env).find(k => k.endsWith(suf) && !k.includes("READ_ONLY")); return k ? env[k] : undefined; };
const U = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || pick("_REST_API_URL") || pick("_REDIS_REST_URL");
const T = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || pick("_REST_API_TOKEN") || pick("_REDIS_REST_TOKEN");
exports.ok = () => !!(U && T);
const cmd = async (...a) => {
  const r = await fetch(U, { method: "POST", headers: { Authorization: "Bearer " + T, "Content-Type": "application/json" }, body: JSON.stringify(a) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
};
exports.cmd = cmd;
exports.getj = async k => { const v = await cmd("GET", k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
exports.setj = (k, v, ...x) => cmd("SET", k, JSON.stringify(v), ...x);
exports.rid = (n = 6) => { const c = "abcdefghijkmnpqrstuvwxyz23456789"; return [...require("crypto").randomBytes(n)].map(x => c[x % c.length]).join(""); };
exports.reply = (res, code, j) => { res.setHeader("Cache-Control", "no-store"); res.status(code).json(j); };
exports.KEY = /^[\w-]{8,40}$/;
exports.activeShop = async key => { if (!exports.KEY.test(String(key || ""))) return null; const s = await exports.getj("shop:" + key); return s && s.active !== false && s.exp > Date.now() ? s : null; };
