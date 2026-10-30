// Shops on Google: what search engines and AI assistants get when they open a shop page (/b/<id>).
// The page arrives with the shop's real title, description, local business data and a readable copy of the page
// (name, area, address, hours, menu with prices). The usual page then draws over it in the browser, so people see
// exactly the same page as before. Also: which shop pages go in the sitemap, and IndexNow pings to Bing and others.
// Not a route: api/seo.js uses it; api/customer-memories.js and api/_pay.js call ping().
const db = require("./_db");
const BASE = "https://getkeepsake.in";
// IndexNow key (public by design: search engines fetch it from /<key>.txt to check the pings are ours).
const INDEXNOW_KEY = "9f4c2a7e1b6d48c3a5e0f7b2d9c1e8a4";
const ID = /^[a-z0-9]{8,16}$/i;
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);
const plain = s => String(s || "").replace(/\*/g, "");
const num = p => { const x = /(\d[\d,]*(?:\.\d+)?)/.exec(String(p || "").replace(/\s/g, "")); return x ? +x[1].replace(/,/g, "") : null; };
const ph10 = p => { const d = String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""); return /^[6-9]\d{9}$/.test(d) ? d : ""; };
const abs = u => { u = String(u || ""); return /^\/(api\/img\?id=|assets\/)/.test(u) ? BASE + u : /^https:\/\//.test(u) ? u : ""; };

// schema.org type for each business type (falls back to LocalBusiness)
const TYPE = { cafe: "CafeOrCoffeeShop", tea: "CafeOrCoffeeShop", restaurant: "Restaurant", cloud: "Restaurant", fastfood: "FastFoodRestaurant", foodtruck: "FoodEstablishment",
  bakery: "Bakery", sweets: "FoodEstablishment", juice: "FoodEstablishment", icecream: "IceCreamShop", boutique: "ClothingStore", ethnic: "ClothingStore", jewellery: "JewelryStore",
  footwear: "ShoeStore", gifts: "Store", salon: "BeautySalon", spa: "DaySpa", skincare: "HealthAndBeautyBusiness", florist: "Florist", yoga: "SportsActivityLocation", pets: "PetStore",
  hotel: "LodgingBusiness", gym: "ExerciseGym", dance: "SportsActivityLocation", tattoo: "TattooParlor", barber: "HairSalon", photo: "ProfessionalService", coaching: "EducationalOrganization",
  repair: "ElectronicsStore", clinic: "MedicalClinic", dentist: "Dentist", pharmacy: "Pharmacy", optician: "Optician", lab: "MedicalBusiness", grocery: "GroceryStore", store: "ConvenienceStore",
  hardware: "HardwareStore", pro: "ProfessionalService", realestate: "RealEstateAgent", builder: "RealEstateAgent", rental: "RealEstateAgent", plots: "RealEstateAgent", interior: "HomeAndConstructionBusiness" };
const FOOD = ["cafe", "tea", "restaurant", "cloud", "fastfood", "foodtruck", "bakery", "sweets", "juice", "icecream"];
const LABEL = { cafe: "Café", tea: "Tea stall", restaurant: "Restaurant", cloud: "Cloud kitchen", fastfood: "Fast food", foodtruck: "Food stall", bakery: "Bakery", sweets: "Sweet shop", juice: "Juice bar",
  icecream: "Ice cream & desserts", boutique: "Boutique", ethnic: "Ethnic wear", jewellery: "Jewellery", footwear: "Shoes & bags", gifts: "Gift shop", salon: "Salon", spa: "Spa", skincare: "Skincare",
  florist: "Florist", yoga: "Yoga studio", pets: "Pet shop", hotel: "Hotel", gym: "Gym", dance: "Dance & music classes", tattoo: "Tattoo studio", barber: "Barber", photo: "Photography",
  coaching: "Coaching", repair: "Mobile & electronics repair", clinic: "Clinic", dentist: "Dental clinic", pharmacy: "Pharmacy", optician: "Optician", lab: "Diagnostic lab", grocery: "Kirana & grocery",
  store: "General store", hardware: "Hardware & electricals", pro: "Consultant", realestate: "Property dealer", builder: "Builder", rental: "Rentals & PG", plots: "Plots & land", interior: "Interior designer" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hm = s => /^\d{1,2}:\d{2}$/.test(s || "") ? s.padStart(5, "0") : "";
const t12 = s => { const [h, m] = s.split(":").map(Number), ap = h >= 12 ? "pm" : "am"; return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + " " + ap; };

function items(d) {
  return (Array.isArray(d.menu) ? d.menu : []).map(s => ({ n: clip(s && s.n, 40) || "Menu", items: (s && Array.isArray(s.items) ? s.items : []).filter(x => x && x.n).slice(0, 60)
    .map(x => ({ n: clip(x.n, 60), p: num(x.p), d: clip(x.d, 140), so: !!x.so })) })).filter(s => s.items.length);
}
const kindName = d => d.cat === "other" ? clip(d.catx, 30) : LABEL[d.cat] || "";
const city = d => { const a = String(d.addr || ""), m = /\b(jaipur|jodhpur|udaipur|kota|ajmer|bikaner|delhi|new delhi|mumbai|pune|bengaluru|bangalore|hyderabad|chennai|kolkata|ahmedabad|surat|indore|bhopal|lucknow|kanpur|noida|gurugram|gurgaon|chandigarh|nagpur|patna|vadodara|nashik|agra|varanasi|ranchi|raipur|dehradun|ludhiana|amritsar|guwahati|kochi|coimbatore|mysuru|visakhapatnam)\b/i.exec(a + " " + (d.area || "")); return m ? m[1].replace(/\b\w/g, c => c.toUpperCase()) : ""; };

// Is this shop page good enough to show on Google? { ok, why }
function readiness(m) {
  const d = (m && m.data) || {};
  if (!m || m.kind !== "biz") return { ok: false, why: "not a shop page" };
  if (m.paid === false) return { ok: false, why: "not live yet" };
  if (m.lock) return { ok: false, why: "locked" };
  if (d.noidx) return { ok: false, why: "hidden by the owner" };
  if (!clip(d.t, 60)) return { ok: false, why: "no name" };
  const n = items(d).reduce((t, s) => t + s.items.length, 0);
  if (n < 3 && !(d.addr && (ph10(d.phone) || ph10(d.wa)))) return { ok: false, why: "too little on the page yet" };
  return { ok: true, why: "" };
}

function view(m, id) {
  const d = m.data || {}, url = BASE + "/b/" + id, name = clip(plain(d.t), 60) || "Our shop", kind = kindName(d), area = clip(d.area, 40), c = city(d);
  const secs = items(d), ph = ph10(d.phone), wa = ph10(d.wa || d.phone), r = readiness(m);
  const where = [area, c && !new RegExp(c, "i").test(area) ? c : ""].filter(Boolean).join(", ");
  const title = clip(name + (kind || where ? " · " + [kind, where].filter(Boolean).join(" in ") : ""), 90);
  const top = secs.flatMap(s => s.items).slice(0, 4).map(x => x.n).join(", ");
  const desc = clip(plain(d.tag) || [kind && where ? `${kind} in ${where}` : kind || where, top ? (secs[0] ? clip(d.menuTitle || "Menu", 24) + ": " + top : "") : "", wa ? "Order on WhatsApp" : "", d.upi && d.upi.id ? "Pay by UPI" : ""].filter(Boolean).join(". "), 158);
  const img = [abs(d.cover), abs(d.logo), ...(Array.isArray(d.gal) ? d.gal.map(abs) : [])].filter(Boolean);
  const hrs = d.hours && Array.isArray(d.hours.d) && d.hours.d.length === 7 ? d.hours.d.map((x, i) => ({ day: DAYS[i], open: !x[2] && hm(x[0]) && hm(x[1]) ? [hm(x[0]), hm(x[1])] : null })) : null;
  const priced = secs.flatMap(s => s.items.filter(x => x.p != null).map(x => ({ ...x, sec: s.n })));
  const ld = { "@context": "https://schema.org", "@type": TYPE[d.cat] || "LocalBusiness", "@id": url + "#business", name, url, ...(desc ? { description: desc } : {}),
    ...(img.length ? { image: img.slice(0, 5) } : {}), ...(ph || wa ? { telephone: "+91" + (ph || wa) } : {}),
    ...(d.addr || area ? { address: { "@type": "PostalAddress", ...(d.addr ? { streetAddress: clip(d.addr, 160) } : {}), ...(c || area ? { addressLocality: c || area } : {}), addressCountry: "IN" } } : {}),
    ...(d.maps && /^https:\/\//.test(d.maps) ? { hasMap: d.maps } : {}),
    ...(hrs && hrs.some(h => h.open) ? { openingHoursSpecification: hrs.filter(h => h.open).map(h => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.day, opens: h.open[0], closes: h.open[1] })) } : {}),
    ...(d.ig ? { sameAs: ["https://instagram.com/" + String(d.ig).replace(/^@/, "").replace(/[^\w.]/g, "")] } : {}),
    ...(d.upi && d.upi.id ? { paymentAccepted: "Cash, UPI" } : {}), currenciesAccepted: "INR" };
  if (priced.length) {
    if (FOOD.includes(d.cat)) ld.hasMenu = { "@type": "Menu", name: clip(d.menuTitle || "Menu", 24), hasMenuSection: secs.map(s => ({ "@type": "MenuSection", name: s.n, hasMenuItem: s.items.slice(0, 30).map(x => ({ "@type": "MenuItem", name: x.n, ...(x.d ? { description: x.d } : {}), ...(x.p != null ? { offers: { "@type": "Offer", price: String(x.p), priceCurrency: "INR" } } : {}) })) })) };
    else ld.makesOffer = priced.slice(0, 50).map(x => ({ "@type": "Offer", price: String(x.p), priceCurrency: "INR", ...(x.so ? { availability: "https://schema.org/OutOfStock" } : {}), itemOffered: { "@type": "Product", name: x.n, ...(x.d ? { description: x.d } : {}), category: x.sec } }));
  }
  // The readable copy (replaced by the full page as soon as it loads in the browser).
  const off = d.offer && d.offer.on && d.offer.title ? `<p class="pre-of"><b>${esc(clip(d.offer.label || "Today's offer", 24))}:</b> ${esc(clip(d.offer.title, 60))}${d.offer.text ? " · " + esc(clip(d.offer.text, 160)) : ""}</p>` : "";
  const body = `<article class="pre"><h1>${esc(name)}</h1>${kind || where ? `<p class="pre-k">${esc([kind, where].filter(Boolean).join(" · "))}</p>` : ""}${d.tag ? `<p>${esc(clip(plain(d.tag), 200))}</p>` : ""}${off}
    ${d.addr ? `<p>${esc(clip(d.addr, 200))}</p>` : ""}${ph || wa ? `<p>${ph ? `<a href="tel:+91${ph}">Call +91 ${ph.slice(0, 5)} ${ph.slice(5)}</a>` : ""}${ph && wa ? " · " : ""}${wa ? `<a href="https://wa.me/91${wa}">WhatsApp</a>` : ""}</p>` : ""}
    ${hrs && hrs.some(h => h.open) ? `<h2>Hours</h2><ul>${hrs.map(h => `<li>${h.day}: ${h.open ? t12(h.open[0]) + " – " + t12(h.open[1]) : "Closed"}</li>`).join("")}</ul>` : ""}
    ${secs.length ? `<h2>${esc(clip(d.menuTitle || "Menu", 24))}</h2>${secs.slice(0, 12).map(s => `<h3>${esc(s.n)}</h3><ul>${s.items.slice(0, 40).map(x => `<li>${esc(x.n)}${x.p != null ? " · ₹" + x.p.toLocaleString("en-IN") : ""}${x.so ? " (sold out)" : ""}${x.d ? ` <small>${esc(x.d)}</small>` : ""}</li>`).join("")}</ul>`).join("")}` : ""}
    <p class="pre-by">Page by <a href="${BASE}/">GetKeepsake for Business</a></p></article>`;
  return { url, title, desc, img: img[0] || "", ld, body, index: r.ok };
}

// The shop page HTML: the usual biz.html with the shop's own head tags and readable copy filled in.
let TPL = null;
function page(m, id) {
  if (!TPL) TPL = require("fs").readFileSync(require("path").join(process.cwd(), "biz.html"), "utf8");
  if (!m || m.kind !== "biz") return { status: m ? 200 : 404, html: TPL.replace('<title>GetKeepsake</title>', '<title>GetKeepsake</title><meta name="robots" content="noindex">') };
  const v = view(m, id);
  const head = `<title>${esc(v.title)}</title>
<meta name="description" content="${esc(v.desc)}"><link rel="canonical" href="${v.url}"><meta name="robots" content="${v.index ? "index,follow,max-image-preview:large" : "noindex,follow"}">
<meta property="og:title" content="${esc(v.title)}"><meta property="og:description" content="${esc(v.desc)}"><meta property="og:url" content="${v.url}">${v.img ? `<meta property="og:image" content="${esc(v.img)}">` : ""}<meta name="twitter:card" content="${v.img ? "summary_large_image" : "summary"}">
${v.index ? `<script type="application/ld+json">${JSON.stringify(v.ld).replace(/</g, "\\u003c")}</script>` : ""}`;
  const html = TPL.replace("<title>GetKeepsake</title>", head).replace('<main id="biz" aria-live="polite"></main>', `<main id="biz" aria-live="polite">${m.lock || m.paid === false ? "" : v.body}</main>`);
  return { status: 200, html };
}

// Live shop pages for the sitemap: [{ id, at }], cached for an hour.
async function sitemapShops() {
  const hit = await db.cmd("GET", "seo:shops");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  let cur = "0", keys = [];
  do { const r = await db.cmd("SCAN", cur, "MATCH", "customer-memory:*", "COUNT", 500); cur = String(r[0]); keys.push(...r[1]); } while (cur !== "0" && keys.length < 20000);
  keys = [...new Set(keys)].filter(k => /^customer-memory:[a-z0-9]{8,16}$/i.test(k));
  const out = [];
  for (let i = 0; i < keys.length; i += 200) {
    const vs = await db.cmd("MGET", ...keys.slice(i, i + 200));
    vs.forEach((v, j) => { let m = null; try { m = v && JSON.parse(v); } catch (e) {} if (m && readiness(m).ok) out.push({ id: keys[i + j].slice(16), at: m.updated || m.activatedAt || m.created || 0 }); });
  }
  await db.cmd("SET", "seo:shops", JSON.stringify(out), "EX", 3600);
  return out;
}

// Tell Bing (and the other IndexNow engines) a shop page changed. At most once an hour per page; never blocks for long.
async function ping(id, m) {
  try {
    if (!ID.test(String(id || "")) || (m && !readiness(m).ok)) return false;
    if ((await db.cmd("SET", "inow:" + id, "1", "NX", "EX", 3600)) !== "OK") return false;
    return await indexNow([BASE + "/b/" + id]);
  } catch (e) { return false; }
}
async function indexNow(urls) {
  if (!urls.length || typeof fetch !== "function") return false;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "getkeepsake.in", key: INDEXNOW_KEY, keyLocation: BASE + "/" + INDEXNOW_KEY + ".txt", urlList: urls.slice(0, 10000) }) });
    return r.ok || r.status === 202;
  } catch (e) { return false; } finally { clearTimeout(t); }
}

module.exports = { page, view, readiness, sitemapShops, ping, indexNow, INDEXNOW_KEY, BASE };
