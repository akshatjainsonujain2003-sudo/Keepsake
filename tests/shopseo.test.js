// Run: node --test tests/*.test.js
// Shops on Google: the shop page sent to search engines, the shop sitemap, IndexNow pings, HQ scan totals.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": if (a.includes("NX") && kv.has(a[0])) return null; kv.set(a[0], a[1]); return "OK";
    case "MGET": return a.map(k => kv.has(k) ? kv.get(k) : null);
    case "SCAN": return ["0", [...kv.keys()].filter(k => new RegExp("^" + a[2].replace(/\*/g, ".*") + "$").test(k))];
    default: throw new Error("unmocked " + c);
  }
};
const fake = { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) };
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: fake };
process.chdir(path.resolve(__dirname, ".."));
const S = require("../api/_shopseo.js");
const shop = (o = {}) => ({ kind: "biz", owner: "u1", paid: true, updated: Date.UTC(2026, 9, 28), ...o,
  data: { biz: 1, t: "Brew & Bloom", cat: "cafe", area: "C-Scheme", addr: "12 Ashok Marg, C-Scheme, Jaipur", phone: "9876543210", tag: "Specialty coffee and fresh bakes",
    hours: { d: [["08:00", "22:00", false], ["08:00", "22:00", false], ["08:00", "22:00", false], ["08:00", "22:00", false], ["08:00", "23:00", false], ["09:00", "23:00", false], ["", "", true]] },
    menu: [{ n: "Coffee", items: [{ n: "Cappuccino", p: "190" }, { n: "Cold Brew <b>", p: "220", d: "18-hour steep" }, { n: "Latte", p: "210" }] }], cover: "/api/img?id=abc", ig: "@brewbloom", ...(o.data || {}) } });

test("a live shop page arrives with its own title, description, local business data and readable copy", () => {
  const r = S.page(shop(), "shop12345");
  assert.equal(r.status, 200);
  assert.match(r.html, /<title>Brew &amp; Bloom · Café in C-Scheme, Jaipur<\/title>/);
  assert.match(r.html, /<link rel="canonical" href="https:\/\/getkeepsake.in\/b\/shop12345">/);
  assert.match(r.html, /content="index,follow/);
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(r.html)[1]);
  assert.equal(ld["@type"], "CafeOrCoffeeShop"); assert.equal(ld.telephone, "+919876543210"); assert.equal(ld.address.addressLocality, "Jaipur");
  assert.equal(ld.openingHoursSpecification.length, 6); assert.equal(ld.openingHoursSpecification[0].dayOfWeek, "Monday");
  assert.equal(ld.hasMenu.hasMenuSection[0].hasMenuItem[1].offers.price, "220"); assert.equal(ld.image[0], "https://getkeepsake.in/api/img?id=abc");
  assert.match(r.html, /<h1>Brew &amp; Bloom<\/h1>/); assert.match(r.html, /Cold Brew &lt;b&gt; · ₹220/); assert.match(r.html, /Sunday: Closed/);
  assert.ok(!/<b>"/.test(r.html));
});

test("drafts, locked, hidden and empty pages are not indexed; drafts show nothing", () => {
  const draft = S.page(shop({ paid: false }), "shop12345");
  assert.match(draft.html, /noindex,follow/); assert.match(draft.html, /<main id="biz" aria-live="polite"><\/main>/); assert.ok(!/ld\+json/.test(draft.html));
  assert.equal(S.readiness(shop({ lock: { hash: "x" } })).ok, false);
  assert.equal(S.readiness(shop({ data: { noidx: true } })).why, "hidden by the owner");
  assert.equal(S.readiness(shop({ data: { menu: [], addr: "" } })).ok, false);
  assert.equal(S.page(null, "nosuchid1").status, 404);
});

test("shops (not cafés) list their products as offers; stores get their own type", () => {
  const v = S.view(shop({ data: { cat: "hardware", menu: [{ n: "Electricals", items: [{ n: "LED bulb", p: "90" }, { n: "Wire", p: "1450", so: true }, { n: "Switch", p: "320" }] }] } }), "shop12345");
  assert.equal(v.ld["@type"], "HardwareStore"); assert.equal(v.ld.makesOffer.length, 3); assert.equal(v.ld.makesOffer[1].availability, "https://schema.org/OutOfStock");
});

test("sitemap lists only live, ready shop pages (cached)", async () => {
  kv.clear();
  kv.set("customer-memory:shopaaaa1", JSON.stringify(shop()));
  kv.set("customer-memory:shopbbbb2", JSON.stringify(shop({ paid: false })));
  kv.set("customer-memory:shopcccc3", JSON.stringify(shop({ data: { noidx: true } })));
  kv.set("customer-memory:memdddd04", JSON.stringify({ kind: "card", data: {} }));
  const a = await S.sitemapShops(); assert.deepEqual(a.map(x => x.id), ["shopaaaa1"]);
  kv.set("customer-memory:shopeeee5", JSON.stringify(shop()));
  assert.equal((await S.sitemapShops()).length, 1); // cached for an hour
});

test("IndexNow ping: once an hour per live page, never for drafts", async () => {
  kv.clear(); const sent = [];
  global.fetch = async (u, o) => { sent.push(JSON.parse(o.body)); return { ok: true, status: 200 }; };
  assert.equal(await S.ping("shopaaaa1", shop()), true);
  assert.equal(await S.ping("shopaaaa1", shop()), false);
  assert.equal(await S.ping("shopbbbb2", shop({ paid: false })), false);
  assert.equal(sent.length, 1); assert.deepEqual(sent[0].urlList, ["https://getkeepsake.in/b/shopaaaa1"]); assert.equal(sent[0].key, S.INDEXNOW_KEY);
  global.fetch = async () => { throw new Error("offline"); };
  assert.equal(await S.ping("shopffff6", shop()), false); // a failure never throws
  delete global.fetch;
});
