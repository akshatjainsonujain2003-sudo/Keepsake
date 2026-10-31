// Run: node --test tests/*.test.js
// Page builder from Google Maps: type mapping, opening hours, page data, private previews.
const test = require("node:test"), assert = require("node:assert/strict"), path = require("path");
const kv = new Map();
const cmd = async (c, ...a) => {
  switch (c) {
    case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
    case "SET": kv.set(a[0], a[1]); return "OK";
    case "INCR": { const n = (+kv.get(a[0]) || 0) + 1; kv.set(a[0], String(n)); return n; }
    case "EXPIRE": return 1;
    default: throw new Error("unmocked " + c);
  }
};
require.cache[path.resolve(__dirname, "../api/_db.js")] = { id: "db", filename: "db", loaded: true, exports: { ok: () => true, cmd, getj: async k => { const v = await cmd("GET", k); return v ? JSON.parse(v) : null; }, setj: (k, v) => cmd("SET", k, JSON.stringify(v)) } };
const P = require("../api/_places.js");
const place = { id: "ChIJabc123xyz456", displayName: { text: "Kanha Cafe <b>" }, primaryType: "coffee_shop", types: ["coffee_shop", "cafe", "food"],
  formattedAddress: "12, Amrapali Marg, Vaishali Nagar, Jaipur, Rajasthan 302021, India", nationalPhoneNumber: "098290 11111", googleMapsUri: "https://maps.google.com/?cid=1",
  addressComponents: [{ longText: "Vaishali Nagar", types: ["sublocality_level_1", "sublocality"] }, { longText: "Jaipur", types: ["locality"] }],
  regularOpeningHours: { periods: [1, 2, 3, 4, 5, 6].map(d => ({ open: { day: d, hour: 9, minute: 30 }, close: { day: d, hour: 22, minute: 0 } })) } };

test("Google place types map to our business types", () => {
  assert.equal(P.catOf(["coffee_shop"]), "cafe"); assert.equal(P.catOf(["beauty_salon"]), "salon"); assert.equal(P.catOf(["barber_shop"]), "barber");
  assert.equal(P.catOf(["jewelry_store", "store"]), "jewellery"); assert.equal(P.catOf(["dentist"]), "dentist"); assert.equal(P.catOf(["grocery_store"]), "grocery");
  assert.equal(P.catOf(["real_estate_agency"]), "realestate"); assert.equal(P.catOf(["cell_phone_store"]), "repair"); assert.equal(P.catOf(["point_of_interest"]), "other");
});

test("opening hours: Google's Sunday-first week becomes Mon..Sun, closed days stay closed", () => {
  const h = P.hoursOf(place.regularOpeningHours);
  assert.deepEqual(h.d[0], ["09:30", "22:00", false]); assert.deepEqual(h.d[5], ["09:30", "22:00", false]); assert.deepEqual(h.d[6], ["", "", true]);
  assert.deepEqual(P.hoursOf({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }).d[6], ["00:00", "23:59", false]);
  assert.equal(P.hoursOf(null), null);
});

test("page data: name, area, phone, WhatsApp, review link and sample menu", () => {
  const d = P.pageOf(place);
  assert.equal(d.t, "Kanha Cafe b"); assert.equal(d.cat, "cafe"); assert.equal(d.area, "Vaishali Nagar, Jaipur");
  assert.equal(d.phone, "9829011111"); assert.equal(d.wa, "9829011111");
  assert.equal(d.review, "https://search.google.com/local/writereview?placeid=ChIJabc123xyz456");
  assert.ok(d.menu.length && d.sample && /cafe-cover/.test(d.cover));
  assert.equal(P.pageOf({ ...place, nationalPhoneNumber: "0141 222 3344" }).wa, ""); // landline: no WhatsApp
});

test("build makes a private preview that anyone with the link can open; bad links are refused", async () => {
  kv.clear(); process.env.GOOGLE_MAPS_API_KEY = "test-key"; const calls = [];
  global.fetch = async (u, o) => { calls.push([u, o]); return { ok: true, status: 200, json: async () => /searchText/.test(u) ? { places: [{ id: place.id, displayName: { text: "Kanha Cafe" }, shortFormattedAddress: "Vaishali Nagar, Jaipur", primaryTypeDisplayName: { text: "Coffee shop" } }, { id: "ChIJclosed000000", businessStatus: "CLOSED_PERMANENTLY", displayName: { text: "Old" } }] } : place }; };
  const s = await P.search("Kanha Cafe Vaishali Nagar");
  assert.equal(s.results.length, 1); assert.equal(s.results[0].kind, "Coffee shop"); assert.equal(calls[0][1].headers["X-Goog-Api-Key"], "test-key");
  const b = await P.build(place.id, "RAHUL1");
  assert.match(b.url, /^https:\/\/getkeepsake\.in\/p\/[a-z0-9]{12}$/);
  const g = await P.get(b.tok, "1.1.1.1"); assert.equal(g.data.t, "Kanha Cafe b"); assert.equal(g.sp, "RAHUL1");
  assert.equal((await P.get("nope", "1.1.1.1")).status, 404); assert.equal((await P.get("aaaaaaaaaaaa", "1.1.1.1")).status, 404);
  assert.equal((await P.build("x", "hq")).status, 400); assert.equal((await P.search("ab")).status, 400);
  delete process.env.GOOGLE_MAPS_API_KEY; assert.equal((await P.search("Kanha Cafe")).status, 502);
  delete global.fetch;
});

test("quick build without Google: typed name, type, area and phone", async () => {
  kv.clear();
  const r = await P.quick({ name: "Kanha Sweets", cat: "sweets", area: "Vaishali Nagar, Jaipur", phone: "+91 98290 11111" }, "RAHUL1");
  assert.equal(r.data.t, "Kanha Sweets"); assert.equal(r.data.cat, "sweets"); assert.equal(r.data.wa, "9829011111"); assert.ok(r.data.menu.length);
  assert.equal((await P.get(r.tok)).sp, "RAHUL1");
  assert.equal((await P.quick({ name: "X" }, "hq")).status, 400);
  assert.equal((await P.quick({ name: "Shop", phone: "123" }, "hq")).status, 400);
  assert.equal((await P.quick({ name: "Shop", cat: "<script>" }, "hq")).data.cat, "other");
});
