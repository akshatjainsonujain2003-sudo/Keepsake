// Offer QR campaigns for business pages. Not a route: api/qr.js passes ?cp=<action> here and vercel.json rewrites
// /api/campaign/<action> to it (no extra serverless function).
//
// A shop runs a campaign ("Diwali: free sweet box above ₹999"). Every placement (a pamphlet run, a sticker, an ad)
// has its own QR: getkeepsake.in/o/<campaign>?p=<n>. A customer scans, CLAIMS the offer with their number and gets a
// code. That claim is what the shop pays for (one claim credit), so there is nothing to gain by skipping steps.
// At the shop the customer scans the shop's fixed COUNTER QR (getkeepsake.in/r/<page>) and their phone shows a live
// green ticket: the visit is proven by the customer, who wants the discount. A day later the customer is asked
// "Did you visit?"; shops whose customers say yes without redeeming are flagged for us in HQ.
//
//   camp:<cid>            = { cid, page, title, details, start, end, max, mode: "claims"|"flat", flatUntil, places: [names], on, created }
//   campz:<page>          = sorted set of the shop's campaigns
//   cst:<cid>:<metric>:<p> = counters per placement: scan, claim, red (redeemed), yes, no (visit answers)
//   clm:<token>           = { token, code, cid, page, p, phone, at, red, visit }
//   clmp:<cid>:<phone>    = token (one claim per number per campaign)
//   clmc:<page>:<CODE>    = token (find a claim by its code)
//   clmz:<cid>            = sorted set of claim tokens by time
//   ccr:<page>            = claim credits left (starts at 20 free)
const crypto = require("crypto");
const db = require("./_db");
const pay = require("./_pay");

const ID = /^[a-z0-9]{8,16}$/i, CID = /^[a-z0-9]{10}$/, TOK = /^[a-f0-9]{24}$/;
const FREE = 20, DAY = 864e5;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const E = (status, error, x) => ({ status, error, ...(x || {}) });
const ph10 = p => { const d = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? d : ""; };
const dayIST = t => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10);
const endOf = d => Date.parse(d + "T23:59:59+05:30");
const startOf = d => Date.parse(d + "T00:00:00+05:30");
const rid = n => { const c = "abcdefghijkmnpqrstuvwxyz23456789"; return [...crypto.randomBytes(n)].map(x => c[x % c.length]).join(""); };
const codeFor = t => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", w = String(t || "OFFER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X"); return w + "-" + [...crypto.randomBytes(4)].map(x => c[x % c.length]).join(""); };
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }

async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const shopOf = (m, id) => { const d = m.data || {}; return { id, name: clip(d.t || m.title || "Our shop", 60), area: clip(d.area, 40), logo: /^\/api\/img\?id=[\w-]+$|^\/assets\/[\w\/.-]+$|^https:\/\//.test(d.logo || "") ? d.logo : "", wa: ph10(d.wa || d.phone) ? "91" + ph10(d.wa || d.phone) : "", ac: /^#[0-9a-f]{6}$/i.test(d.ac || "") ? d.ac : "" }; };
const camp = cid => CID.test(String(cid || "")) ? db.getj("camp:" + cid) : null;

// ---------- credits ----------
const ck = id => "ccr:" + id;
async function credits(id) { await db.cmd("SET", ck(id), String(FREE), "NX"); return +(await db.cmd("GET", ck(id))) || 0; }
async function take(id) { await db.cmd("SET", ck(id), String(FREE), "NX"); const l = await db.cmd("DECRBY", ck(id), 1); if (l < 0) { await db.cmd("INCRBY", ck(id), 1); return false; } return true; }
const give = (id, n) => db.cmd("INCRBY", ck(id), n);

// Is the campaign taking claims right now? Returns a reason when it isn't.
async function closed(c, now = Date.now()) {
  if (!c.on) return "This offer is paused.";
  if (c.start && now < startOf(c.start)) return "This offer starts on " + c.start + ".";
  if (c.end && now > endOf(c.end)) return "This offer has ended.";
  if (c.max && +(await db.cmd("ZCARD", "clmz:" + c.cid)) >= c.max) return "All offers have been claimed.";
  const m = await page(c.page); if (!m || m.paid === false) return "This offer isn't available.";
  return "";
}
const flatOn = (c, now = Date.now()) => c.mode === "flat" && c.flatUntil > now;

// ---------- customer ----------
async function view(b) {
  const c = await camp(b.cid); if (!c) return E(404, "This offer wasn't found.");
  const m = await page(c.page); if (!m) return E(404, "This offer wasn't found.");
  const p = Math.max(0, Math.min(c.places.length - 1, Math.round(+b.p || 0)));
  if (b.count && !(await limit("cp-sv:" + c.cid + ":" + String(b.ip || ""), 3, 3600))) await db.cmd("INCR", `cst:${c.cid}:scan:${p}`);
  const why = await closed(c);
  // A customer who already claimed (their token, kept on their phone) gets their claim back.
  let mine = null;
  if (TOK.test(String(b.token || ""))) { const x = await db.getj("clm:" + b.token); if (x && x.cid === c.cid) mine = pubClaim(x); }
  return { ok: true, shop: shopOf(m, c.page), offer: { cid: c.cid, title: c.title, details: c.details, end: c.end, start: c.start }, open: !why, why, mine, p };
}
const pubClaim = x => ({ token: x.token, code: x.code, at: x.at, red: x.red || 0, visit: x.visit || "", cid: x.cid, page: x.page });

async function claim(b, ip) {
  const c = await camp(b.cid); if (!c) return E(404, "This offer wasn't found.");
  if (b.consent !== true) return E(400, "Tick the box to get your offer.");
  const phone = ph10(b.phone); if (!phone) return E(400, "Enter your 10-digit mobile number.");
  if (await limit("cp-ip:" + ip, 15, 3600)) return E(429, "Too many tries. Please wait a little.");
  // Same number again: give the same claim back (never charged twice).
  const had = await db.cmd("GET", `clmp:${c.cid}:${phone}`);
  if (had) { const x = await db.getj("clm:" + had); if (x) return { ok: true, again: true, claim: pubClaim(x) }; }
  const why = await closed(c); if (why) return E(409, why);
  const p = Math.max(0, Math.min(c.places.length - 1, Math.round(+b.p || 0)));
  // The shop pays per claim, unless the campaign is on a flat 14-day plan.
  const flat = flatOn(c);
  if (!flat && !(await take(c.page))) return E(409, "This offer isn't available right now.", { noCredits: true });
  const token = crypto.randomBytes(12).toString("hex"), x = { token, code: codeFor(c.title), cid: c.cid, page: c.page, p, phone, at: Date.now(), red: 0, paid: flat ? "flat" : "credit" };
  if ((await db.cmd("SET", `clmp:${c.cid}:${phone}`, token, "NX")) !== "OK") { if (!flat) await give(c.page, 1); const t2 = await db.cmd("GET", `clmp:${c.cid}:${phone}`); const y = await db.getj("clm:" + t2); return y ? { ok: true, again: true, claim: pubClaim(y) } : E(409, "Please try again."); }
  await db.setj("clm:" + token, x); await db.cmd("SET", `clmc:${c.page}:${x.code}`, token);
  await db.cmd("ZADD", "clmz:" + c.cid, x.at, token); await db.cmd("INCR", `cst:${c.cid}:claim:${p}`);
  return { ok: true, claim: pubClaim(x) };
}

// At the counter: the customer scanned the shop's counter QR. Their phone sends its claims (tokens) or a typed code.
async function counter(b) {
  const m = await page(b.page); if (!m || m.paid === false) return E(404, "This shop wasn't found.");
  const toks = (Array.isArray(b.tokens) ? b.tokens : []).filter(t => TOK.test(String(t))).slice(0, 20);
  const xs = toks.length ? (await db.cmd("MGET", ...toks.map(t => "clm:" + t))).map(parse).filter(x => x && x.page === b.page) : [];
  const out = [];
  for (const x of xs) { const c = await camp(x.cid); if (c) out.push({ ...pubClaim(x), title: c.title, details: c.details, end: c.end }); }
  return { ok: true, shop: shopOf(m, b.page), claims: out };
}
async function redeem(b, ip) {
  if (await limit("cp-rd:" + ip, 30, 3600)) return E(429, "Too many tries. Please wait a little.");
  let token = String(b.token || ""); const byCode = !TOK.test(token);
  if (!TOK.test(token) && b.code && ID.test(String(b.page || ""))) token = (await db.cmd("GET", `clmc:${b.page}:${String(b.code).toUpperCase().replace(/[^A-Z0-9-]/g, "")}`)) || "";
  if (!TOK.test(token)) return E(404, "That code wasn't found. Check it and try again.");
  const x = await db.getj("clm:" + token); if (!x) return E(404, "That code wasn't found.");
  if (b.page && x.page !== b.page) return E(409, "This offer is for another shop.");
  const c = await camp(x.cid); if (!c) return E(404, "This offer has ended.");
  // Found by code only: don't hand out the claim's token.
  const out = y => ({ ...pubClaim(y), title: c.title, ...(byCode ? { token: "" } : {}) });
  if (x.red) return { ok: true, already: true, claim: out(x) };
  if (c.end && Date.now() > endOf(c.end) + DAY) return E(409, "This offer ended on " + c.end + ".");
  // Only once, even if two phones tap at the same moment.
  if ((await db.cmd("SET", "clmr:" + token, "1", "NX")) !== "OK") { const y = await db.getj("clm:" + token); return { ok: true, already: true, claim: out(y) }; }
  x.red = Date.now(); x.by = b.by === "owner" ? "owner" : "customer"; await db.setj("clm:" + token, x); await db.cmd("INCR", `cst:${x.cid}:red:${x.p}`);
  return { ok: true, claim: out(x) };
}
// "Did you visit?" (asked on the customer's phone a few hours after claiming, if not redeemed yet).
async function visit(b) {
  if (!TOK.test(String(b.token || ""))) return E(400, "Invalid.");
  const x = await db.getj("clm:" + b.token); if (!x) return E(404, "Not found.");
  const a = b.answer === "yes" ? "yes" : b.answer === "no" ? "no" : ""; if (!a) return E(400, "Invalid.");
  if (x.visit) return { ok: true };
  x.visit = a; x.visitAt = Date.now(); await db.setj("clm:" + b.token, x); await db.cmd("INCR", `cst:${x.cid}:${a}:${x.p}`);
  return { ok: true };
}

// ---------- owner ----------
async function owner(b, ctx) {
  const m = await page(b.id); if (!m) return { err: E(404, "This shop page wasn't found.") };
  const u = await ctx.user(); if (!u || u.id !== m.owner) return { err: E(401, "Please log in as the owner of this page.") };
  return { m };
}
async function stats(c) {
  const ks = []; c.places.forEach((_, p) => ["scan", "claim", "red", "yes", "no"].forEach(k => ks.push(`cst:${c.cid}:${k}:${p}`)));
  const v = (await db.cmd("MGET", ...ks)).map(x => +x || 0);
  return c.places.map((name, p) => { const o = v.slice(p * 5, p * 5 + 5); return { name, scan: o[0], claim: o[1], red: o[2], yes: o[3], no: o[4] }; });
}
async function list(id) {
  const cids = await db.cmd("ZRANGE", "campz:" + id, 0, 49, "REV");
  const cs = cids.length ? (await db.cmd("MGET", ...cids.map(c => "camp:" + c))).map(parse).filter(Boolean) : [];
  const out = [];
  for (const c of cs) out.push({ ...c, flat: flatOn(c), stats: await stats(c), why: await closed(c) });
  const C = pay.catalog();
  return { ok: true, campaigns: out, credits: await credits(id), packs: Object.entries(C.claims.packs).map(([plan, p]) => ({ plan, size: p.size, price: p.price })), flatPrice: C.claims.flat.price, flatDays: C.claims.flat.days };
}
function readCampaign(b, c) {
  const title = clip(b.title, 40); if (title.length < 3) return E(400, "Write the offer (3 to 40 letters).");
  const today = dayIST(Date.now()), d = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? String(s) : "";
  const start = d(b.start) || (c && c.start) || today, end = d(b.end);
  if (!end) return E(400, "Pick the last day of the offer.");
  if (end < start) return E(400, "The last day must be after the first day.");
  if (end > dayIST(Date.now() + 120 * DAY)) return E(400, "Offers can run up to 4 months.");
  const places = (Array.isArray(b.places) ? b.places : []).map(x => clip(x, 30)).filter(Boolean).slice(0, 20);
  if (!places.length) places.push("Main QR");
  const max = Math.round(+b.max || 0);
  return { title, details: clip(b.details, 160), start, end, max: max > 0 ? Math.min(max, 100000) : 0, places };
}
async function save(b, m) {
  const id = b.id;
  if (b.cid) {
    const c = await camp(b.cid); if (!c || c.page !== id) return E(404, "Campaign not found.");
    const r = readCampaign(b, c); if (r.error) return r;
    // Placements can be added, never removed or reordered (their QRs are already printed).
    r.places = c.places.concat(r.places.slice(c.places.length)).slice(0, 20);
    Object.assign(c, r); if (b.on !== undefined) c.on = !!b.on; await db.setj("camp:" + c.cid, c);
    return list(id);
  }
  const n = +(await db.cmd("ZCARD", "campz:" + id)); if (n >= 50) return E(429, "You have a lot of campaigns. End an old one first.");
  const r = readCampaign(b); if (r.error) return r;
  const c = { cid: rid(10), page: id, ...r, mode: "claims", flatUntil: 0, on: true, created: Date.now() };
  await db.setj("camp:" + c.cid, c); await db.cmd("ZADD", "campz:" + id, c.created, c.cid);
  const L = await list(id); L.created = c.cid; return L;
}
async function claims(b) {
  const c = await camp(b.cid); if (!c || c.page !== b.id) return E(404, "Campaign not found.");
  const toks = await db.cmd("ZRANGE", "clmz:" + c.cid, 0, 499, "REV");
  const xs = toks.length ? (await db.cmd("MGET", ...toks.map(t => "clm:" + t))).map(parse).filter(Boolean) : [];
  return { ok: true, claims: xs.map(x => ({ code: x.code, phone: x.phone, at: x.at, red: x.red || 0, visit: x.visit || "", place: c.places[x.p] || "" })) };
}

// ---------- HQ: campaigns where customers say they visited but nothing was redeemed ----------
async function flags() {
  let cur = "0", keys = [];
  do { const r = await db.cmd("SCAN", cur, "MATCH", "camp:*", "COUNT", 500); cur = String(r[0]); keys.push(...r[1]); } while (cur !== "0" && keys.length < 5000);
  const cs = keys.length ? (await db.cmd("MGET", ...keys)).map(parse).filter(Boolean) : [];
  const out = [];
  for (const c of cs) {
    const s = (await stats(c)).reduce((a, x) => ({ claim: a.claim + x.claim, red: a.red + x.red, yes: a.yes + x.yes, no: a.no + x.no }), { claim: 0, red: 0, yes: 0, no: 0 });
    const rate = s.claim ? s.red / s.claim : 0, reasons = [];
    if (s.yes >= 3 && s.yes > s.red) reasons.push(`${s.yes} customers say they visited, only ${s.red} redeemed`);
    if (s.claim >= 30 && rate < 0.1) reasons.push(`only ${Math.round(rate * 100)}% of ${s.claim} claims redeemed`);
    if (reasons.length) { const m = await page(c.page); out.push({ cid: c.cid, title: c.title, page: c.page, shop: m ? shopOf(m, c.page).name : "", ...s, reasons }); }
  }
  return { flags: out.sort((a, b) => b.yes - a.yes) };
}

// action: view | claim | counter | redeem | visit (customers) · list | save | claims | own-redeem (owner)
async function handle(action, b, ctx) {
  b = b || {};
  if (action === "view") return view({ ...b, ip: ctx.ip });
  if (action === "claim") return claim(b, ctx.ip);
  if (action === "counter") return counter(b);
  if (action === "redeem") return redeem(b, ctx.ip);
  if (action === "visit") return visit(b);
  const o = await owner(b, ctx); if (o.err) return o.err;
  if (action === "list") return list(b.id);
  if (action === "save") return save(b, o.m);
  if (action === "claims") return claims(b);
  if (action === "own-redeem") { const r = await redeem({ page: b.id, code: b.code, by: "owner" }, ctx.ip); return r; }
  return E(400, "Unknown action.");
}
// Paid: this campaign takes unlimited claims for <days> days (from now, or added to time already bought).
async function flat(cid, pageId, days) {
  const c = await camp(cid); if (!c || c.page !== pageId) return null;
  c.mode = "flat"; c.flatUntil = Math.max(Date.now(), c.flatUntil || 0) + days * DAY; c.on = true;
  await db.setj("camp:" + cid, c); return c;
}
module.exports = { handle, give, flat, flags, camp };
