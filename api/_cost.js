// Cost prices and profit (Keepsake Pro). Not a route: api/qr.js passes cs-* actions here.
// The shop's page data (menu, prices) is public: every customer's phone loads it. So cost prices are never kept there.
//   cost:<page> = { "<item name, lower case>": [cost, updatedAt] }   read and written by the owner only
// Each new sale saves the cost of what was sold at that moment (page orders and shop sales: items[].c;
// bills: cs = cost per line; a credit note copies its bill's), so changing a cost later doesn't rewrite old profit.
// Sales made before a cost was entered use today's cost.
// Profit leaves GST out for GST-registered shops: bills use each line's taxable value (after discounts), and page orders
// and shop sales have GST taken out at the item's rate from bills (blmem) or the shop's default rate.
// Shops that aren't registered, or are on composition, count the price as it is.
const db = require("./_db");

const ID = /^[a-z0-9]{8,16}$/i, IST = 5.5 * 36e5, DAY = 864e5, MAXC = 5000;
const E = (status, error) => ({ status, error });
const r2 = n => Math.round((+n || 0) * 100) / 100;
const key = n => String(n == null ? "" : n).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 90);
const base = n => key(String(n || "").replace(/\s*\([^)]*\)\s*$/, "")); // "Iced Latte (Large, Extra shot)" → "iced latte"
const parse = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const isPro = m => (m.proUntil || 0) > Date.now();
const money = v => { const s = String(v == null ? "" : v).replace(/[₹,\s]/g, ""); if (!s) return null; if (!/^\d+(\.\d+)?$/.test(s)) return NaN; const x = Math.round(+s * 100) / 100; return x <= 1e7 ? x : NaN; };

async function page(id) {
  if (!ID.test(String(id || ""))) return null;
  const m = await db.getj("customer-memory:" + id);
  return m && m.kind === "biz" ? m : null;
}
const load = async id => (await db.getj("cost:" + id)) || {};
function costIn(map, n) { const a = map[key(n)] || map[base(n)]; return a ? a[0] : null; }

// Called when a sale is saved: each item gets the cost it has right now (nothing is added if the shop has no costs).
async function attach(id, items) {
  try { const map = await load(id); if (!Object.keys(map).length) return; for (const x of items) { const c = costIn(map, x.n); if (c != null) x.c = c; } }
  catch (e) { console.error("cost attach", e.message); }
}
async function lineCosts(id, lines) {
  try { const map = await load(id); if (!Object.keys(map).length) return null; const cs = lines.map(l => l.x ? null : costIn(map, l.n)); return cs.some(c => c != null) ? cs : null; }
  catch (e) { console.error("cost lines", e.message); return null; }
}

// ---------- profit ----------
const PERIODS = ["today", "yesterday", "7d", "month", "last_month", "30d"];
function range(p, now0) {
  const now = now0 + 1000; // include a sale saved this very second
  const d0 = now0 - ((now0 + IST) % DAY), d = new Date(now0 + IST), mS = (y, mo) => Date.UTC(y, mo, 1) - IST;
  if (p === "yesterday") return [d0 - DAY, d0];
  if (p === "7d") return [d0 - 6 * DAY, now];
  if (p === "30d") return [d0 - 29 * DAY, now];
  if (p === "month") return [mS(d.getUTCFullYear(), d.getUTCMonth()), now];
  if (p === "last_month") return [mS(d.getUTCFullYear(), d.getUTCMonth() - 1), mS(d.getUTCFullYear(), d.getUTCMonth())];
  return [d0, now];
}
async function mget(keys) { const out = []; for (let i = 0; i < keys.length; i += 200) out.push(...(await db.cmd("MGET", ...keys.slice(i, i + 200))).map(parse)); return out; }

async function profit(id, p, now = Date.now()) {
  const [t0, t1] = range(PERIODS.includes(p) ? p : "today", now);
  const [refs, toks, map, set, mem] = await Promise.all([
    db.cmd("ZRANGE", "bzoz:" + id, String(t0), String(t1), "BYSCORE", "LIMIT", 0, 5000),
    db.cmd("ZRANGE", "blz:" + id, String(t0), String(t1), "BYSCORE", "LIMIT", 0, 5000),
    load(id), db.getj("blset:" + id), db.getj("blmem:" + id)]);
  const [os, bs] = await Promise.all([mget((refs || []).map(r => "bzo:" + id + ":" + r)), mget((toks || []).map(t => "bl:" + t))]);
  const gst = (set && set.gst) || "none", regular = gst === "regular", rateOf = n => { const x = (mem || {})[key(n)]; return x && x.r != null ? +x.r : +(set && set.rate) || 0; };
  const it = {}, add = (n, q, rev, c) => {
    const k = base(n) || key(n), y = it[k] = it[k] || { name: String(n).replace(/\s*\([^)]*\)\s*$/, ""), qty: 0, sales: 0, costed: 0, cost: 0, missing: 0 };
    y.qty += q; y.sales += rev; if (c != null) { y.costed += rev; y.cost += c * q; } else y.missing += rev;
  };
  os.forEach(o => {
    if (!o || o.st === "cancel" || o.at < t0 || o.at >= t1) return;
    const sub = (o.items || []).reduce((t, x) => t + x.q * x.p, 0), f = sub > 0 ? Math.max(0, (o.tot - (o.fee || 0)) / sub) : 1; // a shop sale's discount is shared across its items
    (o.items || []).forEach(x => { let rev = x.q * x.p * f; if (regular) rev /= 1 + rateOf(x.n) / 100; add(x.n, x.q, rev, x.c != null ? x.c : costIn(map, x.n)); });
  });
  bs.forEach(b => {
    if (!b || b.cancel || b.kind === "est" || b.at < t0 || b.at >= t1 || !b.calc) return;
    const sg = b.kind === "credit" ? -1 : 1;
    (b.calc.lines || []).forEach((l, i) => { if (l.x) return; const c = b.cs && b.cs[i] != null ? b.cs[i] : costIn(map, l.n); add(l.n, sg * l.q, sg * (l.tv != null ? l.tv : l.amt), c); });
  });
  const items = Object.values(it).filter(y => y.qty || y.sales).map(y => ({ name: y.name, qty: Math.round(y.qty * 1000) / 1000, sales: r2(y.sales), cost: r2(y.cost),
    profit: y.costed || y.cost ? r2(y.costed - y.cost) : null, margin: y.costed > 0 ? Math.round((y.costed - y.cost) * 1000 / y.costed) / 10 : null, missing: r2(y.missing) }));
  const S = items.reduce((t, y) => t + y.sales, 0), C = items.reduce((t, y) => t + (y.sales - y.missing), 0), K = items.reduce((t, y) => t + y.cost, 0);
  return { ok: true, period: p, from: t0, to: t1, gst, sales: r2(S), counted: r2(C), cost: r2(K), profit: r2(C - K), margin: C > 0 ? Math.round((C - K) * 1000 / C) / 10 : null,
    items: items.filter(y => y.profit != null).sort((a, b) => b.profit - a.profit).slice(0, 40),
    missing: items.filter(y => y.missing > 0).sort((a, b) => b.missing - a.missing).slice(0, 40).map(y => ({ name: y.name, qty: y.qty, sales: y.missing })) };
}

async function handle(b, ctx) {
  const a = String(b.action || "");
  const m = await page(b.id); if (!m) return E(404, "This shop page wasn't found.");
  const u = await ctx.user(); if (!u || u.id !== m.owner) return E(401, "Please log in as the owner of this page.");
  const id = String(b.id), pro = isPro(m);
  if (a === "cs-get") {
    const map = await load(id), set = await db.getj("blset:" + id);
    const mem = set && set.gst === "regular" ? (await db.getj("blmem:" + id)) || {} : {};
    return { ok: true, pro, gst: (set && set.gst) || "none", rate: +(set && set.rate) || 0, rates: Object.fromEntries(Object.entries(mem).filter(([k, v]) => v && v.r != null).map(([k, v]) => [k, +v.r])),
      costs: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v[0]])) };
  }
  if (!pro) return E(402, "Cost prices and profit are part of Keepsake Pro.");
  if (a === "cs-set") {
    const list = (Array.isArray(b.items) ? b.items : []).slice(0, 1000), map = await load(id), now = Date.now();
    for (const x of list) {
      const k = key(x && x.n); if (!k) continue; const c = money(x.c);
      if (Number.isNaN(c)) return E(400, `The cost for "${String(x.n).slice(0, 40)}" isn't a valid amount.`);
      if (x.from && key(x.from) !== k) delete map[key(x.from)]; // the product was renamed
      if (c == null) delete map[k]; else { delete map[k]; map[k] = [c, now]; }
    }
    const ks = Object.keys(map); for (const k of ks.slice(0, Math.max(0, ks.length - MAXC))) delete map[k];
    await db.setj("cost:" + id, map);
    return { ok: true, costs: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v[0]])) };
  }
  if (a === "cs-profit") return profit(id, String(b.period || "today"));
  return E(400, "Unknown action.");
}

module.exports = { handle, attach, lineCosts, profit, key };
