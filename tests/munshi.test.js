// Run: node --test tests/*.test.js
// Munshi: the owner's AI helper. The AI is faked here: these tests check the tools, numbers, Haan/Nahi actions and limits.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map(), zs = new Map(), hs = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "DEL": return kv.delete(a[0]) ? 1 : 0;
    case "GETDEL": { const v = kv.has(a[0]) ? kv.get(a[0]) : null; kv.delete(a[0]); return v; }
    case "INCR": case "DECR": { const n = (+kv.get(a[0]) || 0) + (c === "INCR" ? 1 : -1); kv.set(a[0], String(n)); return n; }
    case "EXPIRE": case "ZREMRANGEBYRANK": return 1;
    case "EXISTS": return kv.has(a[0]) ? 1 : 0;
    case "ZADD": { const z = zs.get(a[0]) || new Map(); z.set(a[2], +a[1]); zs.set(a[0], z); return 1; }
    case "ZCARD": return (zs.get(a[0]) || new Map()).size;
    case "ZSCORE": { const z = zs.get(a[0]); return z && z.has(a[1]) ? String(z.get(a[1])) : null; }
    case "ZREM": { const z = zs.get(a[0]); return z && z.delete(a[1]) ? 1 : 0; }
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "ZRANGE": {
      const all = [...(zs.get(a[0]) || new Map())].sort((x, y) => x[1] - y[1]);
      if (a.includes("BYSCORE")) { const lo = +a[1], hi = +a[2], i = a.indexOf("LIMIT"); const r = all.filter(x => x[1] >= lo && x[1] <= hi).map(x => x[0]); return i > 0 ? r.slice(+a[i + 1], +a[i + 1] + +a[i + 2]) : r; }
      const z = all.map(x => x[0]); if (a.includes("REV")) z.reverse(); const e = +a[2] < 0 ? z.length + +a[2] : +a[2]; return z.slice(+a[1], e + 1);
    }
    case "HINCRBY": { const h = hs.get(a[0]) || {}; h[a[1]] = (h[a[1]] || 0) + +a[2]; hs.set(a[0], h); return h[a[1]]; }
    case "HGETALL": return Object.entries(hs.get(a[0]) || {}).flat().map(String);
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)), rid: (n = 6) => Math.random().toString(36).slice(2, 2 + n).padEnd(n, "a") };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
require.cache[path.resolve(__dirname, "../api/_hq.js")] = { id: "hq", filename: "hq", loaded: true, exports: { notify: async () => ({ sent: 0 }) } };

// The fake AI: each test queues the answers it should give, and every request it receives is kept.
const sent = []; let queue = [];
global.fetch = async (url, opt) => { const body = JSON.parse(opt.body); sent.push({ url, body }); const next = queue.shift(); if (!next) throw new Error("no fake answer queued"); return { ok: next.status ? false : true, status: next.status || 200, json: async () => next.json }; };
const claudeText = t => ({ json: { content: [{ type: "text", text: t }], usage: { input_tokens: 900, cache_read_input_tokens: 2500, output_tokens: 60 } } });
const claudeTool = (name, input) => ({ json: { content: [{ type: "tool_use", id: "tu_" + name, name, input }], usage: { input_tokens: 800, cache_creation_input_tokens: 2500, output_tokens: 40 } } });

const M = require("../api/_munshi.js");
const PID = "shop12345", owner = { id: "u1" };
const ctx = (u = owner) => ({ ip: "1.1.1.1", user: async () => u });
const DAY = 864e5, IST = 5.5 * 36e5, day0 = t => t - ((t + IST) % DAY);
function reset(o = {}) {
  kv.clear(); zs.clear(); hs.clear(); sent.length = 0; queue = [];
  process.env.ANTHROPIC_API_KEY = "test-key"; delete process.env.MUNSHI_GEMINI_KEY; delete process.env.MUNSHI_DAILY;
  kv.set("customer-memory:" + PID, JSON.stringify({ kind: "biz", owner: "u1", paid: true, proUntil: o.pro === false ? 0 : Date.now() + 30 * DAY,
    data: { t: "Sharma Kirana", cat: "Kirana store", ord: true, menu: [{ n: "Staples", items: [{ n: "Basmati Rice 5kg", p: "650", k: 12 }, { n: "Toor Dal 1kg", p: "160", so: true }] }] } }));
}
let n = 0;
function order(at, tot, x = {}) { const ref = "ABCD" + "EFGHJKMNPQRSTUVWXYZ"[n++ % 19]; kv.set("bzo:" + PID + ":" + ref, JSON.stringify({ ref, at, tot, items: [{ n: x.item || "Basmati Rice 5kg", q: 1, p: tot }], name: x.name || "Riya", phone: "9829012345", mode: "pickup", st: x.st || "done", ...(x.offline ? { offline: true, pay: "cash" } : {}) })); cmd("ZADD", "bzoz:" + PID, at, ref); return ref; }
function bill(at, total, x = {}) { const t = "tok" + (n++); kv.set("bl:" + t, JSON.stringify({ t, at, kind: x.kind || "cash", calc: { total, lines: [{ n: x.item || "Toor Dal 1kg", q: 2, amt: total }] }, pay: { mode: "upi" }, cust: {}, ...(x.cancel ? { cancel: { at } } : {}) })); cmd("ZADD", "blz:" + PID, at, t); }
const ask = (q, u) => M.handle({ action: "mu-ask", id: PID, q }, ctx(u));

test("language is picked from how the owner writes", () => {
  assert.equal(M.langOf("aaj kitni sale hui?"), "hl");
  assert.equal(M.langOf("आज की बिक्री?"), "hi");
  assert.equal(M.langOf("How much did I sell this week?"), "en");
});

test("periods follow India time: last month ends where this month starts", () => {
  const now = Date.UTC(2026, 10, 5, 6, 0); // 5 Nov 2026, 11:30 India time
  const lm = M.period({ period: "last_month" }, now), tm = M.period({ period: "this_month" }, now);
  assert.equal(lm.from, "2026-10-01"); assert.equal(lm.to, "2026-10-31"); assert.equal(lm.t1, tm.t0);
  assert.equal(M.period({ period: "this_week" }, now).from, "2026-11-02"); // Monday
  assert.ok(M.period({ period: "custom", from: "2026-11-05", to: "2026-11-01" }, now).error);
});

test("only the owner can use Munshi, and asking needs Pro", async () => {
  reset();
  assert.equal((await M.handle({ action: "mu-hello", id: PID }, ctx(null))).status, 401);
  assert.equal((await M.handle({ action: "mu-hello", id: PID }, ctx({ id: "someone" }))).status, 401);
  reset({ pro: false });
  const h = await M.handle({ action: "mu-hello", id: PID }, ctx());
  assert.equal(h.ok, true); assert.equal(h.pro, false); assert.ok(h.brief.length >= 2); // the brief is free for every shop
  assert.equal((await ask("aaj ki sale?")).status, 402);
  assert.equal(sent.length, 0);
});

test("with no AI key Munshi says it's off and calls nothing", async () => {
  reset(); delete process.env.ANTHROPIC_API_KEY;
  const h = await M.handle({ action: "mu-hello", id: PID }, ctx());
  assert.equal(h.on, false);
  const r = await ask("aaj ki sale?"); assert.equal(r.status, 501); assert.equal(r.off, true); assert.equal(sent.length, 0);
});

test("the morning brief adds page orders, shop sales and bills, less returns and cancelled ones", async () => {
  reset();
  const y = day0(Date.now()) - DAY + 3600e3;
  order(y, 500); order(y + 60e3, 300, { offline: true }); bill(y + 120e3, 200); bill(y + 180e3, 100, { kind: "credit" }); bill(y + 240e3, 999, { cancel: true });
  order(y + 300e3, 700, { st: "cancel" });
  order(Date.now() - 60e3, 250, { st: "new" });
  const h = await M.handle({ action: "mu-hello", id: PID, lang: "en" }, ctx());
  assert.match(h.brief.join(" "), /Yesterday: ₹900 from 3 sales/);
  assert.match(h.brief.join(" "), /1 order is waiting/);
  assert.equal(h.chips.length, 5);
});

test("a question runs the sales tool and the answer uses its numbers", async () => {
  reset();
  const t = day0(Date.now()) + 60e3; order(t, 420); bill(t + 1000, 180);
  if (Date.now() - day0(Date.now()) < 2000) return; // just after midnight: today's sales would be in the future
  queue = [claudeTool("get_sales", { period: "today" }), claudeText("Aaj ₹600 ki sale hui, 2 bikri.")];
  const r = await ask("aaj kitni sale hui?");
  assert.equal(r.ok, true); assert.equal(r.reply, "Aaj ₹600 ki sale hui, 2 bikri.");
  const res = sent[1].body.messages.at(-1).content[0];
  assert.equal(res.type, "tool_result"); const data = JSON.parse(res.content);
  assert.equal(data.total, 600); assert.equal(data.sales_count, 2); assert.equal(data.by_payment.upi, 180);
  assert.equal(r.cards[0].k, "num"); assert.equal(r.cards[0].v, 600);
  assert.ok(sent[0].body.system[0].text.includes("Sharma Kirana")); assert.ok(sent[0].body.system[0].text.includes("Hinglish"));
  // usage is logged for HQ
  const u = await M.usage(); assert.equal(u.questions, 1); assert.equal(u.tokens_out, 100); assert.ok(u.rupees >= 0);
  // the next question carries the conversation
  queue = [claudeText("Theek hai.")]; await ask("theek hai");
  assert.equal(sent[2].body.messages[0].content, "aaj kitni sale hui?"); assert.equal(sent[2].body.messages[1].role, "assistant");
});

test("an udhaar reminder waits for Haan, then gives a WhatsApp link", async () => {
  reset();
  const K = require("../api/_khata.js");
  await K.handle({ action: "kh-own-add", id: PID, phone: "9876543210", name: "Ramesh Kumar", amount: 500, kind: "give" }, ctx());
  queue = [claudeTool("send_udhaar_reminder", { customer: "ramesh" })];
  const r = await ask("Ramesh ko udhaar yaad dilao");
  assert.equal(r.ok, true); assert.ok(r.confirm.pid); assert.match(r.confirm.text, /Ramesh Kumar \(9876543210\).*₹500/);
  assert.equal((await fake.getj("kh:" + PID + ":9876543210")).nr || 0, 0); // nothing sent yet
  const no = await M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: false }, ctx());
  assert.equal(no.reply, "Theek hai, nahi kiya.");
  assert.equal((await M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: true }, ctx())).status, 410); // used up
  queue = [claudeTool("send_udhaar_reminder", { customer: "9876543210" })];
  const r2 = await ask("Ramesh ko reminder bhejo");
  const yes = await M.handle({ action: "mu-do", id: PID, pid: r2.confirm.pid, yes: true }, ctx());
  assert.match(yes.link.u, /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.equal((await fake.getj("kh:" + PID + ":9876543210")).nr, 1);
  // someone else can't use the owner's pending action
  queue = [claudeTool("send_udhaar_reminder", { customer: "Ramesh Kumar" })];
  const r3 = await ask("reminder bhejo");
  assert.equal((await M.handle({ action: "mu-do", id: PID, pid: r3.confirm.pid, yes: true }, ctx({ id: "x" }))).status, 401);
});

test("udhaar entries: unknown names are sent back to the AI, a new number works after Haan", async () => {
  reset();
  queue = [claudeTool("add_udhaar_entry", { customer: "Suresh", amount: 300, kind: "give" }), claudeText("Suresh ka number batao.")];
  const r = await ask("Suresh ko 300 udhaar likho");
  assert.equal(r.confirm, undefined); assert.equal(r.reply, "Suresh ka number batao.");
  assert.match(JSON.parse(sent[1].body.messages.at(-1).content[0].content).error, /mobile number/);
  queue = [claudeTool("add_udhaar_entry", { customer: "9812345678", name: "Suresh", amount: 300, kind: "give", note: "atta" })];
  const r2 = await ask("9812345678 Suresh 300 udhaar");
  assert.match(r2.confirm.text, /Suresh \(9812345678\) ke khate mein ₹300 udhaar likhun\? Note: atta/);
  const yes = await M.handle({ action: "mu-do", id: PID, pid: r2.confirm.pid, yes: true }, ctx());
  assert.match(yes.reply, /₹300 baaki/);
  const c = await fake.getj("kh:" + PID + ":9812345678"); assert.equal(c.e[0].a, 300); assert.equal(c.e[0].note, "atta");
});

test("over the credit limit, Munshi asks a second time before writing", async () => {
  reset();
  const K = require("../api/_khata.js");
  await K.handle({ action: "kh-own-add", id: PID, phone: "9876543210", name: "Ramesh", amount: 900, kind: "give" }, ctx());
  await K.handle({ action: "kh-own-limit", id: PID, phone: "9876543210", lim: 1000 }, ctx());
  queue = [claudeTool("add_udhaar_entry", { customer: "Ramesh", amount: 500, kind: "give" })];
  const r = await ask("Ramesh 500 udhaar");
  const w = await M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: true }, ctx());
  assert.ok(w.confirm); assert.match(w.reply, /above the limit/);
  assert.equal((await fake.getj("kh:" + PID + ":9876543210")).e.length, 1);
  await M.handle({ action: "mu-do", id: PID, pid: w.confirm.pid, yes: true }, ctx());
  assert.equal((await fake.getj("kh:" + PID + ":9876543210")).e.length, 2);
});

test("order status changes only after Haan", async () => {
  reset();
  const ref = order(Date.now() - 5 * 60e3, 420, { st: "new", name: "Anita" });
  queue = [claudeTool("set_order_status", { ref, status: "ready" })];
  const r = await ask("Anita ka order ready karo");
  assert.match(r.confirm.text, new RegExp(ref + " \\(Anita, ₹420\\)"));
  assert.equal((await fake.getj("bzo:" + PID + ":" + ref)).st, "new");
  await M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: true }, ctx());
  assert.equal((await fake.getj("bzo:" + PID + ":" + ref)).st, "ready");
});

test("daily limit per shop, and a failed AI call doesn't use up a question", async () => {
  reset(); process.env.MUNSHI_DAILY = "2";
  queue = [{ status: 529, json: { error: { message: "overloaded" } } }];
  assert.equal((await ask("aaj ki sale?")).status, 502);
  queue = [claudeText("ok"), claudeText("ok")];
  assert.equal((await ask("1")).left, 1); assert.equal((await ask("2")).left, 0);
  const r = await ask("3"); assert.equal(r.status, 429); assert.equal(sent.length, 3);
});

test("Gemini works the same way, with its own paid key", async () => {
  reset(); delete process.env.ANTHROPIC_API_KEY; process.env.GEMINI_API_KEY = "free-scanner-key";
  assert.equal((await M.handle({ action: "mu-hello", id: PID }, ctx())).on, false); // never the scanner's free key
  process.env.MUNSHI_GEMINI_KEY = "paid-key";
  queue = [{ json: { candidates: [{ content: { parts: [{ functionCall: { name: "find_menu_items", args: { query: "dal" } }, thoughtSignature: "sig" }] } }], usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: 20 } } },
    { json: { candidates: [{ content: { parts: [{ text: "Toor Dal sold out hai." }] } }], usageMetadata: { promptTokenCount: 3100, candidatesTokenCount: 15 } } }];
  const r = await ask("dal hai kya?");
  assert.equal(r.reply, "Toor Dal sold out hai.");
  assert.match(sent[0].url, /gemini-2\.5-flash-lite:generateContent$/); assert.equal(sent[0].body.generationConfig.thinkingConfig.thinkingBudget, 0);
  const c = sent[1].body.contents; assert.equal(c.at(-2).parts[0].thoughtSignature, "sig");
  const res = c.at(-1).parts[0].functionResponse; assert.equal(res.name, "find_menu_items"); assert.equal(res.response.result.items[0].sold_out, true);
  delete process.env.GEMINI_API_KEY;
});

test("the AI gets at most 5 rounds, the last one without tools", async () => {
  reset();
  queue = [0, 1, 2, 3].map(() => claudeTool("get_udhaar", {})).concat([claudeText("Udhaar ₹0.")]);
  const r = await ask("udhaar?");
  assert.equal(r.reply, "Udhaar ₹0."); assert.equal(sent.length, 5); assert.deepEqual(sent[4].body.tool_choice, { type: "none" });
});

// ---------- shop skills: products, categories, stock, bills, profit ----------
const G = require("../assets/gst.v2.js"), B = require("../api/_bill.js");
const SELLER = [..."0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(c => "08AAPFU0939F1Z" + c).find(G.gstinOk);
const pageData = () => JSON.parse(kv.get("customer-memory:" + PID)).data;
const yes = async r => M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: true }, ctx());

test("the clock goes in the message, not the instructions, and spoken amounts are passed as numbers", async () => {
  reset();
  queue = [claudeText("ok"), claudeText("ok")];
  await ask("Ramesh ko dhai sau udhaar likho");
  await ask("saadhe teen hazaar ka bill");
  assert.equal(sent[0].body.system[0].text, sent[1].body.system[0].text);
  assert.ok(!/India time\]/.test(sent[0].body.system[0].text));
  assert.match(sent[0].body.messages.at(-1).content, /^\[\w{3} \d{4}-\d\d-\d\d \d\d:\d\d India time; reply in Hinglish; numbers heard: 250\]\nRamesh ko dhai sau udhaar likho$/);
  assert.match(sent[1].body.messages.at(-1).content, /numbers heard: 3500\]/);
  assert.equal(sent[0].body.tools[0].input_schema.additionalProperties, false);
});

test("add a product: an existing category is reused, a new one is made only when asked, the page updates live", async () => {
  reset();
  queue = [claudeTool("add_product", { name: "Sona Masoori Rice 10kg", price: 590, category: "staples", stock: 6 })];
  const r = await ask("Sona masoori 10 kilo 590 ka add karo");
  assert.match(r.confirm.text, /"Sona Masoori Rice 10kg" ₹590 menu mein jodun\? Category: Staples · stock 6/);
  assert.equal(r.mood, "confirm");
  const d = await yes(r);
  assert.equal(d.mood, "order"); assert.equal(d.go.reload, true); assert.equal(d.go.hi, "Sona Masoori Rice 10kg");
  assert.deepEqual(pageData().menu[0].items.at(-1), { n: "Sona Masoori Rice 10kg", p: "590", k: 6 });
  queue = [claudeTool("add_product", { name: "Surf Excel 1kg", price: 140, category: "Home care" })];
  const r2 = await ask("surf excel 140 ka jodo");
  assert.match(r2.confirm.text, /Category: Home care \(nayi\)/);
  await yes(r2);
  assert.equal(pageData().menu[1].n, "Home care");
  // the same item again is refused and sent back to the AI
  queue = [claudeTool("add_product", { name: "basmati rice 5kg", price: 600, category: "Staples" }), claudeText("Ye pehle se hai.")];
  const r3 = await ask("basmati add karo");
  assert.equal(r3.confirm, undefined); assert.match(JSON.parse(sent.at(-1).body.messages.at(-1).content[0].content).error, /already on the menu at ₹650/);
});

test("update stock, price and category; ambiguous names are asked back", async () => {
  reset();
  queue = [claudeTool("update_product", { name: "basmati", add_stock: 20, price: 675 })];
  const r = await ask("basmati 20 aur aaye, rate 675");
  assert.match(r.confirm.text, /price ₹650 → ₹675, stock 12 → 32/);
  await yes(r);
  const it = pageData().menu[0].items[0]; assert.equal(it.p, "675"); assert.equal(it.k, 32);
  queue = [claudeTool("update_product", { name: "Toor Dal 1kg", stock: 15, category: "Dal" })];
  const r2 = await ask("toor dal 15 aa gayi, dal category mein daalo");
  assert.match(r2.confirm.text, /stock not tracked → 15, back in stock, category Staples → Dal \(new\)/);
  await yes(r2);
  const m = pageData().menu; assert.equal(m[1].n, "Dal"); assert.equal(m[1].items[0].so, false); assert.equal(m[0].items.length, 1);
  queue = [claudeTool("remove_product", { name: "rice" }), claudeText("Kaunsa?")];
  const m2 = JSON.parse(kv.get("customer-memory:" + PID)); m2.data.menu[0].items.push({ n: "Brown Rice 1kg", p: "120" }); kv.set("customer-memory:" + PID, JSON.stringify(m2));
  await ask("rice hata do");
  assert.match(JSON.parse(sent.at(-1).body.messages.at(-1).content[0].content).error, /More than one item matches/);
});

test("stock and profit tools", async () => {
  reset();
  queue = [claudeTool("get_stock", { filter: "low", below: 5 }), claudeText("Toor dal khatam.")];
  const r = await ask("kya khatam ho raha hai?");
  assert.equal(r.mood, "lowstock"); assert.equal(r.cards[0].r[0][0], "Toor Dal 1kg");
  await require("../api/_cost.js").handle({ action: "cs-set", id: PID, items: [{ n: "Basmati Rice 5kg", c: 600 }] }, ctx());
  order(Date.now() - 60e3, 650, { item: "Basmati Rice 5kg", offline: true });
  queue = [claudeTool("get_profit", { period: "today" }), claudeText("Aaj ₹50 profit.")];
  const p = await ask("aaj kitna profit hua?");
  assert.equal(p.mood, "profit"); assert.equal(p.cards[0].v, 50);
});

test("GST bill from speech: menu price and remembered HSN, udhaar bill goes to the khata", async () => {
  reset();
  queue = [claudeTool("create_bill", { items: [{ name: "basmati", qty: 2 }], paid_by: "upi" })];
  assert.match(JSON.stringify(await ask("bill banao")), /Bills aren't set up yet/.source ? /./ : /x/);
  await B.handle({ action: "bl-settings", id: PID, settings: { gst: "regular", gstin: SELLER, legal: "Sharma Kirana", prefix: "SK", inc: true, rate: 5, hsn: "1006" } }, ctx());
  queue = [claudeTool("create_bill", { items: [{ name: "बासमती", qty: 2 }, { name: "Ghee 1L", qty: 1, price: 620 }], customer_name: "Anita", customer_phone: "9829033333", paid_by: "due" })];
  const r = await ask("Anita ke liye 2 basmati aur ek ghee 620 ka, udhaar mein");
  assert.match(r.confirm.text, /Anita ka bill banaun\? 2× Basmati Rice 5kg, 1× Ghee 1L\. Total ₹1,920 · Udhaar/);
  assert.equal(r.cards.at(-1).r.at(-1)[2], "₹1,920");
  const d = await yes(r);
  assert.equal(d.mood, "bill"); assert.match(d.link.u, /^\/bill\/\w+/); assert.match(d.reply, /Bill SK\/\d\d-\d\d\/0001 ban gaya: ₹1,920\. Udhaar mein likh diya, ab ₹1,920 baaki\./);
  assert.equal((await fake.getj("kh:" + PID + ":9829033333")).e[0].a, 1920);
  // a second tap on Haan does nothing
  assert.equal((await M.handle({ action: "mu-do", id: PID, pid: r.confirm.pid, yes: true }, ctx())).status, 410);
});

test("udhaar names in Devanagari find the customer", async () => {
  reset();
  await require("../api/_khata.js").handle({ action: "kh-own-add", id: PID, phone: "9876543210", name: "Ramesh Kumar", amount: 500, kind: "give" }, ctx());
  queue = [claudeTool("send_udhaar_reminder", { customer: "रमेश" })];
  const r = await ask("रमेश को याद दिलाओ");
  assert.match(r.confirm.text, /Ramesh Kumar \(9876543210\)/);
});
