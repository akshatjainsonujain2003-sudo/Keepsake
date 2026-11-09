// Munshi's shop skills (used by api/_munshi.js): products and categories, stock, profit and GST bills, plus the text helpers
// that make voice and Hindi input precise (Devanagari names, spoken amounts like "dhai sau" or "saadhe teen hazaar").
// Changes are only proposed here. They run after the owner taps Haan, through the same rules as the dashboard:
//   products: the page data (customer-memory:<page>.data.menu, size limits as in api/customer-memories.js)
//   bills:    api/_bill.js bl-create (numbering, GST, HSN checks, udhaar for unpaid bills)
const db = require("./_db");
const { ph10 } = require("./_loyal");

const r0 = n => Math.round(+n || 0);
const r2 = n => Math.round((+n || 0) * 100) / 100;
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const money = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const numP = v => { const x = parseFloat(String(v == null ? "" : v).replace(/[^\d.]/g, "")); return isFinite(x) ? x : 0; };
const T = (lang, en, hl, hi) => lang === "hi" ? hi : lang === "en" ? en : hl;

// ---------- names: Devanagari to Latin, and a loose "sounds alike" key ----------
const CONS = { "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h", "ळ": "l" };
const VOW = { "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri", "ऑ": "o" };
const MAT = { "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri", "ॉ": "o", "ं": "n", "ँ": "n", "ः": "h" };
const NUK = { "क": "q", "ख": "kh", "ग": "g", "ज": "z", "ड": "r", "ढ": "rh", "फ": "f" };
function latin(s) {
  let out = "", prev = "";
  for (const ch of String(s || "")) {
    if (CONS[ch]) { out += CONS[ch] + "a"; prev = ch; }
    else if (ch === "़" && NUK[prev]) { out = out.slice(0, -(CONS[prev].length + 1)) + NUK[prev] + "a"; }
    else if (ch === "्") { if (out.endsWith("a")) out = out.slice(0, -1); }
    else if (MAT[ch]) { if (/[ंँः]/.test(ch)) out += MAT[ch]; else { if (out.endsWith("a")) out = out.slice(0, -1); out += MAT[ch]; } }
    else if (VOW[ch]) out += VOW[ch];
    else if (/[०-९]/.test(ch)) out += String("०१२३४५६७८९".indexOf(ch));
    else { if (/\s/.test(ch) && out.endsWith("a") && CONS[prev]) out = out.slice(0, -1); out += ch; prev = ""; }
  }
  if (out.endsWith("a") && CONS[prev]) out = out.slice(0, -1); // the last "a" isn't said in Hindi (रमेश → ramesh)
  return out;
}
// "Ramesh", "Rmesh", "रमेश" → "rms". Used only to shortlist; ties are always asked back ("Kaun se Ramesh?").
function skel(s) {
  let x = latin(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  x = x.replace(/ph/g, "f").replace(/sh/g, "s").replace(/ch/g, "c").replace(/w/g, "v").replace(/z/g, "j").replace(/q/g, "k").replace(/x/g, "ks").replace(/h/g, "");
  x = x.replace(/(.)\1+/g, "$1");
  return x.length > 1 ? x.charAt(0) + x.slice(1).replace(/[aeiouy]/g, "") : x;
}
function nameRank(name, q) {
  const a = String(name || "").toLowerCase().trim(), b = String(q || "").toLowerCase().trim();
  if (!b) return 0;
  if (a === b) return 4;
  const la = latin(a).toLowerCase(), lb = latin(b).toLowerCase();
  if (la === lb) return 4;
  const sa = skel(a), sb = skel(b);
  if (sa && sa === sb) return 3;
  if (la.includes(lb) && lb.length >= 3) return 2;
  const wa = la.split(/[^a-z0-9]+/).map(skel), wb = lb.split(/[^a-z0-9]+/).map(skel).filter(w => w.length >= 2);
  if (wb.length && wb.every(w => wa.includes(w))) return 2;
  if (sb.length >= 3 && sa.includes(sb)) return 1;
  return 0;
}
// The best matches only: all with the top rank (so two equally good names are both returned and asked back).
function best(list, q, nameOf) {
  const ranked = list.map(x => [nameRank(nameOf(x), q), x]).filter(p => p[0] > 0);
  const top = Math.max(0, ...ranked.map(p => p[0]));
  return ranked.filter(p => p[0] === top).map(p => p[1]);
}

// ---------- spoken amounts ----------
const NUM = { ek: 1, one: 1, teen: 3, tin: 3, three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5, chhe: 6, chhah: 6, chah: 6, six: 6, saat: 7, seven: 7, aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10, gyarah: 11, barah: 12, baarah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, twenty: 20, pachchees: 25, pachees: 25, tees: 30, thirty: 30, chalis: 40, chaalis: 40, forty: 40, pachaas: 50, pachas: 50, fifty: 50, saath: 60, sixty: 60, sattar: 70, seventy: 70, assi: 80, eighty: 80, nabbe: 90, ninety: 90, two: 2, do: 2,
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "बीस": 20, "पच्चीस": 25, "तीस": 30, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90 };
const HALF = { dhai: 2.5, dhaai: 2.5, dedh: 1.5, dedhh: 1.5, "ढाई": 2.5, "डेढ़": 1.5, "डेढ": 1.5 };
const MULT = { sau: 100, so: 100, hundred: 100, hazaar: 1e3, hazar: 1e3, hajar: 1e3, hajaar: 1e3, thousand: 1e3, k: 1e3, lakh: 1e5, lac: 1e5, lakhs: 1e5, crore: 1e7, karod: 1e7, "सौ": 100, "हज़ार": 1e3, "हजार": 1e3, "लाख": 1e5, "करोड़": 1e7, "करोड": 1e7 };
const FRAC = { saadhe: 0.5, sadhe: 0.5, saade: 0.5, sava: 0.25, savaa: 0.25, paune: -0.25, "साढ़े": 0.5, "साढे": 0.5, "सवा": 0.25, "पौने": -0.25 };
// Amounts said in words ("dhai sau", "saadhe teen hazaar", "ek lakh pachaas hazaar"). Plain digits and lone small words
// ("do" also means "give") are left alone; only groups with a multiplier or a half-word are returned.
function numsIn(text) {
  const toks = String(text || "").toLowerCase().replace(/(\d),(?=\d)/g, "$1").split(/[^\p{L}\p{M}\d.]+/u).filter(Boolean), out = [];
  let total = 0, cur = null, frac = 0, word = false;
  const flush = () => { if (word && (total || cur != null)) out.push(r2(total + (cur != null ? cur + frac : 0))); total = 0; cur = null; frac = 0; word = false; };
  for (const t of toks) {
    const dig = /^\d+(\.\d+)?$/.test(t) ? +t : null;
    if (FRAC[t] != null) { if (cur != null || total) flush(); frac = FRAC[t]; word = true; continue; }
    if (HALF[t] != null) { cur = (cur || 0) + HALF[t]; word = true; continue; }
    if (NUM[t] != null || dig != null) { cur = (cur || 0) + (dig != null ? dig : NUM[t]); continue; }
    if (MULT[t]) { word = true; const base = (cur != null ? cur : 1) + frac; frac = 0; if (MULT[t] === 100) cur = base * 100; else { total += base * MULT[t]; cur = null; } continue; }
    flush();
  }
  flush();
  return out.filter(n => n > 0 && n < 1e10);
}

// ---------- products ----------
const itemsOf = d => { const out = []; (d.menu || []).forEach((s, si) => (s.items || []).forEach((x, ii) => { if (x && x.n) out.push({ si, ii, x, sec: s.n || "" }); })); return out; };
const findItems = (d, q) => best(itemsOf(d), q, i => i.x.n).slice(0, 8);
const itemOut = i => ({ name: i.x.n, category: i.sec, price: numP(i.x.p), mrp: i.x.w ? numP(i.x.w) : null, stock: i.x.k == null || i.x.k === "" ? "not tracked" : r0(i.x.k), sold_out: !!i.x.so, unit: i.x.u || "", options: (i.x.v || []).length || 0 });
const bigPage = m => !!m && (!!m.store || !!m.storeAt || (m.proUntil || 0) > Date.now());
async function editMenu(id, fn) {
  const key = "customer-memory:" + id, m = await db.getj(key);
  if (!m || m.kind !== "biz") return { error: "This shop page wasn't found." };
  const d = JSON.parse(JSON.stringify(m.data || {})); d.menu = Array.isArray(d.menu) ? d.menu : [];
  const r = fn(d) || {}; if (r.error) return r;
  if (JSON.stringify(d).length > (bigPage(m) ? 450000 : 60000)) return { error: "Your page is too big for more products. Add the Online store to list all your products." };
  m.data = d; m.updated = Date.now();
  await db.setj(key, m);
  if (m.paid !== false) { try { await require("./_shopseo").ping(id, m); } catch (e) { console.error("munshi seo ping", e.message); } }
  return { ok: true, ...r };
}
const viewFor = m => m && (m.store || (m.proUntil || 0) > Date.now()) ? "store" : "menu";
const title = s => clip(s, 40).replace(/^./, c => c.toUpperCase());
const which = list => "More than one item matches: " + list.map(i => `${i.x.n} (${money(numP(i.x.p))}, ${i.sec || "no category"})`).join("; ") + ". Ask which one.";

// ---------- tools ----------
const S = (props, req) => ({ type: "object", properties: props, additionalProperties: false, ...(req ? { required: req } : {}) });
const TOOLS = [
  { name: "get_categories", description: "The shop's menu/product categories with how many items each has and a few examples. Call before adding a product, to put it in the right category.", input_schema: S({}) },
  { name: "get_stock", description: "Stock of items whose stock is tracked: low (at or below 'below', default 5), out (sold out or 0) or all.", input_schema: S({ filter: { type: "string", enum: ["low", "out", "all"] }, below: { type: "integer" } }, ["filter"]) },
  { name: "get_profit", description: "Profit for a period from cost prices the owner entered: profit, margin, sales counted, best items, and how many items sold without a cost price.", input_schema: S({ period: { type: "string", enum: ["today", "yesterday", "7d", "month", "last_month", "30d"] } }, ["period"]) },
  { name: "add_product", description: "ACTION (asks the owner first): add a product to the menu/product list. Pick the category from get_categories; make a new one only if none fits, with a short name like the others.", input_schema: S({ name: { type: "string" }, price: { type: "number", description: "Selling price in rupees" }, category: { type: "string" }, mrp: { type: "number" }, stock: { type: "integer" }, unit: { type: "string", description: "e.g. kg, pc, 500 g" }, description: { type: "string" } }, ["name", "price", "category"]) },
  { name: "update_product", description: "ACTION (asks the owner first): change one product: price, MRP, stock (set), add_stock (add to it, negative to reduce), sold out on/off, category, name or description.", input_schema: S({ name: { type: "string", description: "The product as it is now" }, new_name: { type: "string" }, price: { type: "number" }, mrp: { type: "number" }, stock: { type: "integer" }, add_stock: { type: "integer" }, sold_out: { type: "boolean" }, category: { type: "string" }, description: { type: "string" } }, ["name"]) },
  { name: "remove_product", description: "ACTION (asks the owner first): remove a product from the menu.", input_schema: S({ name: { type: "string" } }, ["name"]) },
  { name: "create_bill", description: "ACTION (asks the owner first): make a bill (a GST tax invoice for GST-registered shops) or an estimate. Items are matched to the menu for price and HSN; give price only for items not on the menu or when the owner says a different price. paid_by 'due' puts the amount in the customer's udhaar (needs their mobile).", input_schema: S({ items: { type: "array", items: S({ name: { type: "string" }, qty: { type: "number" }, price: { type: "number" }, hsn: { type: "string" } }, ["name", "qty"]) }, customer_name: { type: "string" }, customer_phone: { type: "string" }, customer_gstin: { type: "string" }, paid_by: { type: "string", enum: ["cash", "upi", "card", "bank", "due"] }, estimate: { type: "boolean" } }, ["items"]) }
];
const ACT = ["add_product", "update_product", "remove_product", "create_bill"];

const RUN = {
  async get_categories(a, x) {
    const secs = ((x.m.data || {}).menu || []).map(s => ({ name: s.n || "(no name)", items: (s.items || []).length, examples: (s.items || []).slice(0, 4).map(i => i && i.n).filter(Boolean) }));
    return { data: { shop_type: clip((x.m.data || {}).cat, 40), categories: secs }, card: secs.length ? { k: "list", t: "Categories", o: viewFor(x.m), r: secs.map(s => [s.name, s.examples.join(", "), s.items + " items"]) } : null };
  },
  async get_stock(a, x) {
    const f = ["low", "out", "all"].includes(a.filter) ? a.filter : "low", below = Math.max(0, Math.min(1e5, r0(a.below) || 5));
    const tracked = itemsOf(x.m.data || {}).filter(i => (i.x.k !== null && i.x.k !== undefined && i.x.k !== "") || i.x.so);
    const list = tracked.filter(i => f === "all" ? true : f === "out" ? i.x.so || r0(i.x.k) <= 0 : i.x.so || r0(i.x.k) <= below).sort((p, q) => r0(p.x.k) - r0(q.x.k)).slice(0, 25).map(itemOut);
    return { data: { filter: f, below, tracked_items: tracked.length, items: list }, mood: list.length && f !== "all" ? "lowstock" : "", card: list.length ? { k: "list", t: f === "out" ? "Sold out" : f === "low" ? "Low stock" : "Stock", o: viewFor(x.m), r: list.map(i => [i.name, i.category, i.sold_out ? "Sold out" : "Stock " + i.stock]) } : null };
  },
  async get_profit(a, x) {
    const p = await require("./_cost").profit(x.id, a.period || "today");
    const top = (p.items || []).slice(0, 6).map(y => ({ name: y.name, qty: y.qty, profit: y.profit, margin: y.margin }));
    return { data: { period: a.period || "today", profit: p.profit, margin_percent: p.margin, sales_counted: p.counted, all_sales: p.sales, gst: p.gst, top_items: top, items_without_cost: p.missing.length, sales_without_cost: r2(p.missing.reduce((t, y) => t + y.sales, 0)) },
      mood: p.profit < 0 ? "down" : "profit", card: { k: "num", v: p.profit, l: "Profit" + (p.margin != null ? " · " + p.margin + "% margin" : ""), ch: null, o: "store" } };
  }
};

const PROPOSE = {
  async add_product(a, x) {
    const name = clip(a.name, 80), price = r2(a.price), d = x.m.data || {};
    if (!name) return { error: "Give the product's name." };
    if (!(price > 0 && price <= 1e7)) return { error: "Give a selling price in rupees." };
    const dup = findItems(d, name).filter(i => nameRank(i.x.n, name) >= 3);
    if (dup.length) return { error: `"${dup[0].x.n}" is already on the menu at ${money(numP(dup[0].x.p))} in ${dup[0].sec || "no category"}. Use update_product to change it.` };
    const secs = (d.menu || []).filter(s => s && s.n), hit = best(secs, a.category, s => s.n)[0], cat = hit ? hit.n : title(a.category) || "Products", isNew = !hit;
    const mrp = a.mrp != null && +a.mrp > price ? r2(a.mrp) : null, stock = a.stock != null && +a.stock >= 0 ? r0(a.stock) : null, unit = clip(a.unit, 16), desc = clip(a.description, 200);
    const extra = [mrp ? "MRP " + money(mrp) : "", stock != null ? "stock " + stock : "", unit].filter(Boolean).join(" · ");
    return { tool: "padd", args: { name, price, cat, mrp, stock, unit, desc },
      text: T(x.lang, `Add "${name}" at ${money(price)} to ${cat}${isNew ? " (new category)" : ""}?${extra ? " " + extra : ""}`, `"${name}" ${money(price)} menu mein jodun? Category: ${cat}${isNew ? " (nayi)" : ""}${extra ? " · " + extra : ""}`, `"${name}" ${money(price)} मेन्यू में जोड़ूँ? कैटेगरी: ${cat}${isNew ? " (नई)" : ""}${extra ? " · " + extra : ""}`) };
  },
  async update_product(a, x) {
    const d = x.m.data || {}, hits = findItems(d, a.name);
    if (!hits.length) return { error: `No product called "${clip(a.name, 40)}" on the menu. Use find_menu_items to check the name.` };
    if (hits.length > 1) return { error: which(hits) };
    const i = hits[0], c = {}, said = [];
    if (a.new_name && clip(a.new_name, 80) !== i.x.n) { c.n = clip(a.new_name, 80); said.push(`name → ${c.n}`); }
    if (a.price != null) { const p = r2(a.price); if (!(p > 0 && p <= 1e7)) return { error: "Give a valid price." }; if (p !== numP(i.x.p)) { c.p = p; said.push(`price ${money(numP(i.x.p))} → ${money(p)}`); } }
    if (a.mrp != null) { c.w = +a.mrp > 0 ? r2(a.mrp) : ""; said.push(c.w ? `MRP ${money(c.w)}` : "MRP removed"); }
    const k0 = i.x.k == null || i.x.k === "" ? null : r0(i.x.k);
    if (a.stock != null) { c.k = Math.max(0, r0(a.stock)); said.push(`stock ${k0 == null ? "not tracked" : k0} → ${c.k}`); }
    else if (a.add_stock != null && r0(a.add_stock)) { c.k = Math.max(0, (k0 || 0) + r0(a.add_stock)); said.push(`stock ${k0 == null ? 0 : k0} → ${c.k}`); }
    if (a.sold_out != null && !!a.sold_out !== !!i.x.so) { c.so = !!a.sold_out; said.push(c.so ? "mark sold out" : "back in stock"); }
    else if (a.sold_out == null && i.x.so && c.k > 0) { c.so = false; said.push("back in stock"); }
    if (a.category) { const secs = (d.menu || []).filter(s => s && s.n), hit = best(secs, a.category, s => s.n)[0], cat = hit ? hit.n : title(a.category); if (cat !== i.sec) { c.cat = cat; said.push(`category ${i.sec || "–"} → ${cat}${hit ? "" : " (new)"}`); } }
    if (a.description != null) { c.d = clip(a.description, 200); said.push("description"); }
    if (!said.length) return { error: "Nothing to change: the product already looks like that." };
    return { tool: "pupd", args: { name: i.x.n, c }, text: T(x.lang, `"${i.x.n}": ${said.join(", ")}. Change it?`, `"${i.x.n}": ${said.join(", ")}. Badal dun?`, `"${i.x.n}": ${said.join(", ")}। बदल दूँ?`) };
  },
  async remove_product(a, x) {
    const hits = findItems(x.m.data || {}, a.name);
    if (!hits.length) return { error: `No product called "${clip(a.name, 40)}" on the menu.` };
    if (hits.length > 1) return { error: which(hits) };
    const i = hits[0];
    return { tool: "prem", args: { name: i.x.n }, text: T(x.lang, `Remove "${i.x.n}" (${money(numP(i.x.p))}, ${i.sec || "no category"}) from the menu?`, `"${i.x.n}" (${money(numP(i.x.p))}, ${i.sec || "no category"}) menu se hata dun?`, `"${i.x.n}" (${money(numP(i.x.p))}, ${i.sec || "no category"}) मेन्यू से हटा दूँ?`) };
  },
  async create_bill(a, x) {
    const G = require("../assets/gst.v2.js");
    const [set, mem] = await Promise.all([db.getj("blset:" + x.id), db.getj("blmem:" + x.id)]);
    if (!set) return { error: "Bills aren't set up yet. Ask the owner to open Sales once and choose their GST type (regular, composition or not registered)." };
    const est = a.estimate === true, gst = set.gst === "regular" || (!set.gst), lines = [];
    for (const it of (Array.isArray(a.items) ? a.items : []).slice(0, 40)) {
      const q = Math.round(+it.qty * 1000) / 1000; if (!(q > 0 && q <= 99999)) return { error: `Give a quantity for "${clip(it.name, 40)}".` };
      const hits = findItems(x.m.data || {}, it.name), strong = hits.filter(h => nameRank(h.x.n, it.name) >= 2);
      if (strong.length > 1 && !strong.some(h => nameRank(h.x.n, it.name) === 4)) return { error: which(strong) };
      const h = strong.find(h => nameRank(h.x.n, it.name) === 4) || strong[0];
      const n = h ? h.x.n : clip(it.name, 80), p = it.price != null && +it.price >= 0 ? r2(it.price) : h ? numP(h.x.p) : null;
      if (p == null) return { error: `"${clip(it.name, 40)}" isn't on the menu. Ask its price.` };
      const mm = (mem || {})[n.toLowerCase()] || {}, hsn = String(it.hsn || mm.h || set.hsn || "").replace(/\D/g, "").slice(0, 8), r = mm.r != null ? +mm.r : +set.rate || 0;
      if (gst && hsn.length < (set.big ? 6 : 4)) return { error: `"${n}" needs its HSN code for a GST bill. Ask the owner for it (it is remembered after the first bill).` };
      lines.push({ n, hsn, q, p, r: gst ? r : 0, dp: 0, ...(mm.u ? { u: mm.u } : {}) });
    }
    if (!lines.length) return { error: "Say which items go on the bill." };
    const phone = ph10(a.customer_phone), gstin = clip(a.customer_gstin, 15).toUpperCase().replace(/\s/g, ""), pay = ["cash", "upi", "card", "bank", "due"].includes(a.paid_by) ? a.paid_by : "cash";
    if (a.customer_phone && !phone) return { error: "The customer's mobile number should have 10 digits." };
    if (gstin && !G.gstinOk(gstin)) return { error: "That GSTIN doesn't look right. Ask the owner to check it." };
    if (pay === "due" && !phone && !est) return { error: "An udhaar bill needs the customer's 10-digit mobile number." };
    const calc = G.calc(lines, { gst: gst && (set.gst === "regular" || !set.gst), inc: set.inc !== false, seller: set.state, pos: gstin ? gstin.slice(0, 2) : set.state });
    const name = clip(a.customer_name, 60), PAY = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank", due: T(x.lang, "Udhaar", "Udhaar", "उधार") }[pay];
    const what = lines.map(l => `${l.q}× ${l.n}`).join(", "), who = name || phone || T(x.lang, "walk-in", "walk-in", "वॉक-इन");
    return { tool: "bill", args: { items: lines, cust: { name, phone, gstin }, pay, est },
      card: { k: "list", t: est ? "Estimate" : set.gst === "regular" ? "GST bill" : "Bill", r: [...calc.lines.filter(l => !l.x).map(l => [l.n, `${l.q} × ${money(l.p)}${l.r ? " · GST " + l.r + "%" : ""}`, money(l.amt)]), ["Total", set.gst === "regular" ? "GST " + money((calc.cgst || 0) + (calc.sgst || 0) + (calc.igst || 0)) + " incl." : "", money(calc.total)]] },
      text: T(x.lang, `Make ${est ? "an estimate" : "a bill"} for ${who}: ${what}. Total ${money(calc.total)}${pay ? ", " + PAY : ""}?`, `${who} ka ${est ? "estimate" : "bill"} banaun? ${what}. Total ${money(calc.total)} · ${PAY}`, `${who} का ${est ? "एस्टिमेट" : "बिल"} बनाऊँ? ${what}। कुल ${money(calc.total)} · ${PAY}`) };
  }
};

async function perform(p, id, ctx, lang, m) {
  const a = p.args, v = viewFor(m);
  if (p.tool === "padd") {
    const r = await editMenu(id, d => {
      if (itemsOf(d).some(i => nameRank(i.x.n, a.name) === 4)) return { error: `"${a.name}" is already on the menu.` };
      let s = d.menu.find(s => s && String(s.n || "").toLowerCase() === a.cat.toLowerCase());
      if (!s) { s = { n: a.cat, items: [] }; d.menu.push(s); }
      s.items = s.items || [];
      s.items.push({ n: a.name, p: String(a.price), ...(a.mrp ? { w: String(a.mrp) } : {}), ...(a.stock != null ? { k: a.stock } : {}), ...(a.unit ? { u: a.unit } : {}), ...(a.desc ? { d: a.desc } : {}) });
    });
    if (r.error) return { text: r.error, mood: "cant" };
    return { text: T(lang, `Added "${a.name}" to ${a.cat}.`, `"${a.name}" ${a.cat} mein jud gaya.`, `"${a.name}" ${a.cat} में जुड़ गया।`), go: { v, hi: a.name, reload: true }, mood: "order" };
  }
  if (p.tool === "pupd") {
    let nm = a.name;
    const r = await editMenu(id, d => {
      const hit = itemsOf(d).filter(i => i.x.n === a.name); if (hit.length !== 1) return { error: `"${a.name}" changed in the meantime. Ask Munshi again.` };
      const i = hit[0], x = i.x, c = a.c;
      if (c.n) { x.n = c.n; nm = c.n; } if (c.p != null) x.p = String(c.p); if (c.w != null) x.w = c.w === "" ? "" : String(c.w); if (c.k != null) { x.k = c.k; if (c.k > 0 && c.so == null) x.so = false; } if (c.so != null) x.so = c.so; if (c.d != null) x.d = c.d;
      if (c.cat) { d.menu[i.si].items.splice(i.ii, 1); let s = d.menu.find(s => s && String(s.n || "").toLowerCase() === c.cat.toLowerCase()); if (!s) { s = { n: c.cat, items: [] }; d.menu.push(s); } (s.items = s.items || []).push(x); }
    });
    if (r.error) return { text: r.error, mood: "cant" };
    return { text: T(lang, `Updated "${nm}".`, `"${nm}" badal diya.`, `"${nm}" बदल दिया।`), go: { v, hi: nm, reload: true }, mood: "order" };
  }
  if (p.tool === "prem") {
    const r = await editMenu(id, d => { const hit = itemsOf(d).filter(i => i.x.n === a.name); if (hit.length !== 1) return { error: `"${a.name}" isn't on the menu any more.` }; d.menu[hit[0].si].items.splice(hit[0].ii, 1); });
    if (r.error) return { text: r.error, mood: "cant" };
    return { text: T(lang, `Removed "${a.name}".`, `"${a.name}" hata diya.`, `"${a.name}" हटा दिया।`), go: { v, reload: true }, mood: "order" };
  }
  if (p.tool === "bill") {
    const r = await require("./_bill").handle({ action: "bl-create", id, items: a.items, cust: a.cust, pay: { mode: a.pay }, est: a.est, khata: true }, ctx);
    if (r.error) return { text: r.error, mood: "cant", go: { v: "sales" } };
    const b = r.bill;
    return { text: T(lang, `${a.est ? "Estimate" : "Bill"} ${b.no} made: ${money(b.calc.total)}.${r.khata ? ` Added to udhaar; ${a.cust.name || a.cust.phone} now owes ${money(r.khata.bal)}.` : ""}`, `${a.est ? "Estimate" : "Bill"} ${b.no} ban gaya: ${money(b.calc.total)}.${r.khata ? ` Udhaar mein likh diya, ab ${money(r.khata.bal)} baaki.` : ""}`, `${a.est ? "एस्टिमेट" : "बिल"} ${b.no} बन गया: ${money(b.calc.total)}।${r.khata ? ` उधार में लिख दिया, अब ${money(r.khata.bal)} बाकी।` : ""}`),
      link: { u: "/bill/" + b.t, l: T(lang, "Open / print the bill", "Bill kholo / print karo", "बिल खोलें / प्रिंट करें") }, go: { v: "sales" }, mood: "bill" };
  }
  return null;
}

module.exports = { TOOLS, ACT, RUN, PROPOSE, perform, latin, skel, nameRank, best, numsIn, itemsOf, findItems, itemOut, viewFor };
