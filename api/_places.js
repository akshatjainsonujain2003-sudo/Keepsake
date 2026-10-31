// Page builder from Google Maps: type a shop's name and area, get a private preview of its GetKeepsake page in seconds.
// Used by HQ (admin key) and field agents (sales code + token) to show an owner their own shop before they pay.
// Not a route: api/admin.js (hq-pb-*) and api/qr.js (sp-pb-*, pv-get) call it.
//   pv:<token> = { d: page data (KSBiz overrides), name, place, by: sales code or "hq", at }  kept 30 days, then gone
// Google Places data is only kept in the private preview (30 days, as Google's terms allow). The owner checks
// every detail in the studio before anything goes live. The Maps key lives in Vercel (GOOGLE_MAPS_API_KEY).
const crypto = require("crypto");
const db = require("./_db");

const KEY = () => String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
const TOK = /^[a-z0-9]{10,16}$/, PLACE = /^[A-Za-z0-9_-]{10,300}$/;
const TTL = 30 * 86400;
const E = (status, error) => ({ status, error });
const clip = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
async function limit(k, max, secs) { const n = await db.cmd("INCR", k); if (n === 1) await db.cmd("EXPIRE", k, secs); return n > max; }

// Google place type -> our business type and the sample menu group shown in the preview.
const TYPE = [
  [/coffee_shop|^cafe$|cafeteria|tea_house/, "cafe"], [/bakery/, "bakery"], [/ice_cream/, "icecream"], [/juice/, "juice"],
  [/confectionery|dessert|candy|sweet/, "sweets"], [/fast_food|sandwich|pizza|hamburger|meal_takeaway/, "fastfood"], [/restaurant|meal_delivery|food_court|dhaba/, "restaurant"],
  [/jewel/, "jewellery"], [/shoe/, "footwear"], [/gift_shop/, "gifts"], [/florist/, "florist"], [/clothing|boutique|fashion|tailor/, "boutique"],
  [/barber/, "barber"], [/spa|massage/, "spa"], [/skin_care/, "skincare"], [/beauty|hair|nail|salon/, "salon"],
  [/gym|fitness/, "gym"], [/yoga/, "yoga"], [/dance/, "dance"], [/tattoo/, "tattoo"], [/photograph/, "photo"], [/pet|veterinar/, "pets"], [/lodging|hotel|guest_house|hostel|motel/, "hotel"],
  [/dentist|dental/, "dentist"], [/pharmacy|drugstore|chemist/, "pharmacy"], [/optician|eye/, "optician"], [/laboratory|diagnostic/, "lab"],
  [/doctor|hospital|clinic|physiotherap|medical|health/, "clinic"], [/school|tutor|coaching|education|training/, "coaching"],
  [/electronics|cell_phone|mobile|repair/, "repair"], [/hardware|home_improvement|electrical/, "hardware"],
  [/grocery|supermarket|convenience|market|kirana/, "grocery"], [/real_estate/, "realestate"], [/accounting|lawyer|insurance|consultant/, "pro"],
  [/store|shop/, "store"]
];
const GROUP = { cafe: "food", bakery: "food", icecream: "food", juice: "food", sweets: "food", fastfood: "food", restaurant: "food", jewellery: "fashion", footwear: "fashion", gifts: "fashion", florist: "fashion", boutique: "fashion",
  barber: "beauty", spa: "beauty", skincare: "beauty", salon: "beauty", gym: "services", yoga: "services", dance: "services", tattoo: "services", photo: "services", pets: "services", hotel: "services", coaching: "services", repair: "services", pro: "services",
  dentist: "health", pharmacy: "health", optician: "health", lab: "health", clinic: "health", hardware: "stores", grocery: "stores", store: "stores", realestate: "realty", other: "stores" };
const it = (n, p, b, d) => ({ n, p, d: d || "", b: !!b, i: "" });
const SAMPLE = {
  food: { cover: "cafe-cover", menu: [{ n: "Bestsellers", items: [it("Special Thali", "220", 1, "Dal, sabzi, rice, 3 rotis"), it("Masala Dosa", "140"), it("Paneer Tikka", "260")] }, { n: "Drinks", items: [it("Cold Coffee", "120"), it("Masala Chai", "30")] }] },
  fashion: { cover: "bq-store1", menu: [{ n: "New in", items: [it("Cotton Kurta Set", "1,499", 1), it("Linen Shirt", "999"), it("Silk Dupatta", "799")] }, { n: "Accessories", items: [it("Canvas Tote", "699"), it("Jhumka Earrings", "450")] }] },
  beauty: { cover: "salon-cover", menu: [{ n: "Hair", items: [it("Haircut & Styling", "600", 1), it("Hair Spa", "1,200"), it("Global Colour", "2,500")] }, { n: "Skin", items: [it("Clean-up Facial", "900"), it("Bridal Makeup", "15,000")] }] },
  services: { cover: "gym-cover", menu: [{ n: "Plans", items: [it("1 month", "1,500", 1), it("3 months", "4,000")] }, { n: "Extras", items: [it("Personal session", "500")] }] },
  health: { cover: "clinic-cover", menu: [{ n: "Consultations", items: [it("Consultation", "500"), it("Follow-up within 7 days", "Free")] }, { n: "Tests", items: [it("Full body checkup", "999", 1)] }] },
  stores: { cover: "kirana-cover", menu: [{ n: "Daily needs", items: [it("Atta · 10 kg", "420", 1), it("Toor Dal · 1 kg", "160"), it("Mustard Oil · 1 L", "190")] }, { n: "Home", items: [it("Detergent · 1 kg", "180")] }] },
  realty: { cover: "re-cover", menu: [{ n: "For sale", items: [Object.assign(it("3 BHK Flat", "85 Lakh", 1, "1,450 sq ft · 2 parking"), { s: "sale" }), Object.assign(it("Residential Plot", "45 Lakh", 0, "200 sq yd · JDA approved"), { s: "sale" })] }] }
};
function catOf(types) {
  const all = (types || []).join(" ").toLowerCase();
  for (const [re, c] of TYPE) if (re.test(all)) return c;
  return "other";
}
// Google opening hours -> our week (Mon..Sun), each [open, close, closed]
function hoursOf(oh) {
  const P = oh && Array.isArray(oh.periods) ? oh.periods : null; if (!P || !P.length) return null;
  const hm = x => String(x.hour || 0).padStart(2, "0") + ":" + String(x.minute || 0).padStart(2, "0");
  const d = Array.from({ length: 7 }, () => ["", "", true]);
  for (const p of P) {
    if (!p.open) continue; const g = ((p.open.day || 0) + 6) % 7; // Google: 0 = Sunday; ours: 0 = Monday
    if (!p.close) { d[g] = ["00:00", "23:59", false]; continue; }
    if (d[g][2]) d[g] = [hm(p.open), hm(p.close), false]; else d[g][1] = hm(p.close); // two shifts in a day: keep the first open, last close
  }
  return { d };
}
const ph10 = p => { const x = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^\d{10}$/.test(x) ? x : ""; };
function areaOf(pl) {
  const c = pl.addressComponents || [], pick = t => (c.find(x => (x.types || []).includes(t)) || {}).longText || "";
  const a = pick("sublocality_level_1") || pick("sublocality") || pick("neighborhood"), city = pick("locality");
  return clip([a, city].filter(Boolean).join(", "), 60);
}
// The page data (overrides on top of KSBiz.blank(cat)).
function pageOf(pl) {
  const cat = catOf([pl.primaryType, ...(pl.types || [])]), grp = GROUP[cat] || "stores", s = SAMPLE[grp];
  const name = clip(pl.displayName && pl.displayName.text, 60), area = areaOf(pl), phone = ph10(pl.nationalPhoneNumber || pl.internationalPhoneNumber);
  const d = { cat, t: name, area, addr: clip(pl.formattedAddress, 200), phone, wa: /^[6-9]/.test(phone) ? phone : "",
    maps: pl.googleMapsUri || "", review: pl.id ? "https://search.google.com/local/writereview?placeid=" + encodeURIComponent(pl.id) : "",
    tag: clip(pl.editorialSummary && pl.editorialSummary.text, 140) || (area ? "Welcome to " + name + ", " + area.split(",")[0] + "." : "Welcome to " + name + "."),
    cover: "/assets/demo/biz/" + s.cover + ".webp", menu: JSON.parse(JSON.stringify(s.menu)), sample: true };
  const h = hoursOf(pl.regularOpeningHours); if (h) d.hours = h;
  return d;
}

async function google(path, body, mask) {
  const k = KEY(); if (!k) return { error: "GOOGLE_MAPS_API_KEY isn't set in Vercel yet." };
  const r = await fetch("https://places.googleapis.com/v1/" + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": k, "X-Goog-FieldMask": mask }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("places", r.status, j && j.error && j.error.message); return { error: r.status === 403 ? "Google refused the Maps key. Check that Places API (New) is on for it." : "Google Maps didn't answer. Try again." }; }
  return j;
}
async function search(q) {
  q = clip(q, 120); if (q.length < 3) return E(400, "Type the shop name and area, like “Kanha Cafe Vaishali Nagar Jaipur”.");
  const j = await google("places:searchText", { textQuery: q, regionCode: "IN", languageCode: "en", maxResultCount: 8 }, "places.id,places.displayName,places.shortFormattedAddress,places.formattedAddress,places.primaryTypeDisplayName,places.businessStatus");
  if (j.error) return E(502, j.error);
  return { ok: true, results: (j.places || []).filter(p => p.businessStatus !== "CLOSED_PERMANENTLY").map(p => ({ id: p.id, name: clip(p.displayName && p.displayName.text, 80), addr: clip(p.shortFormattedAddress || p.formattedAddress, 120), kind: clip(p.primaryTypeDisplayName && p.primaryTypeDisplayName.text, 40) })) };
}
async function build(placeId, by) {
  if (!PLACE.test(String(placeId || ""))) return E(400, "Pick a shop from the list.");
  const pl = await google("places/" + encodeURIComponent(placeId), null, "id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,primaryType,types,googleMapsUri,editorialSummary");
  if (pl.error) return E(502, pl.error);
  const d = pageOf(pl), tok = crypto.randomBytes(8).toString("hex").slice(0, 12);
  await db.setj("pv:" + tok, { d, name: d.t, place: pl.id, by: String(by || "hq").slice(0, 20), at: Date.now() });
  await db.cmd("EXPIRE", "pv:" + tok, TTL);
  return { ok: true, tok, url: "https://getkeepsake.in/p/" + tok, data: d };
}
async function get(tok, ip) {
  if (!TOK.test(String(tok || ""))) return E(404, "This preview link isn't valid.");
  if (ip && await limit("pv-ip:" + ip, 120, 3600)) return E(429, "Too many requests. Please wait a little.");
  const p = await db.getj("pv:" + tok); if (!p) return E(404, "This preview has expired. Ask for a new one.");
  return { ok: true, data: p.d, sp: p.by !== "hq" ? p.by : "" };
}
// Rate limits: HQ 300 lookups a day, each field agent 60 (keeps the Google bill small).
async function guard(who, max) { const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); return await limit("pb:" + who + ":" + day, max, 2 * 86400); }
module.exports = { search, build, get, guard, catOf, hoursOf, pageOf };
