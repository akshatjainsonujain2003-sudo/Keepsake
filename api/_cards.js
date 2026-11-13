// Physical gift cards (acrylic QR cards) for the gifts side. Not a route: called from api/admin.js ("cards-*" actions).
// A print run is a prepaid batch (see _prepaid.js), so every card has a code (its QR opens getkeepsake.in/k/CODE) and a 6-digit PIN,
// and the buyer activates it exactly like any other prepaid code. This file adds what a physical product needs on top:
// card designs, print runs, where each card is (printer, stock, shop, sold), cancelling a lost card, and counts.
// cdesign:<ID>  = { id, name, tier: "site"|"card", qrSize (mm), note, front, back (artwork links), active, created }
// cdesigns      = sorted set of design ids (score = created)
// crun:<ID>     = { id (same as the prepaid batch id), design, name, tier, count, note, created }
// cruns         = sorted set of run ids (score = created)
// cstock:<ID>   = hash: CODE -> { s: stage, w: where, at }   (no entry = still at the printer)
// pcode:<CODE>  gets one extra field when a card is cancelled: void = true (and locked = true, so it can't be activated)
const db = require("./_db");
const pp = require("./_prepaid");

const STAGES = { printing: "At the printer", stock: "In stock", shop: "With a shop", sold: "Sold directly" };
const TIERS = { site: "Love-story website", card: "Memory card" };
const text = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n);
const link = v => { const s = text(v, 300); return /^https:\/\/[^\s"']+$/.test(s) ? s : ""; };
const idOk = v => /^[a-z0-9]{6,20}$/.test(String(v || ""));
const day = t => new Date(t + 19800000).toISOString().slice(0, 10); // India time

// Upstash returns a hash as a flat [key, value, ...] list.
async function hgetall(k) {
  const r = await db.cmd("HGETALL", k), o = {};
  if (Array.isArray(r)) for (let i = 0; i < r.length; i += 2) o[r[i]] = r[i + 1]; else if (r) Object.assign(o, r);
  for (const c in o) { try { o[c] = JSON.parse(o[c]); } catch (e) { delete o[c]; } }
  return o;
}
async function mgetj(keys) {
  if (!keys.length) return [];
  return (await db.cmd("MGET", ...keys)).map(v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } });
}

// ---------- designs ----------
async function designs() {
  const ids = await db.cmd("ZRANGE", "cdesigns", 0, -1, "REV");
  return (await mgetj(ids.map(i => "cdesign:" + i))).filter(Boolean);
}
async function saveDesign(b) {
  const name = text(b.name, 40); if (name.length < 2) return { error: "Give the design a name." };
  if (!TIERS[b.tier]) return { error: "Choose what the card unlocks: a website or a memory card." };
  const qrSize = Math.round(+b.qrSize || 20); if (!(qrSize >= 12 && qrSize <= 40)) return { error: "QR size should be between 12 and 40 mm." };
  const old = idOk(b.id) ? await db.getj("cdesign:" + b.id) : null;
  if (b.id && !old) return { error: "Design not found." };
  const d = { id: old ? old.id : db.rid(8), created: old ? old.created : Date.now(), name, tier: b.tier, qrSize, note: text(b.note, 200), front: link(b.front), back: link(b.back), active: b.active !== false };
  await db.setj("cdesign:" + d.id, d);
  if (!old) await db.cmd("ZADD", "cdesigns", d.created, d.id);
  return { design: d };
}

// ---------- print runs ----------
async function createRun(b) {
  const d = idOk(b.design) ? await db.getj("cdesign:" + b.design) : null;
  if (!d) return { error: "Choose a card design first." };
  if (d.active === false) return { error: "This design is archived. Bring it back before printing more." };
  const x = await pp.createBatch({ count: b.count, tier: d.tier, shop: "Cards · " + d.name, note: text(b.note, 120) });
  if (x.error) return { error: x.error };
  const run = { id: x.batch.id, design: d.id, name: d.name, tier: d.tier, count: x.batch.count, note: text(b.note, 120), created: x.batch.created };
  await db.setj("crun:" + run.id, run);
  await db.cmd("ZADD", "cruns", run.created, run.id);
  return { run };
}

// Every card of a run, in print order (n = its number in the run, the same number is on its PIN insert).
async function runCards(id) {
  const run = idOk(id) ? await db.getj("crun:" + id) : null; if (!run) return null;
  const batch = await db.getj("pbatch:" + run.id); if (!batch) return null;
  const [recs, stock] = await Promise.all([mgetj(batch.codes.map(c => "pcode:" + c)), hgetall("cstock:" + run.id)]);
  const cards = batch.codes.map((code, i) => {
    const r = recs[i] || {}, s = stock[code] || {};
    return { n: i + 1, code, pin: r.pin || "", status: r.void ? "void" : r.status === "claimed" ? "active" : "new", locked: !!r.locked && !r.void, fails: r.fails || 0,
      stage: STAGES[s.s] ? s.s : "printing", where: s.w || "", claimedAt: r.claimedAt || 0, kind: r.kind || "", page: r.status === "claimed" && r.memory ? pp.urlFor(r.kind, r.memory) : "" };
  });
  return { run, cards };
}
const tally = cards => {
  const t = { made: cards.length, printing: 0, stock: 0, shop: 0, sold: 0, active: 0, void: 0 };
  for (const c of cards) t[c.status === "new" ? c.stage : c.status]++;
  return t;
};

// Move cards to another stage. Give either a list of codes, or a count (the first cards, in print order, that are in `from`).
// Activated and cancelled cards never move.
async function move(b) {
  const x = await runCards(b.run); if (!x) return { error: "Print run not found." };
  if (!STAGES[b.to]) return { error: "Choose where the cards are going." };
  const where = b.to === "shop" || b.to === "sold" ? text(b.where, 60) : "";
  if (b.to === "shop" && !where) return { error: "Type the shop's name." };
  let pick = x.cards.filter(c => c.status === "new" && c.stage !== b.to || c.status === "new" && c.where !== where);
  if (Array.isArray(b.codes) && b.codes.length) { const want = new Set(b.codes.map(pp.codeOf)); pick = pick.filter(c => want.has(c.code)); }
  else {
    if (STAGES[b.from]) pick = pick.filter(c => c.stage === b.from);
    const n = b.count === "all" ? pick.length : Math.round(+b.count);
    if (!(n >= 1)) return { error: "How many cards?" };
    if (n > pick.length) return { error: `Only ${pick.length} card${pick.length === 1 ? " is" : "s are"} available to move.` };
    pick = pick.slice(0, n);
  }
  if (!pick.length) return { error: "No cards to move." };
  const at = Date.now(), args = [];
  for (const c of pick) args.push(c.code, JSON.stringify({ s: b.to, w: where, at }));
  await db.cmd("HSET", "cstock:" + x.run.id, ...args);
  return { ok: true, moved: pick.length, to: b.to, where };
}

// ---------- one card ----------
async function lookup(q) {
  const code = pp.codeOf(q); if (!pp.valid(code)) return { status: 400, error: "That doesn't look like a card code. It is 10 letters and numbers starting with KS." };
  const rec = await db.getj("pcode:" + code); if (!rec) return { status: 404, error: "No card has that code." };
  const run = await db.getj("crun:" + rec.batch), batch = run ? await db.getj("pbatch:" + rec.batch) : null;
  const s = run ? (await hgetall("cstock:" + run.id))[code] || {} : {};
  return { card: { code, pin: rec.pin, status: rec.void ? "void" : rec.status === "claimed" ? "active" : "new", locked: !!rec.locked && !rec.void, fails: rec.fails || 0, tier: rec.tier,
    stage: STAGES[s.s] ? s.s : "printing", where: s.w || "", claimedAt: rec.claimedAt || 0, page: rec.status === "claimed" && rec.memory ? pp.urlFor(rec.kind, rec.memory) : "",
    run: run ? { id: run.id, name: run.name, created: run.created, count: run.count } : null, n: batch ? batch.codes.indexOf(code) + 1 : 0 } };
}
// Cancel a lost or damaged card so nobody can activate it, or bring it back.
async function setVoid(q, on) {
  const rec = await pp.get(pp.codeOf(q)); if (!rec) return { status: 404, error: "No card has that code." };
  if (rec.status === "claimed") return { error: "This card is already activated, so it can't be cancelled." };
  if (on) { rec.void = true; rec.locked = true; } else { delete rec.void; rec.locked = false; rec.fails = 0; }
  await db.setj("pcode:" + rec.code, rec);
  return { ok: true, code: rec.code, void: !!on };
}
async function unlock(q) {
  const rec = await pp.get(pp.codeOf(q)); if (!rec) return { status: 404, error: "No card has that code." };
  if (rec.void) return { error: "This card is cancelled. Bring it back first." };
  await pp.unlock(rec.code); return { ok: true, code: rec.code };
}

// ---------- overview ----------
async function runs() {
  const ids = await db.cmd("ZRANGE", "cruns", 0, 79, "REV");
  return (await Promise.all(ids.map(runCards))).filter(Boolean);
}
async function summary() {
  const [all, ds] = await Promise.all([runs(), designs()]);
  const total = tally([]), byDesign = {}, byShop = {}, days = {}, now = Date.now();
  for (let i = 29; i >= 0; i--) days[day(now - i * 864e5)] = 0;
  const list = all.map(({ run, cards }) => {
    const t = tally(cards);
    for (const k in t) total[k] += t[k];
    const d = byDesign[run.design] || (byDesign[run.design] = { id: run.design, name: run.name, ...tally([]) });
    for (const k in t) d[k] += t[k];
    for (const c of cards) {
      if (c.stage === "shop" && c.where && c.status !== "void") { const s = byShop[c.where] || (byShop[c.where] = { name: c.where, given: 0, active: 0 }); s.given++; if (c.status === "active") s.active++; }
      if (c.status === "active" && c.claimedAt) { const k = day(c.claimedAt); if (k in days) days[k]++; }
    }
    return { ...run, ...t };
  });
  return { total, runs: list, designs: ds.map(d => ({ ...d, ...(byDesign[d.id] || tally([])) })),
    shops: Object.values(byShop).sort((a, b) => b.given - a.given), days: Object.entries(days).map(([d, n]) => ({ d, n })), stages: STAGES, tiers: TIERS };
}

async function handle(b) {
  switch (b.action) {
    case "cards-summary": return summary();
    case "cards-design-save": return saveDesign(b);
    case "cards-run-create": return createRun(b);
    case "cards-run": { const x = await runCards(b.id); return x ? { ...x, tally: tally(x.cards), stages: STAGES } : { status: 404, error: "Print run not found." }; }
    case "cards-move": return move(b);
    case "cards-find": return lookup(b.q);
    case "cards-void": return setVoid(b.q, b.on !== false);
    case "cards-unlock": return unlock(b.q);
  }
  return { error: "Unknown action." };
}

module.exports = { handle, designs, saveDesign, createRun, runCards, move, lookup, setVoid, unlock, summary, tally, STAGES, TIERS };
