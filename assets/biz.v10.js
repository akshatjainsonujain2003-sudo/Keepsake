/* KSBiz v2: renders a GetKeepsake business page (shops, cafés, salons, studios…) from its saved data.
   Used by /b/:id (live page) and /shops/studio (live preview while editing).
   KSBiz.render(root, data, { preview, url }) · KSBiz.THEMES · KSBiz.LAYOUTS · KSBiz.CATS · KSBiz.GROUPS · KSBiz.blank(cat) · KSBiz.defaults(cat)
   Files in /assets are cached for a year: copy to a new version when changing this file after it goes live. v7 adds the Pop layout. */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; };
  const safeImg = u => { u = String(u || "").trim(); return /^\/api\/img\?id=[\w-]{1,80}$/.test(u) || /^\/assets\/[\w\/.-]+$/.test(u) || /^https:\/\/[^\s"'<>()]+$/i.test(u) ? u : ""; };
  const digits = s => String(s || "").replace(/\D/g, "");
  const phone10 = s => { const d = digits(s); return d.length === 10 ? "91" + d : d; };
  const num = s => { const m = /\d[\d,]*(\.\d+)?/.exec(String(s || "")); return m ? parseFloat(m[0].replace(/,/g, "")) : null; };
  const money = n => "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN");
  const cleanP = p => String(p || "").replace(/[^\d.,–\- ]/g, "").trim().slice(0, 12);
  const clip = (s, n) => String(s || "").slice(0, n);
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Colour themes work with every layout. hi/hit = the "featured" band, pal = Bold layout service cards.
  const THEMES = {
    latte:    { name: "Latte",    bg: "#fbf8f3", sf: "#ffffff", sf2: "#ece2d5", tx: "#4a2511", mu: "#8a6d5c", ac: "#b97a5a", on: "#ffffff", hi: "#f8caca", hit: "#4a2511", pal: ["#e9c9a8", "#f3c4c4", "#d8b48f"] },
    espresso: { name: "Espresso", bg: "#1f1611", sf: "#2a1f18", sf2: "#352820", tx: "#f4ebde", mu: "#c2ad96", ac: "#d9a066", on: "#1f1611", hi: "#4a3426", hit: "#f4ebde", pal: ["#d9a066", "#9fb4be", "#c48a52"], dark: 1 },
    noir:     { name: "Noir",     bg: "#0e0e0d", sf: "#181816", sf2: "#22211e", tx: "#f2ede4", mu: "#a9a296", ac: "#c9a96a", on: "#0e0e0d", hi: "#2a2620", hit: "#f2ede4", pal: ["#e3d26f", "#9cc0de", "#c98a3a"], dark: 1 },
    linen:    { name: "Linen",    bg: "#f5efe5", sf: "#fffcf6", sf2: "#efe6d8", tx: "#2a2018", mu: "#7d6e60", ac: "#b4562f", on: "#fffcf6", hi: "#f0d6c4", hit: "#2a2018", pal: ["#e7c873", "#a9c3d6", "#d49a6a"] },
    olive:    { name: "Olive",    bg: "#fbf8f1", sf: "#ffffff", sf2: "#eeeadd", tx: "#26321a", mu: "#6e7560", ac: "#4b5e27", on: "#fbf8f1", hi: "#e1e2b8", hit: "#26321a", pal: ["#d9dca4", "#b8c9a6", "#c9b07a"] },
    sage:     { name: "Sage",     bg: "#eef1e9", sf: "#fbfcf8", sf2: "#e3e8dc", tx: "#1e2a20", mu: "#66746a", ac: "#4d6b4b", on: "#fbfcf8", hi: "#d5e1cb", hit: "#1e2a20", pal: ["#c9d29b", "#9fc1b0", "#d7b98a"] },
    blush:    { name: "Blush",    bg: "#f8ecea", sf: "#fffaf9", sf2: "#f2dfdc", tx: "#3a1f24", mu: "#8c6a6f", ac: "#b2475b", on: "#fffaf9", hi: "#f3c3cb", hit: "#3a1f24", pal: ["#f2b8c2", "#c9bce8", "#eab08a"] },
    rose:     { name: "Rose",     ink: "#c4567a", bg: "#ffffff", sf: "#ffffff", sf2: "#f7e6ec", tx: "#161214", mu: "#7c6d73", ac: "#d9809a", on: "#ffffff", hi: "#dc8aa1", hit: "#ffffff", pal: ["#f0b3c4", "#d6d6dc", "#e9c6a8"] },
    ocean:    { name: "Ocean",    bg: "#0d1726", sf: "#142238", sf2: "#1b2c47", tx: "#eef3fb", mu: "#9fb0c8", ac: "#7fb3ff", on: "#0d1726", hi: "#1f3556", hit: "#eef3fb", pal: ["#7fb3ff", "#f2c76e", "#9fd8c4"], dark: 1 },
    mist:     { name: "Mist",     bg: "#f4f5f7", sf: "#ffffff", sf2: "#e8ecf0", tx: "#0f1419", mu: "#5f6b76", ac: "#1f6f8b", on: "#ffffff", hi: "#dcebf1", hit: "#0f1419", pal: ["#cfe3ec", "#e6dcf0", "#f1e3cf"] },
    cocoa:    { name: "Cocoa",    bg: "#f6f1e7", sf: "#fffaf1", sf2: "#ece2d0", tx: "#3a2810", mu: "#7d6a52", ac: "#4a3412", on: "#f6f1e7", hi: "#e9dcc3", hit: "#3a2810", pal: ["#e2cfa8", "#d6c3b0", "#c9b48a"] },
    maroon:   { name: "Maroon",   bg: "#f1ebe6", sf: "#ffffff", sf2: "#e6dcd5", tx: "#2a0d08", mu: "#7a5c55", ac: "#6e1a0e", on: "#f8efe9", hi: "#ead6cf", hit: "#2a0d08", pal: ["#e8c7bd", "#d9cfc6", "#c99a8a"] },
    bloom:    { name: "Bloom",    ink: "#4b1d8f", bg: "#fdf6fa", sf: "#ffffff", sf2: "#f4e6f0", tx: "#2a1145", mu: "#78658c", ac: "#4b1d8f", on: "#ffffff", hi: "#d6ef8c", hit: "#2a1145", pal: ["#ffa3dc", "#d6ef8c", "#ff6a2b"] },
    zest:     { name: "Zest",     ink: "#111111", bg: "#ecebe6", sf: "#f8f7f3", sf2: "#dedcd4", tx: "#111111", mu: "#6b6a63", ac: "#111111", on: "#ffc21a", hi: "#ffc21a", hit: "#111111", pal: ["#ffc21a", "#d4d1c7", "#1c1c1c"] },
    ember:    { name: "Ember",    ink: "#0d0d0d", bg: "#ffffff", sf: "#ffffff", sf2: "#efefef", tx: "#0d0d0d", mu: "#6d6d6d", ac: "#ff4b1f", on: "#ffffff", hi: "#ff4b1f", hit: "#ffffff", pal: ["#ff4b1f", "#e8e8e8", "#151515"] },
    fizz:     { name: "Fizz",     ink: "#3d0f30", bg: "#fff6f9", sf: "#ffffff", sf2: "#fde4ee", tx: "#3d0f30", mu: "#8b6a80", ac: "#ff5ca8", on: "#ffffff", hi: "#ffc23a", hit: "#3d0f30", pal: ["#ff9ad2", "#ffc23a", "#4f7fe8"] },
    riot:     { name: "Riot",     ink: "#6d5f0c", bg: "#efefdc", sf: "#fbfbef", sf2: "#e2e2c8", tx: "#2b2a1e", mu: "#6f6d58", ac: "#e3d44a", on: "#2b2a1e", hi: "#9bc0e2", hit: "#1d1c14", pal: ["#e3d44a", "#9bc0e2", "#c9913f"] }
  };

  const LAYOUTS = {
    classic:   { name: "Classic",   best: "Clinics, stores, professionals" },
    poster:    { name: "Poster",    best: "Cafés, food, fashion" },
    botanical: { name: "Botanical", best: "Salons, spas, florists, wellness" },
    bold:      { name: "Bold",      best: "Gyms, studios, services" },
    pop:       { name: "Pop",       best: "Food trucks, desserts, cafés, kids" },
    label:     { name: "Label",     best: "Fashion, brands, gadgets, gifts" }
  };

  // Business types: [key, label, layout, theme, big headline, script word, menu heading]. *word* = highlighted word.
  const GROUP_DEF = {
    food:     { name: "Food & Drinks",       gal: "Inside",     ord: true },
    fashion:  { name: "Fashion & Gifts",     gal: "Lookbook",   ord: true },
    beauty:   { name: "Beauty & Wellness",   gal: "Our space",  ord: false },
    services: { name: "Services & Classes",  gal: "Our work",   ord: false },
    health:   { name: "Health",              gal: "Our clinic", ord: false },
    stores:   { name: "Stores & Professionals", gal: "Our store", ord: false },
    realty:   { name: "Real Estate & Property", gal: "Projects", ord: false, prop: true }
  };
  const CAT_LIST = [
    ["food", "cafe", "Café", "poster", "latte", "Order Coffee", "Welcome", "Menu"],
    ["food", "restaurant", "Restaurant", "poster", "espresso", "Taste This", "Welcome", "Menu"],
    ["food", "cloud", "Cloud Kitchen", "poster", "noir", "Order Now", "Hot & fresh", "Menu"],
    ["food", "bakery", "Bakery & Cakes", "poster", "blush", "Fresh Bakes", "Daily", "Menu"],
    ["food", "sweets", "Sweet Shop", "poster", "linen", "Pure Mithai", "Since always", "Sweets"],
    ["food", "juice", "Juice & Shakes", "poster", "blush", "Stay Fresh", "Sip sip", "Menu"],
    ["food", "icecream", "Ice Cream & Desserts", "poster", "rose", "Scoop Joy", "Treat yourself", "Flavours"],
    ["food", "fastfood", "Fast Food & Chaat", "poster", "espresso", "Street Bites", "Hungry?", "Menu"],
    ["food", "foodtruck", "Food Truck & Stalls", "pop", "bloom", "Snack Good Eat Good", "Find us today", "Menu"],
    ["food", "tea", "Tea Stall", "poster", "latte", "Chai Time", "Welcome", "Menu"],
    ["fashion", "boutique", "Boutique & Clothing", "poster", "rose", "New Arrivals", "Collection", "Collection"],
    ["fashion", "ethnic", "Ethnic Wear & Sarees", "poster", "blush", "Ethnic Edit", "Festive", "Collection"],
    ["fashion", "jewellery", "Jewellery", "poster", "noir", "Fine Jewels", "Timeless", "Collection"],
    ["fashion", "footwear", "Shoes & Bags", "poster", "rose", "Step Up", "New season", "Collection"],
    ["fashion", "gifts", "Gift Shop", "poster", "blush", "Gift Joy", "For them", "Gifts"],
    ["beauty", "salon", "Salon & Beauty Parlour", "botanical", "blush", "Glow Begins Here", "", "Services"],
    ["beauty", "spa", "Spa & Massage", "botanical", "sage", "Slow Down, Breathe", "", "Treatments"],
    ["beauty", "skincare", "Skincare & Ayurveda", "botanical", "olive", "Rooted in Nature", "", "Products"],
    ["beauty", "florist", "Florist & Plants", "botanical", "olive", "Fresh Every Morning", "", "Bouquets"],
    ["beauty", "yoga", "Yoga & Wellness", "botanical", "sage", "Find Your Balance", "", "Classes"],
    ["beauty", "pets", "Pet Shop & Vet", "botanical", "linen", "Happy Pets Live Here", "", "Services"],
    ["beauty", "hotel", "Hotel & Homestay", "botanical", "linen", "Stay a Little Longer", "", "Rooms"],
    ["services", "gym", "Gym & Fitness", "bold", "noir", "Train Like You *Mean It*", "", "Plans"],
    ["services", "dance", "Dance & Music Classes", "bold", "riot", "Find Your *Rhythm*", "", "Classes"],
    ["services", "tattoo", "Tattoo Studio", "bold", "noir", "Ink That *Tells* Your Story", "", "Services"],
    ["services", "barber", "Barber & Men's Grooming", "bold", "noir", "Sharp Cuts, *Clean* Fades", "", "Services"],
    ["services", "photo", "Photography & Events", "bold", "riot", "Moments Made *Unforgettable*", "", "Packages"],
    ["services", "coaching", "Coaching & Tuition", "bold", "ocean", "Learn. Practise. *Top.*", "", "Courses"],
    ["services", "repair", "Mobile & Electronics Repair", "bold", "ocean", "Fixed *Fast*, Done Right", "", "Services"],
    ["health", "clinic", "Doctor & Clinic", "classic", "mist", "Care that *listens*", "", "Services"],
    ["health", "dentist", "Dental Clinic", "classic", "mist", "Smiles made *simple*", "", "Treatments"],
    ["health", "pharmacy", "Pharmacy", "classic", "sage", "Your health, *close* to home", "", "Products"],
    ["health", "optician", "Optician", "classic", "mist", "See the world *clearly*", "", "Frames & lenses"],
    ["health", "lab", "Diagnostic Lab", "classic", "mist", "Accurate reports, *on time*", "", "Tests"],
    ["stores", "grocery", "Kirana & Grocery", "classic", "linen", "Fresh stock, *fair* prices", "", "Products"],
    ["stores", "store", "General Store", "classic", "linen", "Everything you *need*", "", "Products"],
    ["stores", "hardware", "Hardware & Electricals", "classic", "cocoa", "Built to *last*", "", "Products"],
    ["stores", "pro", "CA, Lawyer & Consultant", "classic", "maroon", "Advice you can *trust*", "", "Services"],
    ["realty", "realestate", "Property Dealer & Agent", "classic", "cocoa", "Find your *place*", "", "Properties"],
    ["realty", "builder", "Builder & New Projects", "classic", "noir", "Homes built to *last*", "", "Projects"],
    ["realty", "rental", "Rentals, PG & Hostels", "classic", "linen", "A room that feels like *home*", "", "Rooms"],
    ["realty", "plots", "Plots, Land & Farmhouses", "classic", "olive", "Own your piece of *land*", "", "Plots"],
    ["realty", "interior", "Interior Designer & Architect", "bold", "noir", "Spaces that *speak*", "", "Projects"],
    ["stores", "other", "Something else", "classic", "mist", "", "", "Menu"]
  ];
  const CATS = {}, GROUPS = [];
  // Property listing status (real estate): item.s
  const PST = { sale: "For sale", rent: "For rent", new: "New launch", ready: "Ready to move", sold: "Sold out" };
  CAT_LIST.forEach(([g, k, label, lay, th, hl, sc, menuTitle]) => {
    CATS[k] = { label: k === "other" ? "" : label, name: label, group: g, lay, th, hl, sc, menuTitle, galTitle: GROUP_DEF[g].gal, ord: GROUP_DEF[g].ord, prop: !!GROUP_DEF[g].prop };
    let gr = GROUPS.find(x => x.key === g); if (!gr) GROUPS.push(gr = { key: g, name: GROUP_DEF[g].name, cats: [] }); gr.cats.push(k);
  });
  const defaults = cat => { const c = CATS[cat] || CATS.other; return { lay: c.lay, th: c.th, hl: c.hl, sc: c.sc, menuTitle: c.menuTitle, galTitle: c.galTitle, ord: c.ord }; };

  const FONTS = {
    classic: "family=Inter+Tight:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700",
    poster: "family=Archivo+Black&family=Pinyon+Script&family=Inter:wght@400;500;600;700",
    botanical: "family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=DM+Sans:wght@400;500;600;700",
    bold: "family=Anton&family=Inter:wght@400;500;600;700;800",
    pop: "family=Archivo+Black&family=Bricolage+Grotesque:opsz,wght@12..96,500..800",
    label: "family=Inter+Tight:wght@500;600;700;800&family=Inter:wght@400;500;600;700"
  };
  function fonts(lay) {
    const id = "ks-bz-f-" + lay; if (document.getElementById(id)) return;
    const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + FONTS[lay] + "&display=swap"; document.head.appendChild(l);
  }

  const I = {
    call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    wa: '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2.1-1-1 .9a5 5 0 0 1-2.9-2.9l.9-1-1-2.1Z" fill="currentColor" stroke="none"/>',
    pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
    pay: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    save: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    bag: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.5 9 8 12 8Zm0 0s1.5-4.5 4-3.5S15 8 12 8Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>'
  };
  const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  // "*word*" in a headline becomes a highlighted word
  const mark = s => esc(s).replace(/\*([^*]{1,40})\*/g, "<mark>$1</mark>");
  const plain = s => String(s || "").replace(/\*/g, "");

  function css() {
    if (document.getElementById("ks-biz3-css")) return;
    const s = document.createElement("style"); s.id = "ks-biz3-css";
    s.textContent = `
.bz{--fh:'Fraunces',Georgia,serif;--fn:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--tx);font-family:var(--fn);min-height:100%;-webkit-font-smoothing:antialiased;position:relative;overflow:hidden}
.bz *{box-sizing:border-box}.bz a{color:inherit;text-decoration:none}.bz button{font-family:inherit}
.bz [hidden]{display:none!important}
.bz .wrap{max-width:560px;margin:0 auto;position:relative}
.bz .sec{padding:30px 18px 0}
.bz .h2{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 4px 14px}
.bz .h2 b{font:500 26px/1.1 var(--fh);letter-spacing:-.01em}
.bz .h2 small{font:600 11px var(--fn);letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.bz .card{background:var(--sf);border-radius:24px;border:1px solid color-mix(in srgb,var(--tx) 8%,transparent);box-shadow:0 20px 40px -30px #0008}
.bz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:999px;background:var(--ac);color:var(--on);font:700 14.5px var(--fn);white-space:nowrap;border:0;cursor:pointer}
.bz .logo{width:104px;height:104px;border-radius:50%;margin:0 auto;background:var(--sf) center/cover no-repeat;border:4px solid var(--bg);box-shadow:0 18px 40px -14px #0009;display:grid;place-items:center;font:500 42px var(--fh);color:var(--ink)}
.bz .cat{font:600 11.5px var(--fn);letter-spacing:.22em;text-transform:uppercase;color:var(--ink)}
.bz .acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(54px,1fr));gap:10px;padding:24px 18px 6px}
.bz .act{display:flex;flex-direction:column;align-items:center;gap:8px;font:600 11.5px var(--fn);color:var(--mu);cursor:pointer}
.bz .act span{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:var(--sf);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 10%,transparent);box-shadow:0 10px 24px -16px #0007;transition:transform .15s}
.bz .act:active span{transform:scale(.92)}
.bz .act.pr span{background:var(--ac);color:var(--on);border-color:transparent}
/* offer ticket */
.bz .offer{position:relative;padding:24px 24px 22px;border-radius:24px;background:linear-gradient(135deg,var(--ac),color-mix(in srgb,var(--ac) 70%,#000));color:var(--on);overflow:hidden}
.bz .offer:before,.bz .offer:after{content:"";position:absolute;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:var(--bg)}
.bz .offer:before{left:-13px}.bz .offer:after{right:-13px}
.bz .offer small{font:700 11px var(--fn);letter-spacing:.24em;text-transform:uppercase;opacity:.85}
.bz .offer b{display:block;font:500 30px/1.1 var(--fh);margin:8px 0 6px}
.bz .offer p{margin:0;font:400 14.5px/1.45 var(--fn);opacity:.92}
.bz .offer .till{display:inline-block;margin-top:12px;padding:6px 12px;border-radius:999px;background:#0002;font:600 12px var(--fn)}
/* review */
.bz .loy{position:relative;padding:22px 20px 20px;border-radius:24px;background:var(--sf);color:var(--tx);border:1.5px dashed color-mix(in srgb,var(--ac) 55%,transparent);overflow:hidden}
.bz .loy:after{content:"";position:absolute;right:-40px;top:-40px;width:140px;height:140px;border-radius:50%;background:color-mix(in srgb,var(--ac) 12%,transparent);pointer-events:none}
.bz .loy .lh{display:flex;justify-content:space-between;align-items:center;gap:10px;position:relative;z-index:1}
.bz .loy .lb{display:inline-flex;align-items:center;gap:6px;font:700 11px var(--fn);letter-spacing:.14em;text-transform:uppercase;color:var(--ink)}
.bz .loy .lb svg{fill:currentColor}
.bz .loy .lc{padding:5px 10px;border-radius:999px;background:var(--sf2);font:700 12px var(--fn);color:var(--tx)}
.bz .loy .lr{display:block;margin:12px 0 4px;font:500 26px/1.15 var(--fh);position:relative;z-index:1}
.bz .loy .lp{margin:0;font:400 14px/1.45 var(--fn);color:var(--mu);position:relative;z-index:1}
.bz .loy .lst{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0 18px}
.bz .loy .lst.sm{grid-template-columns:repeat(6,1fr);gap:8px}
.bz .loy .lst i{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;border:1.5px dashed color-mix(in srgb,var(--tx) 28%,transparent);color:var(--mu);font-style:normal;transition:transform .35s cubic-bezier(.3,1.6,.5,1),background .25s}
.bz .loy .lst i u{text-decoration:none;font:600 12px var(--fn);opacity:.7}
.bz .loy .lst i.gf{border-style:solid;border-color:var(--ac);color:var(--ink)}
.bz .loy .lst i.on{background:var(--ac);color:var(--on);border:0;transform:rotate(-8deg)}
.bz .loy .lst i.pop{animation:bzpop .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes bzpop{0%{transform:scale(.3) rotate(-30deg)}100%{transform:scale(1) rotate(-8deg)}}
.bz .loy .la{display:grid;gap:10px}.bz .loy .la .btn{width:100%}
.bz .loy .la .lk{background:none;border:0;padding:4px;color:var(--mu);font:500 12.5px var(--fn);text-decoration:underline;cursor:pointer}
.bz .loy.rdy{border-style:solid;border-color:var(--ac);background:linear-gradient(160deg,color-mix(in srgb,var(--ac) 16%,var(--sf)),var(--sf))}
.bz .rev{padding:22px;display:flex;align-items:center;gap:16px}
.bz .rev .st{display:flex;gap:3px;margin-bottom:6px}.bz .rev .st svg{fill:#f5b301;stroke:#f5b301}
.bz .rev b{display:block;font:500 20px/1.2 var(--fh)}
.bz .rev p{margin:4px 0 0;font:400 13.5px/1.4 var(--fn);color:var(--mu)}
/* menu list */
.bz .tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -18px 14px;padding:0 22px}
.bz .tabs::-webkit-scrollbar{display:none}
.bz .tabs button{flex:none;padding:10px 16px;border-radius:999px;border:1px solid color-mix(in srgb,var(--tx) 14%,transparent);background:transparent;color:var(--mu);font:600 13.5px var(--fn);cursor:pointer}
.bz .tabs button.on{background:var(--tx);color:var(--bg);border-color:var(--tx)}
.bz .menu{padding:6px 20px}
.bz .it{display:flex;gap:14px;align-items:center;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--tx) 8%,transparent)}
.bz .it:last-child{border-bottom:0}
.bz .it .tx{flex:1;min-width:0}
.bz .it .r{display:flex;align-items:baseline;gap:10px}
.bz .it .n{font:500 18px/1.25 var(--fh)}
.bz .it .dl{flex:1;border-bottom:1.5px dotted color-mix(in srgb,var(--tx) 25%,transparent);transform:translateY(-4px)}
.bz .it .p{font:700 15px var(--fn);color:var(--ink);white-space:nowrap}
.bz .it .d{margin:5px 0 0;font:400 13.5px/1.45 var(--fn);color:var(--mu)}
.bz .it>img{width:68px;height:68px;border-radius:16px;object-fit:cover;flex:none}
.bz .bs{display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--ac) 18%,transparent);color:var(--ink);font:700 10px var(--fn);letter-spacing:.08em;text-transform:uppercase;vertical-align:3px}
/* property listings (real estate) */
.bz .pgrid{display:grid;gap:14px}
@media(min-width:720px){.bz .pgrid{grid-template-columns:1fr 1fr}}
.bz .pcard{background:var(--sf);border-radius:22px;overflow:hidden;box-shadow:0 1px 0 color-mix(in srgb,var(--tx) 8%,transparent),0 12px 30px -18px #0005}
.bz .pcard.sold{opacity:.62}
.bz .pim{position:relative;aspect-ratio:16/10;background:var(--sf2);display:grid;place-items:center;color:var(--mu)}
.bz .pim img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bz .pst,.bz .pfe{position:absolute;top:12px;padding:6px 11px;border-radius:99px;font:700 11.5px var(--fn);font-style:normal;letter-spacing:.02em;backdrop-filter:blur(8px)}
.bz .pst{left:12px;background:#fffffff0;color:#121110}.bz .pst.rent{background:#e8f1ff;color:#123c7a}.bz .pst.new{background:var(--ac);color:var(--on)}.bz .pst.sold{background:#121110;color:#fff}.bz .pst.ready{background:#e3f6e9;color:#145c32}
.bz .pfe{right:12px;background:#121110cc;color:#ffd84d}
.bz .pbd{padding:16px 18px 18px}
.bz .ppr{display:block;font:700 24px/1.1 var(--fh);color:var(--ink,var(--ac));letter-spacing:-.01em}
.bz .pbd h3{margin:6px 0 0;font:600 17px/1.3 var(--fn);color:var(--tx)}
.bz .psp{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.bz .psp span{padding:5px 10px;border-radius:9px;background:var(--sf2);color:var(--tx);font:600 12.5px var(--fn)}
.bz .penq{margin-top:14px;width:100%;justify-content:center}
.bz .psv{margin-top:16px;width:100%;justify-content:center;background:transparent;color:var(--tx);border:1.5px solid color-mix(in srgb,var(--tx) 30%,transparent)}
/* add-to-basket controls */
.bz .q{display:inline-flex;align-items:center;gap:2px;flex:none}
.bz .q button{width:32px;height:32px;border-radius:50%;border:0;display:grid;place-items:center;background:var(--ac);color:var(--on);cursor:pointer}
.bz .q button.m{background:color-mix(in srgb,var(--tx) 10%,transparent);color:var(--tx)}
.bz .q b{min-width:22px;text-align:center;font:700 14px var(--fn)}
/* gallery, hours, map, upi, footer */
.bz .gal{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -18px;padding:0 18px 6px;scrollbar-width:none}
.bz .gal::-webkit-scrollbar{display:none}
.bz .gal img{flex:none;width:76%;aspect-ratio:4/5;object-fit:cover;border-radius:22px;scroll-snap-align:center;box-shadow:0 20px 40px -26px #000a}
.bz .hrs{padding:8px 20px}
.bz .hr{display:flex;justify-content:space-between;padding:12px 0;font:500 14.5px var(--fn);border-bottom:1px solid color-mix(in srgb,var(--tx) 7%,transparent)}
.bz .hr:last-child{border-bottom:0}
.bz .hr span:last-child{color:var(--mu);font-variant-numeric:tabular-nums}
.bz .hr.td{color:var(--ink)}.bz .hr.td span:last-child{color:var(--ink);font-weight:700}
.bz .map{overflow:hidden;padding:0}
.bz .map iframe,.bz .map .mp{display:block;width:100%;height:210px;border:0;filter:saturate(.85)}
.bz .map .mp{display:grid;place-items:center;background:var(--sf2);color:var(--mu)}
.bz .map .ad{padding:18px 20px;display:flex;gap:14px;align-items:center;justify-content:space-between}
.bz .map .ad p{margin:0;font:400 14px/1.45 var(--fn);color:var(--mu)}
.bz .upi{padding:22px;display:flex;flex-direction:column;gap:14px}
.bz .upi .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:var(--sf2);font:600 14px var(--fn)}
.bz .upi .row button{background:none;border:0;color:var(--ink);font:700 13px var(--fn);display:flex;gap:6px;align-items:center;cursor:pointer}
.bz .foot{padding:44px 22px 56px;text-align:center}
.bz .foot .so{display:flex;justify-content:center;gap:12px;margin-bottom:26px}
.bz .foot .so a{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--sf);border:1px solid color-mix(in srgb,var(--tx) 10%,transparent)}
.bz .foot .mk{font:500 12.5px var(--fn);color:var(--mu)}
.bz .foot .mk a{color:var(--tx);border-bottom:1px solid color-mix(in srgb,var(--tx) 30%,transparent)}
.bz .pill{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;background:#0008;color:#fff;font:600 12.5px var(--fn);letter-spacing:.02em;backdrop-filter:blur(10px)}
.bz .pill i{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px #4ade8033}
.bz .pill.cl i{background:#f87171;box-shadow:0 0 0 3px #f8717133}
.bz .ibtn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#0008;color:#fff;backdrop-filter:blur(10px);border:0;cursor:pointer;position:relative}
.bz .ibtn em{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;border-radius:9px;background:var(--ac);color:var(--on);font:700 10.5px/18px var(--fn);font-style:normal;padding:0 4px}
/* basket bar */
.bz .bk{visibility:hidden;position:fixed;left:50%;bottom:16px;transform:translate(-50%,140%);width:min(520px,calc(100% - 24px));display:flex;align-items:center;gap:12px;padding:10px 10px 10px 18px;border-radius:999px;background:var(--tx);color:var(--bg);box-shadow:0 20px 40px -14px #000a;transition:transform .35s cubic-bezier(.2,.8,.2,1);z-index:8}
.bz .bk.on{transform:translate(-50%,0);visibility:visible}
.bz .bk .bt{flex:1;min-width:0;font:600 14px var(--fn)}.bz .bk .bt small{display:block;font:500 11.5px var(--fn);opacity:.7}
.bz .bk .btn{background:#25d366;color:#05301a;padding:12px 16px;font-size:13.5px}
.bz .shutn{position:sticky;top:0;z-index:7;padding:11px 16px;text-align:center;background:var(--tx);color:var(--bg);font:600 13.5px/1.4 var(--fn)}
.bz .sold{display:inline-block;padding:5px 10px;border-radius:999px;background:var(--sf2);color:var(--mu);font:700 11px var(--fn);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.bz .ck{position:fixed;inset:0;z-index:20;display:flex;align-items:flex-end;justify-content:center;background:#0000;transition:background .22s}
.bz .ck.on{background:#0008}
.bz .ckb{position:relative;width:min(520px,100%);max-height:92svh;overflow:auto;padding:22px 20px calc(18px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;background:var(--bg);color:var(--tx);transform:translateY(100%);transition:transform .25s cubic-bezier(.2,.8,.2,1);font:500 14px/1.4 var(--fn)}
.bz .ck.on .ckb{transform:none}
.bz .ckb>b{display:block;font:700 21px var(--fn)}.bz .cks{margin:2px 0 14px;color:var(--mu)}
.bz .ckx{position:absolute;right:12px;top:12px;width:36px;height:36px;border-radius:50%;border:0;background:var(--sf2);color:var(--tx);font-size:22px;line-height:1;cursor:pointer}
.bz .ckb label{display:block;margin:0 0 12px;font-weight:600;font-size:13px}.bz .ckb label small{font-weight:500;color:var(--mu)}
.bz .ckb input{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--sf2);background:var(--sf);color:var(--tx);font:500 16px var(--fn)}
.bz .ckb input:focus{outline:0;border-color:var(--ac)}
.bz .ckm{display:flex;gap:6px;margin:0 0 12px}.bz .ckm button{flex:1;padding:11px 6px;border-radius:12px;border:1.5px solid var(--sf2);background:var(--sf);color:var(--tx);font:600 13px var(--fn);cursor:pointer}
.bz .ckm button.on{border-color:var(--ac);background:var(--ac);color:var(--on)}
.bz .ckb .btn.ckgo{width:100%;justify-content:center;background:#25d366;color:#05301a;border:0;padding:15px;font-size:15px;margin-top:4px}
.bz .ckf{display:block;text-align:center;margin-top:9px;color:var(--mu);font-size:12px}
.bz .sfab{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:8px;padding:13px 20px;border:0;border-radius:999px;background:var(--ac);color:var(--on);font:700 14.5px var(--fn);box-shadow:0 16px 34px -12px #000a;cursor:pointer;white-space:nowrap;transition:bottom .3s}
.bz .bk.on~.sfab{bottom:calc(86px + env(safe-area-inset-bottom))}
.bz .myo{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;background:var(--tx);color:var(--bg);font:700 13px var(--fn);box-shadow:0 12px 26px -10px #000a;cursor:pointer;white-space:nowrap}
.bz .sto{position:fixed;inset:0;z-index:7;background:var(--bg);color:var(--tx);overflow-y:auto;padding-bottom:110px;opacity:0;transform:translateY(24px);transition:opacity .22s,transform .22s;font-family:var(--fn)}
.bz .sto.on{opacity:1;transform:none}
.bz .sth{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg);border-bottom:1px solid var(--sf2)}
.bz .sth b{flex:1;font:700 16px var(--fn);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bz .sth span{font-size:12.5px;color:var(--mu)}
.bz .stx{width:38px;height:38px;border-radius:50%;border:0;background:var(--sf);color:var(--tx);display:grid;place-items:center;cursor:pointer}.bz .stx svg{transform:rotate(180deg)}
.bz .sts{padding:12px 14px 4px}.bz .sts input{width:100%;box-sizing:border-box;padding:13px 16px;border-radius:14px;border:1.5px solid var(--sf2);background:var(--sf);color:var(--tx);font:500 15px var(--fn);outline:0}
.bz .sts input:focus{border-color:var(--ac)}
.bz .stc{display:flex;gap:8px;overflow-x:auto;padding:10px 14px;scrollbar-width:none}.bz .stc::-webkit-scrollbar{display:none}
.bz .stc button{flex:none;padding:9px 15px;border-radius:999px;border:1.5px solid var(--sf2);background:none;color:var(--tx);font:600 13px var(--fn);cursor:pointer}
.bz .stc button.on{background:var(--tx);border-color:var(--tx);color:var(--bg)}
.bz .stg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:6px 14px}
@media (min-width:640px){.bz .stg{grid-template-columns:repeat(3,minmax(0,1fr))}}
.bz .spc{display:flex;flex-direction:column;gap:4px;min-width:0}.bz .spc.so{opacity:.55}
.bz .spi{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:16px;overflow:hidden;background:var(--sf);cursor:pointer;display:grid;place-items:center}
.bz .spi img{width:100%;height:100%;object-fit:cover}.bz .spi span{font:700 34px var(--fh);color:var(--mu)}
.bz .spi em{position:absolute;left:8px;top:8px;padding:3px 8px;border-radius:999px;background:var(--ac);color:var(--on);font:800 11px var(--fn);font-style:normal}
.bz .spn{border:0;background:none;padding:2px 0 0;text-align:left;color:var(--tx);font:600 14px/1.3 var(--fn);cursor:pointer;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bz .spr{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.bz .spr b{font:800 15px var(--fn)}.bz .spr s{color:var(--mu);font-size:12.5px}.bz .spr em{font:800 12px var(--fn);color:var(--ac);font-style:normal}
.bz .spc .q,.bz .spc .sold{margin-top:4px;align-self:flex-start}
.bz .spe{grid-column:1/-1;text-align:center;color:var(--mu);padding:30px 0}
.bz .stm{display:block;margin:16px auto;padding:12px 22px;border-radius:999px;border:1.5px solid var(--tx);background:none;color:var(--tx);font:700 14px var(--fn);cursor:pointer}
.bz .spd{position:fixed;inset:0;z-index:3;background:var(--bg);overflow-y:auto;padding-bottom:110px}
.bz .pdi{display:block;width:100%;max-height:60svh;object-fit:cover}
.bz .pdb{padding:18px 18px 0}.bz .pdb h3{margin:0 0 8px;font:700 24px/1.2 var(--fh)}.bz .pdb .spr b{font-size:20px}.bz .pdb p{color:var(--mu);font-size:15px;line-height:1.5}.bz .pdq{margin-top:16px}.bz .pdq .q button{width:40px;height:40px}
.bz .ckp button{font-size:12.5px}
.bz [data-ckd]{text-align:center;padding-top:6px}.bz [data-ckd] .okk{width:56px;height:56px;margin:0 auto 10px;border-radius:50%;background:var(--ac);color:var(--on);display:grid;place-items:center}
.bz [data-ckd]>b{font:700 20px var(--fn)}.bz [data-ckd] .ost{margin:12px 0 16px;padding:12px;border-radius:14px;background:var(--sf);font-weight:600}
.bz [data-ckd] .btn{width:100%;justify-content:center;margin-top:8px;box-sizing:border-box}.bz [data-ckd] .btn.gh{background:none;color:var(--tx);border:1.5px solid var(--sf2)}
.bz .toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:var(--tx);color:var(--bg);font:600 13px var(--fn);opacity:0;transition:.25s;pointer-events:none;z-index:30}
.bz .toast.on{opacity:1}
.bz .rv{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}
.bz .rv.in{opacity:1;transform:none}
.bz.static .rv{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.bz .rv{opacity:1;transform:none;transition:none}.bz .kb{animation:none!important}}
.bz.anim .kb{animation:bzkb 18s ease-in-out infinite alternate}
@keyframes bzkb{to{transform:scale(1.09) translateY(-1.5%)}}

/* shared bits */
.bz .ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--mu);font:italic 400 22px var(--fh);background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--ac) 35%,transparent),transparent 60%),var(--sf2)}
.L-poster .top{position:absolute;left:18px;right:18px;top:16px;display:flex;justify-content:space-between;align-items:center;gap:10px;z-index:3}
.bz .tag{font:italic 400 18px/1.45 var(--fh);color:var(--mu);margin:10px auto 0;max-width:380px}
.bz .feat{margin:0 18px;border-radius:26px;overflow:hidden;background:var(--hi);color:var(--hit);display:grid}
.bz .feat small{font:700 11px var(--fn);letter-spacing:.22em;text-transform:uppercase;opacity:.75}
.bz .feat h3{margin:6px 0 6px;font:500 28px/1.1 var(--fh)}
.bz .feat p{margin:0 0 14px;font:400 14px/1.5 var(--fn);opacity:.85}
.bz .feat .pr{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.bz .feat .pr b{font:700 26px var(--fn)}.bz .feat .pr s{opacity:.55;font:600 16px var(--fn)}

/* ---------- Classic (clinics, stores, professionals): clean, editorial, bento ---------- */
.L-classic{--fh:'Inter Tight','Inter',system-ui,sans-serif}
.L-classic .cnav{position:absolute;top:12px;left:12px;right:12px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 7px 7px 14px;border-radius:999px;background:color-mix(in srgb,var(--sf) 82%,transparent);backdrop-filter:blur(16px);border:1px solid color-mix(in srgb,var(--tx) 8%,transparent)}
.L-classic .cnav .cb{display:flex;align-items:center;gap:9px;min-width:0;font:600 14px var(--fh);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.L-classic .cnav .mi{width:26px;height:26px;border-radius:50%;flex:none;background:var(--tx) center/cover;color:var(--bg);display:grid;place-items:center;font:700 12px var(--fn)}
.L-classic .cnav .r{display:flex;gap:6px;align-items:center;flex:none}
.L-classic .cnav .ibtn{width:36px;height:36px;background:color-mix(in srgb,var(--tx) 8%,transparent);color:var(--tx);backdrop-filter:none}
.L-classic .pb{display:inline-flex;align-items:center;gap:10px;padding:5px 5px 5px 18px;border-radius:999px;background:var(--tx);color:var(--bg);font:600 14px var(--fn);white-space:nowrap;border:0;cursor:pointer}
.L-classic .pb i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--bg);color:var(--tx)}
.L-classic .pb.lt{background:#fff;color:#111}.L-classic .pb.lt i{background:#111;color:#fff}
.L-classic .pb.sm{padding:4px 4px 4px 14px;font-size:13px}.L-classic .pb.sm i{width:28px;height:28px}
.L-classic .chero{position:relative;height:min(92svh,780px);min-height:600px;overflow:hidden;background:var(--sf2);color:#fff}
.L-classic .chero .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.L-classic .chero .cg{position:absolute;inset:0;background:linear-gradient(180deg,#0000 30%,#0000 42%,#0009 82%,#000b 100%)}
.L-classic .chero .ct{position:absolute;left:20px;right:20px;bottom:64px;z-index:2}
.L-classic .eb{display:block;font:600 11px var(--fn);letter-spacing:.2em;text-transform:uppercase;opacity:.85;margin-bottom:12px}
.L-classic h1{margin:0;font:300 clamp(40px,12.4vw,76px)/.98 var(--fh);letter-spacing:-.04em;text-transform:uppercase}
.L-classic h1 .chip{display:inline-block;width:1.5em;height:.78em;border-radius:.2em;background:center/cover var(--sf2);vertical-align:.04em;margin-right:.14em;box-shadow:0 6px 20px -8px #0008}
.L-classic h1 .swo{position:relative;white-space:nowrap}
.L-classic h1 .swo svg{position:absolute;left:-2%;bottom:-.14em;width:104%;height:.3em;overflow:visible}
.L-classic h1 .swo path{fill:none;stroke:var(--ac);stroke-width:3.2;stroke-linecap:round}
.L-classic .chero .cbt{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.L-classic .chero .pill{position:absolute;left:20px;top:78px;z-index:2}
.L-classic .chero.np{background:var(--bg);color:var(--tx);height:auto;min-height:0;padding:104px 20px 70px;text-align:center}
.L-classic .chero.np .ct{position:relative;left:auto;right:auto;bottom:auto}
.L-classic .chero.np .pill{position:relative;left:auto;top:auto;display:inline-flex;margin-bottom:20px;background:color-mix(in srgb,var(--tx) 85%,transparent)}
.L-classic .chero.np .cbt{justify-content:center}
.L-classic .chero.np .wm{position:absolute;left:0;right:0;top:56%;transform:translateY(-50%);font:600 clamp(80px,30vw,220px)/.8 var(--fh);letter-spacing:-.05em;text-transform:uppercase;text-align:center;white-space:nowrap;color:var(--tx);opacity:.045;pointer-events:none}
.L-classic .chero.np .lg{width:96px;height:96px;margin:0 auto 22px;border-radius:28px;background:var(--sf) center/cover;border:1px solid color-mix(in srgb,var(--tx) 10%,transparent);display:grid;place-items:center;font:600 40px var(--fh);color:var(--ac);box-shadow:0 24px 50px -30px #0008}
.L-classic .chero.np .pb.lt{background:var(--sf);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 14%,transparent)}.L-classic .chero.np .pb.lt i{background:var(--tx);color:var(--bg)}
.L-classic .spin{position:relative;z-index:4;display:block;width:92px;height:92px;margin:-46px auto 0;border-radius:50%;background:var(--tx);color:var(--bg);box-shadow:0 0 0 6px var(--bg)}
.L-classic .spin svg.r{position:absolute;inset:0;animation:bzspin 14s linear infinite}
.L-classic .spin text{font:600 8.6px var(--fn);letter-spacing:.24em;fill:currentColor;text-transform:uppercase}
.L-classic .spin .ar{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.L-classic.static .spin svg.r{animation:none}
@keyframes bzspin{to{transform:rotate(360deg)}}
.L-classic .two{margin:34px 22px 0;font:400 clamp(23px,6.4vw,32px)/1.28 var(--fh);letter-spacing:-.02em;color:color-mix(in srgb,var(--tx) 38%,var(--bg));text-align:center}
.L-classic .two b{font-weight:400;color:var(--tx)}
.L-classic .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:30px 18px 0;border-top:1px solid color-mix(in srgb,var(--tx) 12%,transparent)}
.L-classic .stats div{padding:18px 4px 16px 16px;border-left:1px solid color-mix(in srgb,var(--tx) 12%,transparent);border-bottom:1px solid color-mix(in srgb,var(--tx) 12%,transparent)}
.L-classic .stats div:nth-child(odd){border-left:0;padding-left:4px}
.L-classic .stats b{display:block;font:400 34px/1 var(--fh);letter-spacing:-.03em}
.L-classic .stats span{display:block;margin-top:6px;font:500 12.5px var(--fn);color:var(--mu)}
.L-classic .bento{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:30px 14px 0}
.L-classic .bc{position:relative;border-radius:22px;padding:16px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;background:var(--sf);border:1px solid color-mix(in srgb,var(--tx) 7%,transparent);overflow:hidden;color:var(--tx)}
.L-classic .bc .lb{font:700 10.5px var(--fn);letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.L-classic .bc .lb:before{content:"✦";font-size:12px}
.L-classic .bc b{font:500 18px/1.15 var(--fh);letter-spacing:-.02em;word-break:break-word;padding-right:40px}
.L-classic .bc.full{grid-column:span 2;min-height:110px}
.L-classic .bc .go{position:absolute;right:12px;bottom:12px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--tx) 9%,transparent)}
.L-classic .bc.dk{background:var(--ac);color:var(--on);border-color:transparent}.L-classic .bc.dk .go{background:color-mix(in srgb,var(--on) 22%,transparent)}
.L-classic .bc.tall{grid-row:span 2;padding:0;min-height:310px}
.L-classic .bc.tall img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.L-classic .bc.tall .lb{position:absolute;top:14px;left:14px;z-index:2;padding:7px 11px;border-radius:999px;background:color-mix(in srgb,var(--sf) 86%,transparent);backdrop-filter:blur(10px)}
.L-classic .bc.tall .ni{position:absolute;inset:0;display:grid;place-items:center;font:300 120px var(--fh);color:var(--on);background:var(--ac)}
.L-classic .bc.wide{grid-column:span 2;min-height:170px;align-items:center;text-align:center;justify-content:center;background:var(--sf2)}
.L-classic .bc.wide .tx{position:absolute;inset:-10px;font:italic 400 34px/1.05 var(--fh);color:var(--tx);opacity:.06;word-break:break-all;overflow:hidden;pointer-events:none}
.L-classic .bc.wide b{padding:0;position:relative;font:400 38px/1 var(--fh);letter-spacing:-.03em}
.L-classic .bc.wide .st{position:relative;display:flex;gap:3px;justify-content:center}.L-classic .bc.wide .st svg{fill:#f5b301;stroke:#f5b301}
.L-classic .bc.wide .lb{position:relative;justify-content:center}.L-classic .bc.wide .lb:after{content:"✦";font-size:12px}
.L-classic .h2 b{font:400 30px/1.05 var(--fh);letter-spacing:-.03em}
.L-classic .card{border-radius:22px;box-shadow:none}
.L-classic .tabs{display:inline-flex;margin:0 0 14px;padding:4px;border-radius:999px;background:var(--sf2);max-width:100%;overflow-x:auto}
.L-classic .tabs button{border:0;padding:9px 16px}
.L-classic .tabs button.on{background:var(--tx);color:var(--bg)}
.L-classic .it .n{font:500 16.5px/1.25 var(--fh);letter-spacing:-.01em}
.L-classic .it .dl{display:none}.L-classic .it .r{justify-content:space-between}
.L-classic .it .p{color:var(--tx)}
.L-classic .it .ico{width:46px;height:46px;flex:none;border-radius:14px;display:grid;place-items:center;background:var(--sf2);font:500 18px var(--fh);color:var(--ink)}
.L-classic .it>img{width:46px;height:46px;border-radius:14px}
.L-classic .offer{border-radius:22px;background:var(--tx);color:var(--bg)}
.L-classic .offer b{font:400 30px/1.05 var(--fh);letter-spacing:-.02em}
.L-classic .offer .till{background:var(--ac);color:var(--on)}
.L-classic .feat img{width:100%;aspect-ratio:16/10;object-fit:cover}
.L-classic .feat .fx{padding:22px}
.L-classic .feat h3{font:400 30px/1.05 var(--fh);letter-spacing:-.03em}
.L-classic .gal img{width:68%;aspect-ratio:3/4;border-radius:20px;box-shadow:none}
.L-classic .rev b{font:500 20px/1.15 var(--fh)}
.L-classic .btn{background:var(--tx);color:var(--bg)}
.L-classic .cfoot{margin-top:46px;background:var(--tx);color:var(--bg);padding:40px 22px 0;border-radius:28px 28px 0 0;overflow:hidden}
.L-classic .cfoot .fn{font:600 22px var(--fh);letter-spacing:-.02em}
.L-classic .cfoot p{margin:8px 0 0;font:400 14px/1.5 var(--fn);opacity:.7;max-width:320px}
.L-classic .cfoot .so{display:flex;gap:10px;margin:22px 0}
.L-classic .cfoot .so a{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--bg) 12%,transparent)}
.L-classic .cfoot .mk{font:500 12.5px var(--fn);opacity:.7}.L-classic .cfoot .mk a{border-bottom:1px solid currentColor}
.L-classic .cfoot .big{font:600 clamp(90px,34vw,240px)/.74 var(--fh);letter-spacing:-.06em;margin:26px -6px -0.04em;opacity:.16;white-space:nowrap;text-transform:capitalize}

/* ---------- Poster (cafés, food, fashion) ---------- */
.L-poster{--fh:'Archivo Black','Arial Black',sans-serif;--fsc:'Pinyon Script',cursive}
.L-poster .ph{font:400 30px var(--fh);color:#fff8}
.L-poster .hero{position:relative;height:min(88svh,760px);min-height:560px;overflow:hidden;background:var(--sf2)}
.L-poster .hero .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.L-poster .hero .sh{position:absolute;inset:0;background:linear-gradient(180deg,#0007 0%,#0000 24%,#0000 52%,#000a 100%)}
.L-poster .brand{font:400 19px var(--fh);color:#fff;letter-spacing:-.01em;text-shadow:0 2px 12px #0006}
.L-poster .top .r{display:flex;gap:8px}
.L-poster .big{position:absolute;left:0;right:0;z-index:2;color:#fff;text-transform:uppercase;font:400 clamp(58px,18.5vw,132px)/.86 var(--fh);letter-spacing:-.03em;text-shadow:0 8px 40px #0005;padding:0 14px;overflow-wrap:anywhere}
.L-poster .w1{top:21%}
.L-poster .w2{top:47%;text-align:right}
.L-poster .scr{position:absolute;right:20px;top:calc(47% + clamp(56px,17vw,120px));z-index:2;font:400 clamp(40px,12vw,64px)/1 var(--fsc);color:#fff;text-shadow:0 4px 20px #0007}
.L-poster .hero .foot1{position:absolute;left:18px;right:18px;bottom:22px;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;color:#fff}
.L-poster .hero .foot1 p{margin:0;font:500 13px/1.4 var(--fn);opacity:.9;max-width:62%}
.L-poster .hero .foot1 .btn{background:#fff;color:#111}
.L-poster .id{display:flex;gap:14px;align-items:center;padding:24px 18px 0}
.L-poster .logo{width:64px;height:64px;margin:0;border:0;font-size:26px;flex:none;box-shadow:none;background-color:var(--sf2)}
.L-poster h1{margin:0;font:400 26px/1.05 var(--fh);letter-spacing:-.01em;text-transform:uppercase}
.L-poster .tag{font:400 15px/1.5 var(--fn);font-style:normal;color:var(--mu);margin:14px 18px 0;max-width:none}
.L-poster .acts{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:18px 18px 4px}
.L-poster .acts::-webkit-scrollbar{display:none}
.L-poster .act{flex-direction:row;gap:8px;flex:none;padding:11px 16px 11px 12px;border-radius:999px;background:var(--sf2);color:var(--tx);font:700 13px var(--fn)}
.L-poster .act span{width:auto;height:auto;background:none;border:0;box-shadow:none;border-radius:0;color:inherit}
.L-poster .act span svg{width:18px;height:18px}
.L-poster .act.pr{background:var(--ac);color:var(--on)}
.L-poster .act.pr span{background:none;color:inherit}
.L-poster .mh{display:flex;align-items:flex-end;justify-content:space-between;margin:0 2px 16px}
.L-poster .mh b{display:block;font:400 42px/.9 var(--fh);color:var(--tx);letter-spacing:-.02em}
.L-poster .mh i{display:block;margin:2px 0 0 34px;font:400 30px/1 var(--fsc);color:var(--ink)}
.L-poster .mh small{font:700 11px var(--fn);letter-spacing:.18em;text-transform:uppercase;color:var(--mu)}
.L-poster .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -18px 16px;padding:0 18px}
.L-poster .chips::-webkit-scrollbar{display:none}
.L-poster .chips button{flex:none;padding:10px 18px;border-radius:999px;border:0;background:var(--ac);color:var(--on);font:700 13px var(--fn);cursor:pointer;opacity:.8}
.L-poster .chips button.on{background:var(--tx);color:var(--bg);opacity:1}
.L-poster .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.L-poster .pc{background:var(--sf2);padding:8px 8px 12px;display:flex;flex-direction:column;border-radius:6px}
.L-poster .pc .im{position:relative;aspect-ratio:1;background:var(--sf);overflow:hidden;border-radius:3px}
.L-poster .pc .im img{width:100%;height:100%;object-fit:cover;display:block}
.L-poster .pc .im .ni{position:absolute;inset:0;display:grid;place-items:center;font:400 56px var(--fh);color:var(--ink);background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--ac) 22%,transparent),transparent 65%),var(--sf)}
.L-poster .pc .bs{position:absolute;left:6px;top:6px;margin:0;background:var(--tx);color:var(--bg)}
.L-poster .pc b{display:block;margin:10px 2px 2px;font:800 14px/1.25 var(--fn);color:var(--tx)}
.L-poster .pc p{margin:0 2px;font:400 11.5px/1.35 var(--fn);color:var(--mu);flex:1}
.L-poster .pc .rw{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:10px 2px 0;min-height:32px}
.L-poster .pc .rw .p{font:800 15px var(--fn);color:var(--tx)}
.L-poster .pc .q button{width:30px;height:30px}
.L-poster .feat{margin:0;border-radius:0;padding:34px 20px 0;display:block;position:relative}
.L-poster .feat .ww{font:400 clamp(64px,22vw,120px)/.82 var(--fh);letter-spacing:-.03em;text-transform:lowercase}
.L-poster .feat .ww span{display:block;color:#fff}
.L-poster .feat .ww em{font-style:normal;color:var(--hit)}
.L-poster .feat .sc2{position:absolute;right:22px;top:46px;font:400 30px var(--fsc);color:var(--hit);opacity:.8}
.L-poster .feat h3{font:400 24px/1.1 var(--fh);margin:20px 0 8px}
.L-poster .feat .pr b{font:400 40px var(--fh)}
.L-poster .feat img{display:block;width:calc(100% + 40px);margin:22px -20px 0;aspect-ratio:4/3;object-fit:cover}
.L-poster .feat .pad{height:30px}
.L-poster .offer{border-radius:6px;background:var(--tx);color:var(--bg)}
.L-poster .offer b{font:400 30px/1.05 var(--fh);text-transform:uppercase}
.L-poster .offer .till{background:var(--ac);color:var(--on)}
.L-poster .card{border-radius:8px}
.L-poster .h2 b{font:400 28px/1 var(--fh);text-transform:uppercase;letter-spacing:-.01em}
.L-poster .gal img{border-radius:6px}
.L-poster .rev b{font:400 19px/1.15 var(--fh)}
.L-poster .btn{border-radius:999px}

/* ---------- Botanical (salons, spas, florists, wellness) ---------- */
.L-botanical{--fh:'Playfair Display',Georgia,serif;--fn:'DM Sans',system-ui,sans-serif}
.L-botanical .ann{background:var(--tx);color:var(--bg);text-align:center;padding:9px 16px;font:600 11.5px var(--fn);letter-spacing:.06em}
.L-botanical .hd{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;padding:12px 14px;border-bottom:1px solid color-mix(in srgb,var(--tx) 10%,transparent)}
.L-botanical .hd b{text-align:center;font:600 22px/1.1 var(--fh);letter-spacing:-.01em}
.L-botanical .hd .ibtn{background:none;color:var(--tx);backdrop-filter:none}
.L-botanical .hero{position:relative;height:min(74svh,640px);min-height:470px;overflow:hidden;background:var(--sf2)}
.L-botanical .hero .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.L-botanical .hero .pill{position:absolute;top:14px;left:14px;z-index:2}
.L-botanical .hcard{position:absolute;left:14px;right:14px;bottom:44px;z-index:2;background:var(--sf);color:var(--tx);border-radius:14px;padding:20px;box-shadow:0 20px 50px -20px #0007;max-width:360px}
.L-botanical .hcard h1{margin:0 0 8px;font:600 30px/1.08 var(--fh);letter-spacing:-.01em}
.L-botanical .hcard p{margin:0 0 14px;font:400 13.5px/1.5 var(--fn);color:var(--mu)}
.L-botanical .btn{background:var(--ac);color:var(--on);padding:11px 18px;font:700 11.5px var(--fn);letter-spacing:.14em;text-transform:uppercase;border-radius:6px}
.L-botanical .wave{display:block;width:100%;height:74px;margin-top:-38px;position:relative;z-index:3}
.L-botanical .wave text{font:600 14px var(--fn);fill:var(--tx);letter-spacing:.02em}
.L-botanical .wave .ln{fill:none;stroke:var(--tx);stroke-width:1.2}
.L-botanical .wave .fl{fill:var(--bg)}
.L-botanical .id{text-align:center;padding:14px 22px 0}
.L-botanical .id h2{margin:12px 0 6px;font:600 34px/1.05 var(--fh)}
.L-botanical .logo{width:84px;height:84px;font-size:34px}
.L-botanical .tag{font:italic 500 17px/1.45 var(--fh)}
.L-botanical .acts .act span{border-radius:50%;background:transparent;box-shadow:none;border:1.2px solid color-mix(in srgb,var(--tx) 35%,transparent)}
.L-botanical .acts .act.pr span{background:var(--ac);border-color:var(--ac)}
.L-botanical .ctr{text-align:center;font:600 30px/1.1 var(--fh);margin:0 0 18px}
.L-botanical .arches{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -18px;padding:6px 18px 4px;scrollbar-width:none}
.L-botanical .arches::-webkit-scrollbar{display:none}
.L-botanical .ar{flex:none;width:62%;scroll-snap-align:center;text-align:center;position:relative}
.L-botanical .ar .im{aspect-ratio:3/4;border-radius:999px 999px 18px 18px;overflow:hidden;background:var(--sf2)}
.L-botanical .ar .im img{width:100%;height:100%;object-fit:cover;display:block}
.L-botanical .ar .im .ni{width:100%;height:100%;display:grid;place-items:center;font:500 64px var(--fh);color:var(--ink);background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--ac) 25%,transparent),transparent 70%),var(--sf2)}
.L-botanical .ar .bd{position:absolute;top:-4px;right:-2px;width:72px;height:72px;border-radius:50%;background:var(--hi);color:var(--hit);display:grid;place-items:center;text-align:center;font:600 10.5px/1.2 var(--fn);padding:8px;box-shadow:0 8px 20px -10px #0006}
.L-botanical .ar b{display:block;margin:14px 0 4px;font:600 12.5px var(--fn);letter-spacing:.14em;text-transform:uppercase}
.L-botanical .ar .p{font:500 14px var(--fn);color:var(--mu)}
.L-botanical .ar .q{margin-top:10px}
.L-botanical .feat{grid-template-columns:1fr;border-radius:16px;background:none;gap:10px;color:var(--tx)}
.L-botanical .feat img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px}
.L-botanical .feat .fx{background:var(--ac);color:var(--on);border-radius:16px;padding:30px 22px;text-align:center}
.L-botanical .feat h3{font:600 30px/1.1 var(--fh)}
.L-botanical .feat .pr{justify-content:center}
.L-botanical .feat .btn{background:var(--on);color:var(--ink);margin-top:14px}
.L-botanical .h2{justify-content:center;flex-direction:column;align-items:center;gap:4px;text-align:center}
.L-botanical .h2 b{font:600 30px/1.1 var(--fh)}
.L-botanical .card{border-radius:14px;box-shadow:none}
.L-botanical .tabs{justify-content:safe center}
.L-botanical .tabs button{border-radius:6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.L-botanical .it .n{font:500 18px/1.25 var(--fh)}
.L-botanical .offer{border-radius:14px;background:var(--hi);color:var(--hit);text-align:center}
.L-botanical .offer b{font:600 30px/1.1 var(--fh)}
.L-botanical .gal img{border-radius:16px;width:64%}
.L-botanical .gal img:nth-child(3n+2){border-radius:999px}
.L-botanical .gal img:nth-child(3n+3){border-radius:999px 999px 16px 16px}

/* ---------- Bold (gyms, studios, services) ---------- */
.L-bold{--fh:'Anton',Impact,sans-serif;--dk:#121210}
.L-bold.dk{--dk:var(--sf)}
.L-bold .tb{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;background:var(--p1);color:#1d1c14}
.L-bold .tb b{font:400 22px/1 var(--fh);text-transform:uppercase;letter-spacing:.01em}
.L-bold .tb .ibtn{background:#1d1c1418;color:#1d1c14;backdrop-filter:none}
.L-bold .tb .ibtn em{background:#1d1c14;color:var(--p1)}
.L-bold .strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:16px 16px 0}
.L-bold .strip div{aspect-ratio:3/4;border-radius:4px;overflow:hidden;background:var(--sf2)}
.L-bold .strip img{width:100%;height:100%;object-fit:cover;display:block}
.L-bold .strip.one{grid-template-columns:1fr}.L-bold .strip.one div{aspect-ratio:4/3}
.L-bold .hx{text-align:center;padding:22px 18px 6px}
.L-bold .hx small{display:block;font:700 11px var(--fn);letter-spacing:.2em;text-transform:uppercase;color:var(--mu)}
.L-bold .hx h1{margin:12px auto 0;max-width:470px;font:400 clamp(38px,11.5vw,62px)/1.14 var(--fh);text-transform:uppercase;letter-spacing:.005em}
.L-bold mark{background:var(--p1);color:#1d1c14;padding:0 .12em;border-radius:4px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.L-bold .hx .nm{margin:14px 0 0;font:600 14px var(--fn);color:var(--mu)}
.L-bold .hx .btn{margin-top:18px;background:var(--p2);color:#1d1c14;border-radius:999px;border:1.5px solid #1d1c1430}
.L-bold .acts .act span{border-radius:14px}
.L-bold .svc{position:relative;background:var(--dk);color:#f3f1e6;margin-top:30px;padding:0 0 30px;overflow:hidden}
.L-bold .svc .gw{font:400 var(--gs,25vw)/1 var(--fh);text-transform:uppercase;color:#efeee0;text-align:center;letter-spacing:-.01em;white-space:nowrap;padding:18px 0 0}
.L-bold .cards{position:relative;margin-top:calc(var(--gs,25vw) * -.42);padding:0 14px;display:grid;gap:14px}
.L-bold .sc{border-radius:22px;padding:16px;color:#1d1c14;box-shadow:0 30px 50px -30px #000}
.L-bold .sc .ph2{position:relative;aspect-ratio:16/10;border-radius:16px;overflow:hidden;background:#1d1c1422;margin-bottom:14px}
.L-bold .sc .ph2 img{width:100%;height:100%;object-fit:cover;display:block}
.L-bold .sc .st{position:absolute;top:10px;right:10px;padding:5px 10px;border-radius:999px;background:var(--p1);color:#1d1c14;font:800 10px var(--fn);letter-spacing:.1em;text-transform:uppercase;border:1px solid #1d1c1430}
.L-bold .sc h3{margin:2px 0 10px;font:400 34px/.95 var(--fh);text-transform:uppercase}
.L-bold .sc h3 small{display:block;margin-top:8px;font:800 10.5px var(--fn);letter-spacing:.12em;opacity:.7}
.L-bold .row{border-top:1.5px solid #1d1c1433}
.L-bold .row>button{width:100%;display:flex;align-items:center;gap:10px;padding:12px 2px;background:none;border:0;color:inherit;text-align:left;cursor:pointer;font:700 14px var(--fn)}
.L-bold .row>button span{flex:1}
.L-bold .row>button i{font-style:normal;font-weight:800}
.L-bold .row>button svg{transition:transform .2s}
.L-bold .row.op>button svg{transform:rotate(45deg)}
.L-bold .row .dd{padding:0 2px 12px;font:400 13.5px/1.45 var(--fn);display:none}
.L-bold .row.op .dd{display:flex;gap:10px;align-items:center;justify-content:space-between}
.L-bold .row .q button{background:#1d1c14;color:var(--p1)}.L-bold .row .q button.m{background:#1d1c1418;color:#1d1c14}
.L-bold .feat{border-radius:22px;background:var(--hi);color:var(--hit);grid-template-columns:1fr;border:2px solid color-mix(in srgb,var(--tx) 14%,transparent)}
.L-bold .feat img{width:100%;aspect-ratio:16/10;object-fit:cover}
.L-bold .feat .fx{padding:20px}
.L-bold .feat h3{font:400 36px/1 var(--fh);text-transform:uppercase}
.L-bold .h2 b{font:400 34px/1 var(--fh);text-transform:uppercase}
.L-bold .offer{border-radius:22px;background:var(--p1);color:#1d1c14}
.L-bold .offer b{font:400 34px/1 var(--fh);text-transform:uppercase}
.L-bold .card{border-radius:20px}
.L-bold .rev b{font:400 24px/1.05 var(--fh);text-transform:uppercase}
.L-bold .gal img{border-radius:14px}
/* ===== Pop: playful blobs, chunky type, stickers ===== */
@keyframes bzmq{to{transform:translateX(-50%)}}
.L-pop{--fh:'Archivo Black','Arial Black',system-ui,sans-serif;--fn:'Bricolage Grotesque','Inter',system-ui,sans-serif;overflow:clip}
.L-pop .tk{background:var(--ink);color:var(--bg);overflow:hidden;padding:8px 0;font:700 11.5px var(--fn);letter-spacing:.08em;text-transform:uppercase}
.L-pop .tk div{display:flex;gap:16px;width:max-content;white-space:nowrap}
.L-pop.anim .tk div{animation:bzmq 40s linear infinite}
.L-pop .tk i{font-style:normal;color:var(--p1)}
.L-pop .ftop{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:640px;margin:0 auto;padding:12px 16px}
.L-pop .ftop .nm{font:800 15px var(--fn);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.L-pop .ftop .r{display:flex;gap:8px}
.L-pop .ibtn{background:var(--sf);color:var(--ink);border:2px solid var(--ink);backdrop-filter:none}
.L-pop .fh{max-width:640px;margin:0 auto;padding:4px 14px 0;text-align:center}
.L-pop .fx{margin:0;font:400 calc(min(100vw,640px) * 1.32 / var(--n)) / .92 var(--fh);font-size:min(calc(min(100vw,640px) * 1.32 / var(--n)),124px);letter-spacing:-.01em;text-transform:uppercase;color:var(--ink);
  text-shadow:1px 1px 0 var(--sf),2px 2px 0 var(--sf),3px 3px 0 var(--sf),4px 4px 0 var(--sf),5px 5px 0 var(--sf),6px 6px 0 var(--sf),7px 7px 0 var(--ink),1px 1px 0 var(--ink)}
.L-pop .fx span{display:block;white-space:nowrap}
.L-pop.dk .fx,.L-pop.dk .gn a,.L-pop.dk .ss b{color:var(--tx);text-shadow:1px 1px 0 var(--bg),2px 2px 0 var(--bg),3px 3px 0 var(--bg),4px 4px 0 var(--ac),5px 5px 0 var(--ac)}.L-pop.dk .tk{background:var(--ac);color:var(--on)}
.L-pop.anim .fx span{animation:bzfx .8s cubic-bezier(.2,.9,.2,1.2) both}.L-pop.anim .fx span:nth-child(2){animation-delay:.08s}.L-pop.anim .fx span:nth-child(3){animation-delay:.16s}
@keyframes bzfx{from{opacity:0;transform:translateY(30px) scale(.94)}}
.L-pop .sks{display:flex;flex-wrap:wrap;justify-content:center;gap:2px 0;margin:22px auto 0;max-width:420px}
.L-pop .sk{display:inline-block;padding:4px 14px 6px;border-radius:14px;font:400 clamp(24px,8vw,40px)/1.05 var(--fh);text-transform:uppercase;letter-spacing:.01em;box-shadow:0 0 0 2.5px var(--bg);white-space:nowrap}
.L-pop .sks .sk{margin:0 -3px}
.L-pop.anim .sks .sk{animation:bzsk .6s cubic-bezier(.3,1.6,.5,1) both .25s}.L-pop.anim .sks .sk:nth-child(2){animation-delay:.35s}.L-pop.anim .sks .sk:nth-child(3){animation-delay:.45s}.L-pop.anim .sks .sk:nth-child(4){animation-delay:.55s}
@keyframes bzsk{from{opacity:0;scale:.4}}
.L-pop .sksub{margin:12px 0 0;font:800 12px var(--fn);letter-spacing:.16em;text-transform:uppercase;color:var(--ink)}
.L-pop .ctas{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:22px}
.L-pop .btn{background:var(--ink);color:var(--bg);font:700 15px var(--fn);padding:14px 24px;box-shadow:4px 4px 0 var(--p1)}
.L-pop .btn.ot{background:var(--sf);color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}
.L-pop .hz{position:relative;max-width:640px;margin:30px auto 0;height:min(116vw,560px)}
.L-pop .hz .wv{position:absolute;left:-20%;right:-20%;top:34%;bottom:0;background:var(--p1);border-radius:50% 50% 0 0 / 30% 70% 0 0;transform:rotate(-6deg);transform-origin:center}
.L-pop .ar{position:absolute;overflow:hidden;background:var(--p2);border-radius:999px 999px 26px 26px;box-shadow:0 30px 50px -30px #0008}
.L-pop .ar img{width:100%;height:100%;object-fit:cover}
.L-pop .ar .ni{position:absolute;inset:0;display:grid;place-items:center;font:400 30vw var(--fh);color:var(--ink);opacity:.3}
.L-pop .ar.a1{left:6%;width:52%;top:16%;bottom:2%;transform:rotate(-5deg)}
.L-pop .ar.a2{right:5%;width:46%;top:2%;bottom:16%;transform:rotate(4deg);background:var(--p3)}
.L-pop .ar.a1:only-of-type{left:14%;right:14%;width:auto}
.L-pop .hz .pill{position:absolute;left:6%;top:4%;z-index:3;background:var(--sf);color:var(--ink);box-shadow:0 8px 20px -10px #0007}
.L-pop .rg{position:absolute;right:2%;bottom:6%;z-index:3;width:108px;height:108px;border-radius:50%;background:var(--hi);color:var(--hit);display:grid;place-items:center;box-shadow:0 14px 28px -14px #000a}
.L-pop .rg>svg{position:absolute;inset:0;width:100%;height:100%}
.L-pop.anim .rg>svg{animation:bzspin 14s linear infinite}
@keyframes bzspin{to{transform:rotate(360deg)}}
.L-pop .rg text{font:800 9.5px var(--fn);letter-spacing:.08em;fill:currentColor}
.L-pop .rg span{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--bg)}
.L-pop .fa{display:flex;justify-content:center;gap:8px;margin:22px 14px 0;flex-wrap:wrap}
.L-pop .fa a{flex:1;min-width:70px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:18px;background:var(--sf);border:2px solid var(--ink);color:var(--ink);font:700 12.5px var(--fn)}
.L-pop .sh{display:flex;flex-wrap:wrap;justify-content:center;gap:0;margin:6px 0 0;text-align:center}
.L-pop .sh .sk{font-size:clamp(26px,8.6vw,40px);margin:0 -3px}
.L-pop .shs{margin:12px 0 18px;text-align:center;font:700 17px var(--fn);color:var(--ink)}
.L-pop .tl{padding-top:44px}
.L-pop .tg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,44%);gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 -18px;padding:4px 18px 8px;scroll-snap-type:x mandatory}
.L-pop .tg::-webkit-scrollbar{display:none}
.L-pop .tg a{position:relative;display:block;aspect-ratio:4/5;border-radius:20px;overflow:hidden;padding:16px 14px;scroll-snap-align:start;cursor:pointer;transition:transform .2s}
.L-pop .tg a:active{transform:scale(.97)}
.L-pop .tg b{position:relative;z-index:1;display:block;font:400 clamp(15px,4.8vw,21px)/1.02 var(--fh);text-transform:uppercase;max-width:94%;overflow-wrap:break-word;hyphens:auto}
.L-pop .tg small{position:absolute;left:14px;bottom:14px;z-index:1;font:700 12.5px var(--fn)}
.L-pop .tg .ta{position:absolute;right:-6%;bottom:-4%;width:66%;height:62%;border-radius:999px 999px 0 0;overflow:hidden;background:#0001}
.L-pop .tg .ta img{width:100%;height:100%;object-fit:cover}
.L-pop #bz-menu{padding-top:44px}
.L-pop #bz-menu .sh{margin-bottom:18px}
.L-pop .chips2{position:sticky;top:0;z-index:4;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -18px 14px;padding:10px 18px;background:var(--bg)}
.L-pop .chips2::-webkit-scrollbar{display:none}
.L-pop .chips2 button{flex:none;padding:9px 16px;border-radius:999px;border:2px solid var(--ink);background:var(--sf);color:var(--ink);font:700 13px var(--fn);cursor:pointer}
.L-pop .chips2 button.on{background:var(--ink);color:var(--bg)}
.L-pop .fg{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px}
.L-pop .fc{position:relative;display:flex;flex-direction:column;border-radius:22px;background:var(--sf);border:2px solid var(--ink);overflow:hidden}
.L-pop .fc .im{position:relative;aspect-ratio:1;overflow:hidden;background:var(--sf2)}
.L-pop .fc .im img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.L-pop .fc:hover .im img{transform:scale(1.05)}
.L-pop .fc .im .ni{position:absolute;inset:0;display:grid;place-items:center;font:400 64px var(--fh)}
.L-pop .fc .tgs{position:absolute;left:8px;top:8px;z-index:2;display:flex;gap:5px;flex-wrap:wrap}
.L-pop .fc .tgs em{padding:4px 9px;border-radius:999px;background:var(--ink);color:var(--bg);font:700 10.5px var(--fn);font-style:normal;letter-spacing:.02em}
.L-pop .fc .tgs em.nw{background:var(--sf);color:var(--ink)}
.L-pop .fc .lb{display:flex;flex-direction:column;flex:1;padding:11px 12px 12px;border-top:2px solid var(--ink)}
.L-pop .fc .lb b{font:400 14.5px/1.1 var(--fh);text-transform:uppercase;color:var(--ink);overflow-wrap:anywhere}
.L-pop .fc .lb p{margin:5px 0 0;font:500 12px/1.35 var(--fn);color:var(--mu);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.L-pop .fc .pq{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:auto;padding-top:10px}
.L-pop .fc .p{display:inline-block;padding:4px 10px;border-radius:999px;background:var(--p2);color:var(--ink);font:800 13.5px var(--fn)}
.L-pop .fc .q button{width:32px;height:32px;background:var(--ink);color:var(--bg)}
.L-pop .fc .q button.m{background:var(--sf2);color:var(--ink)}
.L-pop .fc .sold{background:var(--sf2)}
.L-pop .fo{position:relative;padding:26px 22px 24px;border-radius:26px;background:var(--p3);text-align:left;overflow:hidden;border:2px solid var(--ink)}
.L-pop .fo b{display:block;margin:16px 0 8px;font:400 clamp(28px,8.4vw,40px)/1 var(--fh);text-transform:uppercase}
.L-pop .fo p{margin:0;font:600 15px/1.45 var(--fn);opacity:.95}
.L-pop .fo .till{display:inline-block;margin-top:14px;padding:6px 12px;border-radius:999px;background:#0003;font:700 12px var(--fn)}
.L-pop .fo .sk{font-size:15px;padding:5px 12px;border-radius:10px;box-shadow:none}
.L-pop .om{margin:26px 0 0;padding:12px 0;background:var(--hi);color:var(--hit);overflow:hidden;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.L-pop .om div{display:flex;align-items:center;gap:20px;width:max-content;white-space:nowrap;font:400 26px/1 var(--fh);text-transform:uppercase}
.L-pop.anim .om div{animation:bzmq 34s linear infinite}
.L-pop .om i{display:grid;place-items:center;font-style:normal}
.L-pop .ss{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:18px 6px;border-top:2px dashed color-mix(in srgb,var(--ink) 30%,transparent);border-bottom:2px dashed color-mix(in srgb,var(--ink) 30%,transparent);text-align:center}
.L-pop .ss b{display:block;font:400 clamp(24px,7vw,34px)/1 var(--fh);color:var(--ink);text-shadow:1px 1px 0 var(--sf),2px 2px 0 var(--sf),3px 3px 0 var(--ink)}
.L-pop .ss small{display:block;margin-top:6px;font:700 12px var(--fn);color:var(--mu)}
.L-pop .qt{position:relative;padding:30px 24px 26px;border-radius:26px;background:var(--ink);color:var(--bg)}
.L-pop .qt .qm{display:block;height:44px;font:400 90px/1 var(--fh);color:var(--hi)}
.L-pop .qt p{margin:6px 0 16px;font:700 clamp(20px,5.8vw,26px)/1.3 var(--fn)}
.L-pop .qt small{font:600 13px var(--fn);opacity:.75}
.L-pop .ff{position:relative;display:grid;gap:16px;padding:16px;border-radius:26px;background:var(--sf);border:2px solid var(--ink)}
.L-pop .ff .fi{aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:var(--p2)}
.L-pop .ff .fi img{width:100%;height:100%;object-fit:cover}
.L-pop .ff .ft{padding:0 6px 6px}
.L-pop .ff small{display:inline-block;padding:4px 10px;border-radius:999px;background:var(--ink);color:var(--bg);font:700 11px var(--fn);letter-spacing:.06em;text-transform:uppercase}
.L-pop .ff h3{margin:10px 0 6px;font:400 30px/1 var(--fh);text-transform:uppercase;color:var(--ink)}
.L-pop .ff p{margin:0;color:var(--mu);font:500 14.5px/1.5 var(--fn)}
.L-pop .ff .pr{margin-top:12px;display:flex;align-items:baseline;gap:10px}.L-pop .ff .pr b{font:400 30px var(--fh);color:var(--ink)}.L-pop .ff .pr s{color:var(--mu);font-weight:600}
.L-pop .ff .off{position:absolute;right:26px;top:26px;width:84px;height:84px;border-radius:50%;background:var(--hi);color:var(--hit);display:grid;place-items:center;align-content:center;font:400 24px/.9 var(--fh);transform:rotate(-12deg);border:2px solid var(--ink)}
.L-pop .ff .off small{background:none;color:inherit;padding:0;font:700 11px var(--fn)}
.L-pop .gs{max-width:none;padding:44px 0 0}
.L-pop .gh{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px;flex-wrap:wrap}
.L-pop .gh .sk{font-size:16px;padding:5px 12px;border-radius:10px;box-shadow:none}
.L-pop .gh a{display:inline-flex;align-items:center;gap:6px;font:800 22px var(--fn);color:var(--ink)}
.L-pop .gr{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,40%);gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 8px}
.L-pop .gr::-webkit-scrollbar{display:none}
.L-pop .gr img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:16px}
.L-pop .gr img:nth-child(odd){border-radius:999px 999px 16px 16px}
.L-pop .gn{position:relative;max-width:640px;margin:44px auto 0;padding:0 10px}
.L-pop .gn a{position:relative;z-index:1;display:block;text-align:center;font:400 clamp(60px,19vw,120px)/.86 var(--fh);text-transform:uppercase;color:var(--ink);letter-spacing:-.02em;text-shadow:1px 1px 0 var(--sf),2px 2px 0 var(--sf),3px 3px 0 var(--sf),4px 4px 0 var(--sf),5px 5px 0 var(--ink)}
.L-pop .gn{padding-top:64px}.L-pop .gn .rg{right:6%;bottom:auto;top:0;width:86px;height:86px;transform:rotate(-8deg)}
@media (min-width:640px){.L-pop .fg{grid-template-columns:1fr 1fr}.L-pop .tg{grid-auto-columns:minmax(160px,32%)}}
.L-label{--fh:'Inter Tight','Inter',system-ui,sans-serif;--fn:'Inter',system-ui,sans-serif;overflow:clip}
.L-label .an{background:var(--tx);color:var(--bg);text-align:center;padding:8px 14px;font:600 12px var(--fn);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.L-label .ln{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:760px;margin:0 auto;padding:12px 14px}
.L-label .ln .nm{display:flex;align-items:center;gap:8px;font:700 16px var(--fh);letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.L-label .ln .nm i{width:26px;height:26px;border-radius:50%;background:center/cover;flex:none}
.L-label .ln .r{display:flex;gap:8px}
.L-label .ibtn{background:var(--sf);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 14%,transparent);backdrop-filter:none}
.L-label .lh{position:relative;max-width:760px;margin:0 auto;padding:0 8px}
.L-label .lh .ph{position:relative;height:min(122vw,620px);border-radius:28px;overflow:hidden;background:var(--sf2)}
.L-label .lh .ph img{width:100%;height:100%;object-fit:cover}
.L-label .sh{position:absolute;inset:0;background:linear-gradient(#0006,transparent 32%,transparent 60%,#0004)}
.L-label .lh .tl{position:absolute;left:16px;top:16px;right:46%}.L-label .lh .tl .pill{position:static}
.L-label .lh .tl p{margin:0;color:#fff;font:500 12.5px/1.45 var(--fn);text-shadow:0 1px 8px #0008}
.L-label .lh .tr{position:absolute;right:14px;top:14px}
.L-label .btn{background:var(--tx);color:var(--hi);font:700 13px var(--fn);letter-spacing:.02em;text-transform:uppercase;padding:12px 18px}
.L-label .gx{position:absolute;left:4px;right:4px;bottom:28px;margin:0;font:800 clamp(80px,34vw,230px)/.78 var(--fh);letter-spacing:-.075em;color:var(--hi);text-align:center;pointer-events:none}
.L-label .gx span{display:block;white-space:nowrap;padding:0 .04em}
.L-label.anim .gx span{animation:bzgx 1s cubic-bezier(.2,.9,.2,1) both}
@keyframes bzgx{from{opacity:0;transform:translateY(40%)}}
.L-label .rg{position:absolute;z-index:3;width:92px;height:92px;border-radius:50%;background:var(--tx);color:var(--hi);display:grid;place-items:center}
.L-label .rg>svg{position:absolute;inset:0;width:100%;height:100%}
.L-label.anim .rg>svg{animation:bzspin 14s linear infinite}
.L-label .rg text{font:700 9.5px var(--fn);letter-spacing:.08em;fill:currentColor}
.L-label .rg span{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--hi);color:var(--tx)}
.L-label .rg.hb{left:20px;bottom:70px}
.L-label .lm{display:flex;justify-content:space-between;max-width:760px;margin:0 auto;padding:10px 18px 0;font:700 11px var(--fn);letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.L-label .hd{position:relative;padding:44px 22px 0}
.L-label .hd h2{margin:0;font:700 clamp(40px,12vw,64px)/.98 var(--fh);letter-spacing:-.045em}
.L-label .hd .dg{position:absolute;right:18px;bottom:-8px;transform:rotate(45deg);color:var(--tx)}
.L-label .hd p{margin:18px 60px 0 0;font:500 14.5px/1.5 var(--fn);color:var(--mu)}
.L-label .la{display:flex;gap:8px;flex-wrap:wrap;padding:22px 18px 0}
.L-label .la a{display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:999px;background:var(--sf);border:1px solid color-mix(in srgb,var(--tx) 14%,transparent);font:600 13.5px var(--fn)}
.L-label .cs{max-width:760px;margin:34px auto 0}
.L-label .cr{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(168px,48%);gap:12px;overflow-x:auto;scrollbar-width:none;padding:0 14px 34px;scroll-snap-type:x mandatory;align-items:start}
.L-label .cr::-webkit-scrollbar{display:none}
.L-label .cc{position:relative;display:block;aspect-ratio:3/4;border-radius:24px;overflow:hidden;background:var(--sf2);scroll-snap-align:start}
.L-label .cc:nth-child(even){margin-top:34px}
.L-label .cc img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.L-label .cc:hover img{transform:scale(1.05)}
.L-label .cc:after{content:"";position:absolute;inset:50% 0 0;background:linear-gradient(transparent,#0009)}
.L-label .nt{position:absolute;right:0;top:0;z-index:2;width:62px;height:62px;padding:0 0 8px 8px;background:var(--bg);border-bottom-left-radius:24px}
.L-label .nt:before,.L-label .nt:after{content:"";position:absolute;width:24px;height:24px;background:radial-gradient(circle at 0 100%,transparent 23px,var(--bg) 24px)}
.L-label .nt:before{left:-24px;top:0}.L-label .nt:after{right:0;bottom:-24px}
.L-label .nt i{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--tx) 30%,transparent);color:var(--tx);transform:rotate(-45deg)}
.L-label .cc.hi .nt i{background:var(--hi);border-color:var(--hi);color:var(--hit)}
.L-label .cl{position:absolute;left:14px;right:14px;bottom:14px;z-index:1;color:#fff}
.L-label .cl small{display:inline-block;padding:3px 9px;border-radius:999px;background:#fff;color:#141414;font:600 10.5px var(--fn)}
.L-label .cl b{display:block;margin-top:6px;font:600 16px/1.2 var(--fh)}
.L-label .bn{display:grid;grid-template-columns:1.25fr 1fr;gap:10px;padding:10px 14px 0}
.L-label .bn a,.L-label .bn .b2{position:relative;display:block;border-radius:24px;overflow:hidden}
.L-label .b1{min-height:300px;background:var(--sf2)}
.L-label .b1 img,.L-label .b3 img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.L-label .b1 p{position:absolute;left:14px;right:14px;bottom:14px;margin:0;color:#fff;font:500 12.5px/1.4 var(--fn);text-shadow:0 1px 10px #000a}
.L-label .bc{display:grid;grid-template-rows:auto 1fr;gap:10px}
.L-label .b2{padding:16px;background:var(--hi);color:var(--hit)}
.L-label .b2 .ik{display:block;margin-bottom:12px}
.L-label .b2 .pl{display:inline-block;padding:4px 10px;border-radius:999px;background:var(--sf);color:var(--tx);font:600 11px var(--fn)}
.L-label .b2 b{display:block;margin-top:10px;font:600 clamp(17px,4.8vw,22px)/1.2 var(--fh);letter-spacing:-.02em}
.L-label .b3{min-height:140px;background:var(--sf2)}
.L-label .lo{padding:24px 22px;border-radius:24px;background:var(--tx);color:var(--bg)}
.L-label .lo small{color:var(--hi);font:700 11.5px var(--fn);letter-spacing:.16em;text-transform:uppercase}
.L-label .lo b{display:block;margin:10px 0 8px;font:700 clamp(28px,8vw,38px)/1.02 var(--fh);letter-spacing:-.04em}
.L-label .lo p{margin:0;opacity:.8;font:500 14px/1.5 var(--fn)}
.L-label .lo .till{display:inline-block;margin-top:14px;padding:6px 12px;border-radius:999px;background:var(--hi);color:var(--hit);font:700 12px var(--fn)}
.L-label .dm{margin:34px 0 0;padding:16px 0;overflow:hidden;border-top:1px dashed color-mix(in srgb,var(--tx) 25%,transparent);border-bottom:1px dashed color-mix(in srgb,var(--tx) 25%,transparent)}
.L-label .dm div{display:flex;align-items:center;gap:18px;width:max-content;white-space:nowrap;font:600 clamp(30px,9vw,46px)/1 var(--fh);letter-spacing:-.04em}
.L-label.anim .dm div{animation:bzmq 36s linear infinite}
.L-label .dm i{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--hi);color:var(--hit);font-style:normal}
.L-label #bz-menu{padding-top:44px}
.L-label .mh{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 4px 16px;flex-wrap:wrap}
.L-label .mh h2{margin:0;font:700 clamp(30px,9vw,42px)/1 var(--fh);letter-spacing:-.04em}
.L-label .mh span{font:600 13px var(--fn);color:var(--mu)}
.L-label .chips2{position:sticky;top:0;z-index:4;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -18px 14px;padding:10px 18px;background:var(--bg)}
.L-label .chips2::-webkit-scrollbar{display:none}
.L-label .chips2 button{flex:none;padding:10px 16px;border-radius:12px;border:1px solid color-mix(in srgb,var(--tx) 18%,transparent);background:var(--sf);color:var(--mu);font:600 13px var(--fn);letter-spacing:.04em;text-transform:uppercase;cursor:pointer}
.L-label .chips2 button.on{background:var(--sf2);color:var(--tx);border-color:var(--tx)}
.L-label .tg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.L-label .tc{position:relative;display:flex;flex-direction:column;padding:10px;border-radius:20px}
.L-label .tc .pc{position:absolute;right:16px;top:16px;z-index:2;padding:4px 10px;border-radius:999px;background:#fff;color:#141414;font:700 12.5px var(--fn);box-shadow:0 4px 12px -6px #0006}
.L-label .tc .bs{position:absolute;left:16px;top:16px;z-index:2;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#141414;color:#ffc21a}
.L-label .tc .ti{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden}
.L-label .tc .ti img{width:100%;height:100%;object-fit:cover}
.L-label .tc .ti .ni{position:absolute;inset:0;display:grid;place-items:center;font:800 64px var(--fh);letter-spacing:-.05em}
.L-label .tc .tb{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:10px;padding:10px 10px 10px 12px;border-radius:12px;background:#fff;color:#141414}
.L-label .tc .tb>span{min-width:0}
.L-label .tc .tb b{display:block;font:600 14px/1.2 var(--fh);overflow-wrap:anywhere}
.L-label .tc .tb small{display:block;margin-top:2px;font:500 11.5px/1.3 var(--fn);color:#6b6a63;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.L-label .tc .q button{width:30px;height:30px;background:#141414;color:#fff}
.L-label .tc .q button.m{background:#eee;color:#141414}
.L-label .tc .q b{color:#141414}
.L-label .tc .sold{background:#eee;color:#6b6a63}
.L-label .qs{display:grid;gap:10px}
.L-label .qi{aspect-ratio:4/3;border-radius:24px;overflow:hidden;background:var(--sf2)}
.L-label .qi img{width:100%;height:100%;object-fit:cover}
.L-label .qb{padding:28px 24px;border-radius:24px;background:#141414;color:#fff}
.L-label .qb .qm{display:block;height:54px;font:800 110px/1 var(--fh);color:var(--hi)}
.L-label .qb p{margin:8px 0 20px;font:600 clamp(20px,5.6vw,26px)/1.3 var(--fh);letter-spacing:-.02em}
.L-label .qb b{display:block;font:600 15px var(--fn)}.L-label .qb small{display:block;margin-top:3px;opacity:.6;font:500 12.5px var(--fn)}
.L-label .fw{display:grid;gap:14px;padding:22px;border-radius:24px;background:var(--sf);border:1px solid color-mix(in srgb,var(--tx) 12%,transparent)}
.L-label .fw small{font:700 11px var(--fn);letter-spacing:.16em;text-transform:uppercase;color:var(--ac)}
.L-label .fw h3{margin:8px 0;font:800 clamp(30px,9vw,44px)/.95 var(--fh);letter-spacing:-.04em;text-transform:uppercase}
.L-label .fw p{margin:0;color:var(--mu);font:500 14px/1.5 var(--fn)}
.L-label .fw .pr{margin-top:12px;display:flex;align-items:baseline;gap:10px}.L-label .fw .pr b{font:800 30px var(--fh);letter-spacing:-.03em}.L-label .fw .pr s{color:var(--mu)}
.L-label .fw .fi{position:relative;aspect-ratio:16/10;border-radius:18px;overflow:hidden;background:var(--hi)}
.L-label .fw .fi img{width:100%;height:100%;object-fit:cover}
.L-label .fw .off{position:absolute;right:12px;top:12px;padding:6px 12px;border-radius:999px;background:var(--hi);color:var(--hit);font:800 14px var(--fn)}
.L-label .gs{max-width:none;padding:44px 0 0}
.L-label .gh{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px}
.L-label .gh .sp{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:var(--sf2);font:700 11px var(--fn);letter-spacing:.1em;text-transform:uppercase}
.L-label .gh a{font:700 24px var(--fh);letter-spacing:-.03em}
.L-label .gr{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(140px,36%);gap:6px;overflow-x:auto;scrollbar-width:none}
.L-label .gr::-webkit-scrollbar{display:none}
.L-label .gr img{width:100%;aspect-ratio:4/5;object-fit:cover}
.L-label .gf{position:relative;max-width:760px;margin:44px auto 0;padding:0 8px}
.L-label .gp{position:relative;height:min(100vw,520px);border-radius:28px;overflow:hidden;background:var(--sf2)}
.L-label .gp img{width:100%;height:100%;object-fit:cover}
.L-label .gp .btn{position:absolute;left:16px;top:16px;z-index:1}
.L-label .gx2{position:absolute;left:4px;right:4px;bottom:22px;z-index:1;display:block;margin:0;font:800 clamp(70px,24vw,190px)/.8 var(--fh);letter-spacing:-.075em;color:var(--hi);text-align:center}
.L-label .gx2 span{display:block;white-space:nowrap}
.L-label .rg.fb{right:22px;top:20px}
@media (min-width:700px){.L-label .tg2{grid-template-columns:repeat(3,1fr)}.L-label .cr{grid-auto-columns:minmax(200px,30%)}.L-label .qs{grid-template-columns:1fr 1fr}.L-label .qi{aspect-ratio:auto}.L-label .fw{grid-template-columns:1fr 1fr;align-items:center}}

`;
    document.head.appendChild(s);
  }

  function hoursInfo(h) {
    if (!h || !Array.isArray(h.d) || h.d.length !== 7) return null;
    const now = new Date(), di = (now.getDay() + 6) % 7, mins = now.getHours() * 60 + now.getMinutes();
    const m = s => { const x = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return x ? +x[1] * 60 + +x[2] : null; };
    const fmt = s => { const x = m(s); if (x == null) return ""; let hh = Math.floor(x / 60), mm = x % 60, ap = hh >= 12 ? "pm" : "am"; hh = hh % 12 || 12; return hh + (mm ? ":" + String(mm).padStart(2, "0") : "") + " " + ap; };
    const day = h.d[di] || [], o = m(day[0]), c = m(day[1]);
    let open = false, until = "";
    if (!day[2] && o != null && c != null) { open = c > o ? mins >= o && mins < c : mins >= o || mins < c; until = fmt(day[1]); }
    const rows = h.d.map((d, i) => ({ day: DAYS[i], txt: d[2] ? "Closed" : (m(d[0]) != null && m(d[1]) != null ? fmt(d[0]) + " – " + fmt(d[1]) : "—"), today: i === di }));
    return { open, until, rows, nextOpen: !open && !day[2] && o != null && mins < o ? fmt(day[0]) : "" };
  }

  // Loyalty stamp card: d.loy = { on, n: stamps needed (2-30), r: reward, t: note }
  const loyOf = (d, prop) => { const l = d.loy || {}, n = Math.round(+l.n); return !prop && l.on && n >= 2 && n <= 30 ? { n, r: clip(l.r, 40) || "A free treat", t: clip(l.t, 120) } : null; };
  // Everything the layouts need, cleaned and validated once.
  function model(d, opts) {
    const th = THEMES[d.th] || THEMES.espresso, lay = d.lay === "fest" ? "pop" : LAYOUTS[d.lay] ? d.lay : "classic";
    const name = clip(d.t || "Your business", 60), catDef = CATS[d.cat], prop = !!(catDef && catDef.prop);
    const cat = d.cat === "other" ? clip(d.catx, 30) : catDef ? catDef.name : "";
    const ph = phone10(d.phone), wa = phone10(d.wa || d.phone), ig = String(d.ig || "").replace(/^@/, "").replace(/[^\w.]/g, "").slice(0, 30);
    const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? d.upi : null;
    const store = !prop && !!opts.store;
    const menu = (Array.isArray(d.menu) ? d.menu : []).map((s, si) => ({
      si, n: clip(s && s.n || "Section", 24),
      items: (s && Array.isArray(s.items) ? s.items : []).map((x, ii) => x && x.n ? { key: si + "." + ii, n: clip(x.n, 50), p: prop ? clip(String(x.p || "").replace(/^\s*(₹|rs\.?|inr)\s*/i, ""), 24) : cleanP(x.p), d: clip(x.d, 140), b: !!x.b, img: safeImg(x.i), price: num(x.p), so: !prop && !!x.so, st: prop && PST[x.s] ? x.s : "", w: store ? cleanP(x.w) : "", wn: store ? num(x.w) : null } : null).filter(Boolean).slice(0, store ? 400 : 60)
    })).filter(s => s.items.length);
    const take = !prop && !!d.ord && (!!wa || store) && !d.shut && !d.pause;
    const f = d.ft && d.ft.on && d.ft.title ? { label: clip(d.ft.label || "New", 24), title: clip(d.ft.title, 50), text: clip(d.ft.text, 200), p: prop ? clip(String(d.ft.p || "").replace(/^\s*(₹|rs\.?|inr)\s*/i, ""), 24) : cleanP(d.ft.p), was: cleanP(d.ft.was), img: safeImg(d.ft.img) } : null;
    return {
      d, th, lay, name, cat, area: clip(d.area, 40), tag: clip(d.tag, 140), cover: safeImg(d.cover), logo: safeImg(d.logo),
      hl: clip(d.hl, 60), sc: clip(d.sc, 24),
      ph, wa, ig, review: safeUrl(d.review), mapsU: safeUrl(d.maps) || (d.addr ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + d.addr) : ""),
      upi, upiLink: upi ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.name || name)}&cu=INR` : "",
      hi: hoursInfo(d.hours), menu, menuTitle: clip(d.menuTitle || "Menu", 24), gal: (Array.isArray(d.gal) ? d.gal : []).map(safeImg).filter(Boolean).slice(0, 10),
      galTitle: clip(d.galTitle || "Inside", 24), offer: d.offer && d.offer.on && d.offer.title ? d.offer : null, feat: f,
      stats: (Array.isArray(d.stats) ? d.stats : []).filter(x => x && x.v).slice(0, 4).map(x => ({ v: clip(x.v, 8), l: clip(x.l, 28) })),
      order: !prop && !!d.ord && (!!wa || store), store, shut: !!d.shut, pause: !!d.pause, take, prop, loy: loyOf(d, prop), pageUrl: opts.url || location.href, preview: !!opts.preview
    };
  }

  // ---------- pieces shared by every layout ----------
  const P = {
    status(m) { const hi = m.hi; if (m.shut) return `<span class="pill cl"><i></i>Closed today</span>`; return hi ? `<span class="pill${hi.open ? "" : " cl"}"><i></i>${hi.open ? "Open now" + (hi.until ? " · till " + esc(hi.until) : "") : hi.nextOpen ? "Opens " + esc(hi.nextOpen) : "Closed now"}</span>` : "<span></span>"; },
    share: () => `<button class="ibtn" data-share aria-label="Share">${ic("share", 19)}</button>`,
    bag: m => m.take ? `<button class="ibtn" data-bag aria-label="Your order">${ic("bag", 19)}<em data-cnt hidden>0</em></button>` : "",
    logo: m => `<div class="logo"${m.logo ? ` style="background-image:url('${esc(m.logo)}')"` : ""}>${m.logo ? "" : esc(m.name.charAt(0).toUpperCase())}</div>`,
    acts(m) {
      const a = [];
      if (m.ph) a.push(`<a class="act" href="tel:+${m.ph}"><span>${ic("call")}</span>Call</a>`);
      if (m.wa) a.push(`<a class="act" href="https://wa.me/${m.wa}" target="_blank" rel="noopener"><span>${ic("wa")}</span>WhatsApp</a>`);
      if (m.mapsU) a.push(`<a class="act" href="${esc(m.mapsU)}" target="_blank" rel="noopener"><span>${ic("pin")}</span>Directions</a>`);
      if (m.ig) a.push(`<a class="act" href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener"><span>${ic("ig")}</span>Instagram</a>`);
      if (m.upi) a.push(`<a class="act pr" href="#bz-pay"><span>${ic("pay")}</span>Pay</a>`);
      else if (m.review) a.push(`<a class="act pr" href="${esc(m.review)}" target="_blank" rel="noopener"><span>${ic("star")}</span>Review</a>`);
      return a.length ? `<div class="acts rv">${a.join("")}</div>` : "";
    },
    qty: (m, it) => it.so ? `<span class="sold">Sold out</span>` : m.take && it.price != null ? `<span class="q" data-q="${it.key}"><button type="button" class="m" data-sub="${it.key}" aria-label="Remove one" hidden>${ic("minus", 16)}</button><b data-n="${it.key}" hidden>0</b><button type="button" data-add="${it.key}" aria-label="Add ${esc(it.n)}">${ic("plus", 16)}</button></span>` : "",
    offer: m => m.offer ? `<div class="sec rv"><div class="offer"><small>${esc(clip(m.offer.label || "Today's offer", 24))}</small><b>${esc(clip(m.offer.title, 60))}</b>${m.offer.text ? `<p>${esc(clip(m.offer.text, 160))}</p>` : ""}${m.offer.till ? `<span class="till">Valid till ${esc(clip(m.offer.till, 30))}</span>` : ""}</div></div>` : "",
    // Loyalty card: the live page fills it in (assets/loyal.v1.js); the studio preview shows a sample with a few stamps.
    loy(m) {
      const l = m.loy; if (!l) return "";
      const demo = m.preview ? Math.min(3, l.n - 1) : 0;
      const dots = Array.from({ length: l.n }, (_, i) => `<i class="${i < demo ? "on" : ""}${i === l.n - 1 ? " gf" : ""}">${i === l.n - 1 ? ic("gift", 18) : i < demo ? ic("check", 16) : `<u>${i + 1}</u>`}</i>`).join("");
      return `<div class="sec rv" id="bz-loy"><div class="loy" data-loy data-n="${l.n}"><div class="lh"><span class="lb">${ic("star", 13)} Loyalty card</span><span class="lc" data-lc>${demo ? demo + " / " + l.n : "Free to join"}</span></div>
        <b class="lr">${esc(l.r)}</b><p class="lp" data-lp>${l.t ? esc(l.t) : `Collect ${l.n} stamps, one a day when you visit, and the ${esc(l.r.toLowerCase())} is on us.`}</p>
        <div class="lst${l.n > 10 ? " sm" : ""}" data-lst>${dots}</div><div class="la" data-la><button type="button" class="btn" data-ljoin>${ic("gift", 17)} Get my free card</button></div></div></div>`;
    },
    review: m => m.review ? `<div class="sec rv"><div class="card rev"><div style="flex:1"><div class="st">${Array(5).fill(ic("star", 18)).join("")}</div><b>Loved your visit?</b><p>A quick Google review helps us a lot.</p></div><a class="btn" href="${esc(m.review)}" target="_blank" rel="noopener">Review us</a></div></div>` : "",
    // Property listings (real estate): big photo cards with status, price and an Enquire button.
    props(m) {
      if (!m.menu.length) return "";
      const count = m.menu.reduce((n, s) => n + s.items.length, 0), price = p => /^\d/.test(p) ? "₹" + p : p;
      const enq = x => m.wa ? "https://wa.me/" + m.wa + "?text=" + encodeURIComponent(`Hi ${m.name}! I'm interested in "${x.n}"${x.p ? " (" + price(x.p) + ")" : ""}. Please share more details and a time for a site visit.`) : m.ph ? "tel:+" + m.ph : "";
      return `<div class="sec rv" id="bz-menu"><div class="h2"><b>${esc(m.menuTitle)}</b><small>${count} listing${count > 1 ? "s" : ""}</small></div>
        ${m.menu.length > 1 ? `<div class="tabs">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="pgrid" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(x => `<div class="pcard${x.st === "sold" ? " sold" : ""}"><div class="pim">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span>${ic("pin", 30)}</span>`}${x.st ? `<em class="pst ${x.st}">${PST[x.st]}</em>` : ""}${x.b ? `<em class="pfe">★ Featured</em>` : ""}</div>
          <div class="pbd">${x.p ? `<b class="ppr">${esc(price(x.p))}</b>` : ""}<h3>${esc(x.n)}</h3>${x.d ? `<div class="psp">${x.d.split(/\s*[·•|]\s*/).filter(Boolean).slice(0, 6).map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
          ${x.st !== "sold" && enq(x) ? `<a class="btn penq" href="${esc(enq(x))}"${m.wa ? ' target="_blank" rel="noopener"' : ""}>${ic(m.wa ? "wa" : "call", 17)} ${m.wa ? "Enquire on WhatsApp" : "Call to enquire"}</a>` : ""}</div></div>`).join("")}</div>`).join("")}
        ${m.wa ? `<a class="btn psv" href="https://wa.me/${m.wa}?text=${encodeURIComponent("Hi " + m.name + "! I'd like to book a site visit.")}" target="_blank" rel="noopener">${ic("pin", 17)} Book a site visit</a>` : ""}</div>`;
    },
    list(m, ico) { // menu as an elegant list with tabs (Classic, Botanical)
      if (m.prop) return P.props(m);
      if (!m.menu.length) return "";
      const count = m.menu.reduce((n, s) => n + s.items.length, 0);
      return `<div class="sec rv" id="bz-menu"><div class="h2"><b>${esc(m.menuTitle)}</b><small>${count} item${count > 1 ? "s" : ""}</small></div>
        ${m.menu.length > 1 ? `<div class="tabs">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="card menu" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(x => `<div class="it">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ico ? `<span class="ico">${esc(x.n.charAt(0).toUpperCase())}</span>` : ""}<div class="tx"><div class="r"><span class="n">${esc(x.n)}${x.b ? '<span class="bs">Bestseller</span>' : ""}</span><span class="dl"></span>${x.p ? `<span class="p">₹${esc(x.p)}</span>` : ""}</div>${x.d ? `<p class="d">${esc(x.d)}</p>` : ""}</div>${P.qty(m, x)}</div>`).join("")}</div>`).join("")}</div>`;
    },
    feat(m, cls) {
      const f = m.feat; if (!f) return "";
      const pr = f.p ? `<div class="pr"><b>₹${esc(f.p)}</b>${f.was ? `<s>₹${esc(f.was)}</s>` : ""}</div>` : "";
      return `<div class="sec rv"><div class="feat ${cls || ""}">${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy">` : ""}<div class="fx"><small>${esc(f.label)}</small><h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}${pr}</div></div></div>`;
    },
    gallery: m => m.gal.length ? `<div class="sec rv"><div class="h2"><b>${esc(m.galTitle)}</b><small>swipe</small></div><div class="gal">${m.gal.map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div>` : "",
    hours: m => m.hi ? `<div class="sec rv"><div class="h2"><b>Hours</b><small>${m.hi.open ? "open now" : "closed now"}</small></div><div class="card hrs">${m.hi.rows.map(r => `<div class="hr${r.today ? " td" : ""}"><span>${r.day}${r.today ? " · today" : ""}</span><span>${esc(r.txt)}</span></div>`).join("")}</div></div>` : "",
    visit: m => m.d.addr || m.mapsU ? `<div class="sec rv"><div class="h2"><b>Visit us</b></div><div class="card map">${m.d.addr && !m.preview ? `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(m.name + " " + m.d.addr)}&z=15&output=embed" title="Map"></iframe>` : `<div class="mp">${ic("pin", 34)}</div>`}
      <div class="ad"><p>${esc(clip(m.d.addr || "Find us on Google Maps", 200))}</p>${m.mapsU ? `<a class="btn" href="${esc(m.mapsU)}" target="_blank" rel="noopener">Directions</a>` : ""}</div></div></div>` : "",
    upi: m => m.upi ? `<div class="sec rv" id="bz-pay"><div class="h2"><b>Pay ${esc(clip(m.upi.name || m.name, 40))}</b><small>UPI</small></div><div class="card upi"><a class="btn" href="${esc(m.upiLink)}">${ic("pay", 18)} Pay with any UPI app</a><div class="row"><span>${esc(m.upi.id)}</span><button type="button" data-copy="${esc(m.upi.id)}">${ic("copy", 16)} Copy</button></div></div></div>` : "",
    foot: m => `<div class="foot"><div class="so">${m.ig ? `<a href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener" aria-label="Instagram">${ic("ig", 20)}</a>` : ""}${m.wa ? `<a href="https://wa.me/${m.wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic("wa", 20)}</a>` : ""}${m.ph ? `<a href="tel:+${m.ph}" aria-label="Call">${ic("call", 20)}</a>` : ""}<a href="#" data-vcf aria-label="Save contact">${ic("save", 20)}</a></div>
      <div class="mk">Page by <a href="https://getkeepsake.in/shops" target="_blank" rel="noopener">GetKeepsake</a> · get one for your business</div></div>`,
    tail: m => P.hours(m) + P.visit(m) + P.upi(m) + P.foot(m)
  };

  // ---------- layouts ----------
  const L = {
    classic(m) {
      const head = m.hl || m.name, chipImg = m.logo || m.gal[0] || "";
      // headline: *word* gets a hand-drawn underline; a small photo chip sits before the last word (when there's a photo)
      let words = esc(head).replace(/\*([^*]{1,40})\*/g, (x, w) => `<span class="swo">${w}<svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M2 7 C 25 1, 60 1, 98 5"/></svg></span>`);
      if (chipImg && m.cover) { const i = words.lastIndexOf(" "); if (i > 0 && !/<[^>]*$/.test(words.slice(0, i))) words = words.slice(0, i + 1) + `<span class="chip" style="background-image:url('${esc(chipImg)}')"></span>` + words.slice(i + 1); }
      const prim = m.ph ? `<a class="pb${m.cover ? " lt" : ""}" href="tel:+${m.ph}">Call now<i>${ic("call", 16)}</i></a>` : m.wa ? `<a class="pb${m.cover ? " lt" : ""}" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">WhatsApp<i>${ic("wa", 16)}</i></a>` : "";
      const sec = m.menu.length ? `<a class="pb${m.cover ? "" : " lt"}" href="#bz-menu" style="${m.cover ? "background:#ffffff26;color:#fff;backdrop-filter:blur(8px)" : ""}">${esc(m.menuTitle)}<i>${ic("arrow", 16)}</i></a>` : m.mapsU ? `<a class="pb${m.cover ? "" : " lt"}" href="${esc(m.mapsU)}" target="_blank" rel="noopener" style="${m.cover ? "background:#ffffff26;color:#fff;backdrop-filter:blur(8px)" : ""}">Directions<i>${ic("pin", 16)}</i></a>` : "";
      const eb = [m.cat, m.area].filter(Boolean).join(" · ");
      const hero = m.cover
        ? `<div class="chero"><img class="cv kb" src="${esc(m.cover)}" alt=""><div class="cg"></div>${P.status(m)}<div class="ct">${eb ? `<span class="eb">${esc(eb)}</span>` : ""}<h1>${words}</h1><div class="cbt">${prim}${sec}</div></div></div>`
        : `<div class="chero np"><div class="wm">${esc((m.name.replace(/[^\w\s]/g, "").split(/\s+/).find(w => w.length > 3) || m.name).slice(0, 8))}</div><div class="ct">${P.status(m)}<div class="lg"${m.logo ? ` style="background-image:url('${esc(m.logo)}')"` : ""}>${m.logo ? "" : esc(m.name.charAt(0).toUpperCase())}</div>${eb ? `<span class="eb" style="color:var(--ink)">${esc(eb)}</span>` : ""}<h1>${words}</h1><div class="cbt">${prim}${sec}</div></div></div>`;
      const spin = `<div class="spin" aria-hidden="true"><svg class="r" viewBox="0 0 92 92"><defs><path id="bzsp" d="M46 46 m-33 0 a33 33 0 1 1 66 0 a33 33 0 1 1 -66 0"/></defs><text><textPath href="#bzsp">${m.menu.length ? "Scroll down · see " + esc(m.menuTitle.toLowerCase()) + " · " : "Scroll down · scroll down · "}</textPath></text></svg><span class="ar">${ic("down", 20)}</span></div>`;
      let two = "";
      if (m.tag) { const w = m.tag.split(" "), h = Math.ceil(w.length * 0.45); two = `<p class="two rv">${esc(w.slice(0, h).join(" "))} <b>${esc(w.slice(h).join(" "))}</b></p>`; }
      const stats = m.stats.length ? `<div class="stats rv">${m.stats.map(x => `<div><b>${esc(x.v)}</b><span>${esc(x.l)}</span></div>`).join("")}</div>` : "";
      const small = [];
      if (m.ph) small.push(`<a class="bc dk" href="tel:+${m.ph}"><span class="lb">Call us</span><b>+${esc(m.ph.replace(/^91(\d{5})(\d{5})$/, "91 $1 $2"))}</b><span class="go">${ic("arrow", 16)}</span></a>`);
      if (m.wa) small.push(`<a class="bc" href="https://wa.me/${m.wa}" target="_blank" rel="noopener"><span class="lb">WhatsApp</span><b>Chat with us</b><span class="go">${ic("wa", 16)}</span></a>`);
      if (m.mapsU) small.push(`<a class="bc" href="${esc(m.mapsU)}" target="_blank" rel="noopener"><span class="lb">Visit</span><b>${esc(clip(m.d.addr ? (p => p[0].length < 12 && p[1] ? p[0] + "," + p[1] : p[0])(String(m.d.addr).split(",")) : "Get directions", 40))}</b><span class="go">${ic("pin", 16)}</span></a>`);
      if (m.ig) small.push(`<a class="bc" href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener"><span class="lb">Instagram</span><b>@${esc(m.ig)}</b><span class="go">${ic("ig", 16)}</span></a>`);
      if (m.upi) small.push(`<a class="bc" href="#bz-pay"><span class="lb">Pay</span><b>UPI</b><span class="go">${ic("pay", 16)}</span></a>`);
      const tallImg = m.gal[0] || m.cover;
      const tall = small.length >= 2 ? `<div class="bc tall">${tallImg ? `<img src="${esc(tallImg)}" alt="" loading="lazy">` : `<span class="ni">${esc(m.name.charAt(0).toUpperCase())}</span>`}<span class="lb">${esc(m.galTitle || "About us")}</span></div>` : "";
      const rev = m.review ? `<a class="bc wide" href="${esc(m.review)}" target="_blank" rel="noopener"><span class="tx">${Array(14).fill(esc(m.name)).join(" ")}</span><span class="st">${Array(5).fill(ic("star", 16)).join("")}</span><b>Loved your visit?</b><span class="lb">Review us on Google</span></a>` : "";
      // pairs fill the 2-column grid; an odd card out spans the full width so there's never a gap
      const first = small.slice(0, tall ? 4 : 6), rest = tall ? small.slice(4) : small.slice(6);
      const fix = arr => arr.length % 2 ? arr.slice(0, -1).concat(arr[arr.length - 1].replace('class="bc', 'class="bc full')) : arr;
      const top = tall ? (first.length === 3 ? fix(first) : first) : fix(first);
      const bento = small.length || rev ? `<div class="bento rv">${tall}${top.join("")}${rev}${fix(rest).join("")}</div>` : "";
      const gal = m.gal.length > 1 ? `<div class="sec rv"><div class="h2"><b>${esc(m.galTitle)}</b><small>swipe</small></div><div class="gal">${m.gal.slice(1).map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div></div>` : "";
      const foot = `<div class="cfoot"><div class="fn">${esc(m.name)}</div>${m.tag ? `<p>${esc(m.tag)}</p>` : ""}<div class="so">${m.ig ? `<a href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener" aria-label="Instagram">${ic("ig", 19)}</a>` : ""}${m.wa ? `<a href="https://wa.me/${m.wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic("wa", 19)}</a>` : ""}${m.ph ? `<a href="tel:+${m.ph}" aria-label="Call">${ic("call", 19)}</a>` : ""}<a href="#" data-vcf aria-label="Save contact">${ic("save", 19)}</a></div>
        <div class="mk">Page by <a href="https://getkeepsake.in/shops" target="_blank" rel="noopener">GetKeepsake</a> · get one for your business</div><div class="big">${esc((m.name.replace(/[^\w\s]/g, "").split(/\s+/).find(w => w.length > 3 && !/^(the|shri|shree)$/i.test(w)) || m.name).slice(0, 8))}</div></div>`;
      const nav = `<div class="cnav"><span class="cb"><span class="mi"${m.logo ? ` style="background-image:url('${esc(m.logo)}')"` : ""}>${m.logo ? "" : esc(m.name.charAt(0).toUpperCase())}</span>${esc(m.name)}</span><span class="r">${P.bag(m)}${P.share()}${m.wa ? `<a class="pb sm" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">Book<i>${ic("arrow", 14)}</i></a>` : ""}</span></div>`;
      return `<div style="position:relative">${nav}${hero}</div>${spin}<div class="wrap">${two}${stats}${bento}${P.offer(m)}${P.loy(m)}${P.feat(m)}${P.list(m, true)}${gal}${P.hours(m)}${P.visit(m)}${P.upi(m)}</div>${foot}`;
    },
    poster(m) {
      const words = plain(m.hl || m.name).trim().split(/\s+/), w1 = words.shift() || "", w2 = words.join(" ");
      // each big word shrinks to fit the screen width (Archivo Black letters are ~0.78em wide)
      const fs = w => { const n = Math.max(...String(w).split(/\s+/).map(x => x.length), 1); return `font-size:min(18.5vw,${(94 / (n * 0.8)).toFixed(1)}vw,132px)`; };
      const gridSec = m.prop ? P.props(m) : m.menu.length ? `<div class="sec rv" id="bz-menu"><div class="mh"><div><b>${esc(m.menuTitle)}</b>${m.cat ? `<i>${esc(m.cat.split(/[ &,]/)[0].toLowerCase())}</i>` : ""}</div><small>${m.menu.reduce((n, s) => n + s.items.length, 0)} items</small></div>
        ${m.menu.length > 1 ? `<div class="chips">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="grid" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(x => `<div class="pc"><div class="im">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni">${esc(x.n.charAt(0).toUpperCase())}</span>`}${x.b ? '<span class="bs">Bestseller</span>' : ""}</div><b>${esc(x.n)}</b>${x.d ? `<p>${esc(x.d)}</p>` : "<p></p>"}<div class="rw"><span class="p">${x.p ? "₹" + esc(x.p) : ""}</span>${P.qty(m, x)}</div></div>`).join("")}</div>`).join("")}</div>` : "";
      const f = m.feat, fw = f ? f.label.split(/\s+/) : [];
      const featSec = f ? `<div class="sec rv" style="padding:30px 0 0"><div class="feat"><div class="ww"><span>${esc(fw[0] || "")}</span>${fw.length > 1 ? `<em>${esc(fw.slice(1).join(" "))}</em>` : ""}</div>${m.sc ? `<span class="sc2">${esc(m.sc)}</span>` : ""}
        <h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}${f.p ? `<div class="pr"><b>₹${esc(f.p)}</b>${f.was ? `<s>₹${esc(f.was)}</s>` : ""}</div>` : ""}${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy">` : '<div class="pad"></div>'}</div></div>` : "";
      return `<div class="hero">${m.cover ? `<img class="cv kb" src="${esc(m.cover)}" alt="">` : `<div class="ph"></div>`}<div class="sh"></div>
        <div class="top"><span class="brand">${esc(m.name)}</span><span class="r">${P.bag(m)}${P.share()}</span></div>
        <div class="big w1" style="${fs(w1)}">${esc(w1)}</div>${w2 ? `<div class="big w2" style="${fs(w2)}">${esc(w2)}</div>` : ""}${m.sc ? `<div class="scr">${esc(m.sc)}</div>` : ""}
        <div class="foot1">${P.status(m)}${m.menu.length ? `<a class="btn" href="#bz-menu">${esc(m.menuTitle)} ${ic("arrow", 16)}</a>` : ""}</div></div>
        <div class="wrap"><div class="id">${P.logo(m)}<div><h1>${esc(m.name)}</h1>${m.cat || m.area ? `<div class="cat" style="margin-top:6px">${esc([m.cat, m.area].filter(Boolean).join(" · "))}</div>` : ""}</div></div>${m.tag ? `<p class="tag">${esc(m.tag)}</p>` : ""}
        ${P.acts(m)}${P.offer(m)}${P.loy(m)}${gridSec}</div>${featSec}<div class="wrap">${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    },
    botanical(m) {
      const all = m.menu.flatMap(s => s.items), pics = all.filter(x => x.img);
      const pick = (pics.length >= 2 ? pics : all).slice().sort((a, b) => b.b - a.b).slice(0, 8);
      const ribbon = (m.offer ? m.offer.title : m.tag ? m.tag.split(/[.!]/)[0] : "Welcome to " + m.name).slice(0, 60);
      const rib = Array(8).fill(esc(ribbon) + "  ✦  ").join("");
      const wave = `<svg class="wave" viewBox="0 0 400 74" preserveAspectRatio="none" aria-hidden="true"><path class="fl" d="M0 30 Q50 6 100 30 T200 30 T300 30 T400 30 V74 H0Z"/><path id="bzw" class="ln" d="M0 30 Q50 6 100 30 T200 30 T300 30 T400 30"/><path class="ln" d="M0 56 Q50 32 100 56 T200 56 T300 56 T400 56"/>
        <text dy="17"><textPath href="#bzw" startOffset="0">${rib}${m.preview ? "" : `<animate attributeName="startOffset" from="0" to="-400" dur="16s" repeatCount="indefinite"/>`}</textPath></text></svg>`;
      const arch = !m.prop && pick.length >= 2 ? `<div class="sec rv"><div class="ctr">${pick.some(x => x.b) ? "Bestsellers" : "Featured"}</div><div class="arches">${pick.map(x => `<div class="ar"><div class="im">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni">${esc(x.n.charAt(0).toUpperCase())}</span>`}</div>${x.b ? '<span class="bd">Best&shy;seller</span>' : ""}<b>${esc(x.n)}</b>${x.p ? `<span class="p">₹${esc(x.p)}</span>` : ""}${P.qty(m, x) ? `<div>${P.qty(m, x)}</div>` : ""}</div>`).join("")}</div></div>` : "";
      return `${m.offer || m.area ? `<div class="ann">${esc(m.offer ? m.offer.title + (m.offer.till ? " · till " + m.offer.till : "") : m.area)}</div>` : ""}
        <div class="hd">${P.share()}<b>${esc(m.name)}</b>${P.bag(m) || "<span></span>"}</div>
        <div class="hero">${m.cover ? `<img class="cv kb" src="${esc(m.cover)}" alt="">` : `<div class="ph">${esc(m.name)}</div>`}${P.status(m)}
        <div class="hcard"><h1>${esc(plain(m.hl) || m.name)}</h1>${m.tag ? `<p>${esc(m.tag)}</p>` : ""}${m.menu.length ? `<a class="btn" href="#bz-menu">View ${esc(m.menuTitle.toLowerCase())}</a>` : ""}</div></div>${wave}
        <div class="wrap"><div class="id">${P.logo(m)}<h2>${esc(m.name)}</h2>${m.cat || m.area ? `<div class="cat">${esc([m.cat, m.area].filter(Boolean).join(" · "))}</div>` : ""}</div>
        ${P.acts(m)}${arch}${P.feat(m)}${P.list(m)}${P.offer(m)}${P.loy(m)}${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    },
    bold(m) {
      const ph = [m.cover, ...m.gal].filter(Boolean).slice(0, 3);
      const cta = m.wa ? `<a class="btn" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">${ic("wa", 18)} Book on WhatsApp</a>` : m.ph ? `<a class="btn" href="tel:+${m.ph}">${ic("call", 18)} Call now</a>` : "";
      const pal = m.th.pal, galLeft = m.gal.slice(ph.length - 1);
      const cards = m.menu.map((s, i) => {
        const img = (s.items.find(x => x.img) || {}).img || galLeft[i] || "";
        const ps = s.items.map(x => x.price).filter(x => x != null), from = ps.length ? Math.min(...ps) : null;
        return `<div class="sc rv" style="background:${pal[i % 3]}">${img ? `<div class="ph2"><img src="${esc(img)}" alt="" loading="lazy">${from != null ? `<span class="st">Starting at ${money(from)}</span>` : ""}</div>` : ""}
          <h3>${esc(s.n)}${!img && from != null ? `<small>Starting at ${money(from)}</small>` : ""}</h3>
          ${s.items.map(x => `<div class="row${m.take ? " op" : ""}"><button type="button" data-acc>${x.b ? "★ " : ""}<span>${esc(x.n)}</span>${x.p ? `<i>₹${esc(x.p)}</i>` : ""}${ic("plus", 16)}</button><div class="dd"><span>${esc(x.d || (x.p ? "₹" + x.p : ""))}</span>${P.qty(m, x)}</div></div>`).join("")}</div>`;
      }).join("");
      return `<div class="tb"><b>${esc(m.name)}</b><span style="display:flex;gap:8px">${P.bag(m)}${P.share()}</span></div>
        ${ph.length ? `<div class="strip${ph.length === 1 ? " one" : ""}">${ph.map(u => `<div><img src="${esc(u)}" alt=""></div>`).join("")}</div>` : ""}
        <div class="wrap"><div class="hx">${m.cat ? `<small>${esc(m.cat)}${m.area ? " · " + esc(m.area) : ""}</small>` : ""}<h1>${mark(m.hl || m.name)}</h1>${m.tag ? `<p class="nm">${esc(m.tag)}</p>` : ""}${cta}</div>
        <div style="text-align:center;margin-top:16px">${P.status(m).replace('class="pill', 'style="background:color-mix(in srgb,var(--tx) 80%,transparent)" class="pill')}</div>
        ${P.acts(m)}${P.offer(m)}${P.loy(m)}</div>
        ${m.prop ? `<div class="wrap">${P.props(m)}</div>` : m.menu.length ? `<div class="svc" id="bz-menu" style="--gs:min(${(88 / (Math.max(4, m.menuTitle.length) * 0.5)).toFixed(1)}vw,${Math.round(500 / (Math.max(4, m.menuTitle.length) * 0.5))}px)"><div class="gw">${esc(m.menuTitle)}</div><div class="cards wrap">${cards}</div></div>` : ""}
        <div class="wrap">${P.feat(m)}${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    },
    // Pop: festival-poster look. Ticker, giant 3D name, sticker headline, arched photos, colour tiles, tagged cards.
    pop(m) {
      const pal = m.th.pal, lum = h => { const x = parseInt(String(h).slice(1), 16); return ((x >> 16) * 299 + ((x >> 8) & 255) * 587 + (x & 255) * 114) / 1000; };
      const on = h => lum(h) < 150 ? "#fff" : m.th.dark || lum(m.th.ink || m.th.ac) > 120 ? "#16121a" : "var(--ink)";
      const stk = (t, i, r) => `<span class="sk" style="background:${pal[i % 3]};color:${on(pal[i % 3])};transform:rotate(${r}deg)">${esc(t)}</span>`;
      const words = m.name.trim().split(/\s+/), lines = m.name.length > 11 && words.length > 1 ? (() => { const out = [""]; words.forEach(w => { const c = out[out.length - 1]; if (c && (c + " " + w).length > 11) out.push(w); else out[out.length - 1] = c ? c + " " + w : w; }); return out.slice(0, 3); })() : [m.name];
      const n = Math.max(4, ...lines.map(l => l.length));
      const big = `<h1 class="fx" style="--n:${n}" aria-label="${esc(m.name)}">${lines.map(l => `<span>${esc(l)}</span>`).join("")}</h1>`;
      const hw = plain(m.hl || m.cat || "Welcome").trim().split(/\s+/).slice(0, 4), rot = [-4, 3, -2, 4];
      const stks = `<div class="sks">${hw.map((w, i) => stk(w, i, rot[i])).join("")}</div>${m.sc ? `<p class="sksub">${esc(m.sc)}</p>` : ""}`;
      const pics = [m.cover, ...m.gal, ...m.menu.flatMap(s => s.items.map(x => x.img))].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      const arch = (src, c, k) => `<div class="ar ${c}">${src ? `<img${k ? ' class="kb"' : ""} src="${esc(src)}" alt="" loading="${k ? "eager" : "lazy"}">` : `<span class="ni">${esc(m.name.charAt(0).toUpperCase())}</span>`}</div>`;
      const ring = clip(m.offer ? m.offer.label || "Today's offer" : m.order ? "Scan · Order · Enjoy" : "Scan · Visit · Enjoy", 24).toUpperCase();
      const badge = `<div class="rg" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="bzfr" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0"/></defs><text textLength="226" lengthAdjust="spacingAndGlyphs"><textPath href="#bzfr" textLength="226" lengthAdjust="spacingAndGlyphs">${esc(ring)} ✦ ${esc(ring)} ✦</textPath></text></svg><span>${ic(m.order ? "bag" : "star", 26)}</span></div>`;
      const hero = `<div class="hz">${P.status(m)}<div class="wv"></div>${arch(pics[0], "a1", 1)}${pics.length > 1 ? arch(pics[1], "a2") : ""}${badge}</div>`;
      const tk = [m.offer && m.offer.title, m.hi && m.hi.open ? "Open now" + (m.hi.until ? " till " + m.hi.until : "") : "", m.order ? "Order on WhatsApp" : "", m.area, m.cat].filter(Boolean);
      const tick = `<div class="tk" aria-hidden="true"><div>${Array(8).fill(tk.length ? tk : [m.name]).flat().map(x => `<span>${esc(x)}</span><i>+</i>`).join("")}</div></div>`;
      const prim = m.menu.length ? `<a class="btn" href="#bz-menu">${m.order ? "Order now" : "See " + esc(m.menuTitle.toLowerCase())} ${ic("arrow", 16)}</a>` : m.wa ? `<a class="btn" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">${ic("wa", 17)} WhatsApp us</a>` : "";
      const sec2 = m.wa && m.menu.length ? `<a class="btn ot" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">${ic("wa", 17)} Chat</a>` : m.ph ? `<a class="btn ot" href="tel:+${m.ph}">${ic("call", 17)} Call</a>` : "";
      const count = m.menu.reduce((t, s) => t + s.items.length, 0);
      // colour tiles, one per menu section (Sip good)
      const tiles = !m.prop && m.menu.length >= 2 ? `<div class="sec rv tl"><div class="sh">${stk("Pick", 1, -3)}${stk("your fave", 0, 2)}</div><p class="shs">The best of ${esc(m.name)}</p><div class="tg">${m.menu.map((s, i) => { const im = (s.items.find(x => x.img) || {}).img, bg = pal[i % 3]; return `<a href="#bz-menu" data-jump="${i}" style="background:${bg};color:${on(bg)}"><b>${esc(s.n)}</b><small>${s.items.length} item${s.items.length > 1 ? "s" : ""}</small><span class="ta">${im ? `<img src="${esc(im)}" alt="" loading="lazy">` : ""}</span></a>`; }).join("")}</div></div>` : "";
      // tagged cards (Eat good)
      const card = (x, j, s) => `<div class="fc">${x.b || (j === 0 && !s.items.some(y => y.b)) ? `<span class="tgs">${x.b ? `<em>★ Bestseller</em>` : ""}${j === 0 && !x.b ? `<em class="nw">+ New</em>` : ""}</span>` : ""}<div class="im"${x.img ? "" : ` style="background:${pal[j % 3]}"`}>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni" style="color:${on(pal[j % 3])}">${esc(x.n.charAt(0).toUpperCase())}</span>`}</div>
        <div class="lb"><b>${esc(x.n)}</b>${x.d ? `<p>${esc(x.d)}</p>` : ""}<div class="pq">${x.p ? `<span class="p">₹${esc(x.p)}</span>` : "<span></span>"}${P.qty(m, x)}</div></div></div>`;
      const grid = m.prop ? P.props(m) : m.menu.length ? `<div class="sec rv" id="bz-menu"><div class="sh">${stk(m.menuTitle, 2, -3)}${stk(count + " items", 1, 3)}</div>
        ${m.menu.length > 1 ? `<div class="chips2">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="fg" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map((x, j) => card(x, j, s)).join("")}</div>`).join("")}</div>` : "";
      const of = m.offer ? `<div class="wrap"><div class="sec rv"><div class="fo" style="color:${on(pal[2])}"><span class="sk" style="background:var(--bg);color:var(--ink);transform:rotate(-3deg)">${esc(clip(m.offer.label || "Today's offer", 24))}</span><b>${esc(clip(m.offer.title, 60))}</b>${m.offer.text ? `<p>${esc(clip(m.offer.text, 160))}</p>` : ""}${m.offer.till ? `<span class="till">Valid till ${esc(clip(m.offer.till, 30))}</span>` : ""}</div></div></div>
        <div class="om" aria-hidden="true"><div>${Array(8).fill(`<span>${esc(clip(m.offer.title, 40))}</span><i>${ic("star", 22)}</i>`).join("")}</div></div>` : "";
      const st = [[count, count === 1 ? "item" : "items"], [m.menu.length, m.menu.length === 1 ? "category" : "categories"]];
      if (m.hi) st.push(m.hi.open ? ["Open", m.hi.until ? "till " + m.hi.until : "now"] : ["Closed", m.hi.nextOpen ? "opens " + m.hi.nextOpen : "now"]);
      else if (m.order) st.push(["1 tap", "to order"]);
      const stats = !m.prop && count ? `<div class="sec rv"><div class="ss">${st.map(([a, b]) => `<div><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join("")}</div></div>` : "";
      const quote = m.tag ? `<div class="sec rv"><div class="qt"><span class="qm">“</span><p>${esc(m.tag)}</p><small>${esc(m.name)}${m.area ? " · " + esc(m.area) : ""}</small></div></div>` : "";
      const f = m.feat; let featS = "";
      if (f) { const a = num(f.p), b = num(f.was), off = a && b && b > a ? Math.round((1 - a / b) * 100) : 0;
        featS = `<div class="sec rv"><div class="ff">${f.img ? `<div class="fi"><img src="${esc(f.img)}" alt="" loading="lazy"></div>` : ""}<div class="ft"><small>${esc(f.label)}</small><h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}${f.p ? `<div class="pr"><b>₹${esc(f.p)}</b>${f.was ? `<s>₹${esc(f.was)}</s>` : ""}</div>` : ""}</div>${off ? `<span class="off">${off}%<small>off</small></span>` : ""}</div></div>`; }
      const gal = m.gal.length ? `<div class="sec rv gs"><div class="gh"><span class="sk" style="background:${pal[1]};color:${on(pal[1])}">${m.ig ? "On social" : esc(m.galTitle)}</span>${m.ig ? `<a href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener">${ic("ig", 20)} ${esc(m.ig)}</a>` : ""}</div><div class="gr">${m.gal.map(g => `<img src="${esc(g)}" alt="" loading="lazy">`).join("")}</div></div>` : "";
      const why = [];
      if (m.ph) why.push(`<a href="tel:+${m.ph}">${ic("call", 20)}<span>Call</span></a>`);
      if (m.wa) why.push(`<a href="https://wa.me/${m.wa}" target="_blank" rel="noopener">${ic("wa", 20)}<span>WhatsApp</span></a>`);
      if (m.mapsU) why.push(`<a href="${esc(m.mapsU)}" target="_blank" rel="noopener">${ic("pin", 20)}<span>Directions</span></a>`);
      if (m.upi) why.push(`<a href="#bz-pay">${ic("pay", 20)}<span>Pay</span></a>`);
      const acts = why.length ? `<div class="fa">${why.join("")}</div>` : "";
      const end = m.order || m.menu.length ? (m.order ? "Order now" : "Visit us") : "Say hello";
      const giant = `<div class="gn rv"><a href="${m.menu.length ? "#bz-menu" : m.wa ? "https://wa.me/" + m.wa : "#"}"${!m.menu.length && m.wa ? ' target="_blank" rel="noopener"' : ""}><span>${esc(end)}</span></a>${badge}</div>`;
      return `${tick}<div class="ftop"><span class="nm">${esc(m.name)}</span><span class="r">${P.bag(m)}${P.share()}</span></div>
        <div class="fh">${big}${stks}<div class="ctas">${prim}${sec2}</div></div>${hero}
        <div class="wrap">${acts}</div>${of}<div class="wrap">${tiles}${grid}${stats}</div>
        <div class="wrap">${featS}${quote}${P.loy(m)}${P.review(m)}</div>${gal}<div class="wrap">${P.hours(m)}${P.visit(m)}${P.upi(m)}</div>${giant}<div class="wrap">${P.foot(m)}</div>`;
    },
    // Label: brand look. Giant lowercase name over the hero photo, notched cards with arrow buttons, colour product tiles, quote card, giant footer word.
    label(m) {
      const pal = m.th.pal, lum = h => { const x = parseInt(String(h).slice(1), 16); return ((x >> 16) * 299 + ((x >> 8) & 255) * 587 + (x & 255) * 114) / 1000; };
      const on = h => lum(h) < 150 ? "#fff" : "#141414";
      const pics = [m.cover, ...m.gal, ...m.menu.flatMap(s => s.items.map(x => x.img))].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      const arw = `<span class="nt"><i>${ic("arrow", 16)}</i></span>`;
      const ring = clip(m.offer ? m.offer.label || "Today's offer" : m.order ? "Order on WhatsApp" : "Scan · Visit · Enjoy", 24).toUpperCase();
      const badge = c => `<div class="rg ${c || ""}" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="bzlr" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0"/></defs><text textLength="226" lengthAdjust="spacingAndGlyphs"><textPath href="#bzlr" textLength="226" lengthAdjust="spacingAndGlyphs">${esc(ring)} ✦ ${esc(ring)} ✦</textPath></text></svg><span>${ic(m.order ? "bag" : "star", 22)}</span></div>`;
      const ann = m.offer ? m.offer.title : m.hi && m.hi.open ? "Open now" + (m.hi.until ? " till " + m.hi.until : "") : [m.cat, m.area].filter(Boolean).join(" · ");
      const prim = m.menu.length ? `<a class="btn" href="#bz-menu">${m.order ? "Order now" : "See " + esc(m.menuTitle.toLowerCase())}</a>` : m.wa ? `<a class="btn" href="https://wa.me/${m.wa}" target="_blank" rel="noopener">WhatsApp us</a>` : "";
      const hero = `<div class="lh"><div class="ph">${pics[0] ? `<img class="kb" src="${esc(pics[0])}" alt="">` : `<span class="ni"></span>`}<div class="sh"></div><div class="tl">${P.status(m)}</div><div class="tr">${prim}</div></div>
        <h1 class="fx gx" aria-label="${esc(m.name)}"><span>${esc(m.name.toLowerCase())}</span></h1>${badge("hb")}</div><div class="lm"><span>${new Date().getFullYear()}</span><span>${esc(m.cat || m.area || "")}</span></div>`;
      const hl = esc(plain(m.hl) || "Welcome to " + m.name).replace(/^(.{6,}?)\s+(\S+\s+\S+)$/, "$1<br>$2");
      const head = `<div class="hd rv"><h2>${hl}</h2><span class="dg">${ic("arrow", 44)}</span>${m.sc || m.area ? `<p>${esc(m.sc || "")}${m.sc && m.area ? " · " : ""}${esc(m.area || "")}</p>` : ""}</div>`;
      const its = m.menu.flatMap(s => s.items.filter(x => x.img).map(x => ({ ...x, sec: s.n, si: s.si }))).slice(0, 6);
      const cards = its.length >= 2 ? `<div class="cs rv"><div class="cr">${its.map((x, i) => `<a class="cc${i === 1 ? " hi" : ""}" href="#bz-menu" data-jump="${x.si}"><img src="${esc(x.img)}" alt="" loading="lazy">${arw}<span class="cl"><small>${esc(x.sec)}</small><b>${esc(x.n)}</b></span></a>`).join("")}</div></div>` : "";
      const b2t = m.offer ? m.offer.title : m.order ? "Order in one tap on WhatsApp" : m.upi ? "Pay by UPI from your phone" : "Come say hello";
      const bento = pics.length >= 2 ? `<div class="bn rv"><a class="b1" href="#bz-menu"><img src="${esc(pics[1])}" alt="" loading="lazy">${arw}</a><div class="bc"><div class="b2"><span class="ik">${ic(m.offer ? "gift" : "wa", 20)}</span><span class="pl">${esc(m.name.toLowerCase().replace(/[^a-z0-9]+/g, ""))}</span><b>${esc(b2t)}</b></div>${pics[2] ? `<a class="b3" href="#bz-menu"><img src="${esc(pics[2])}" alt="" loading="lazy">${arw}</a>` : ""}</div></div>` : "";
      const count = m.menu.reduce((t, s) => t + s.items.length, 0);
      const tile = (x, j) => `<div class="tc" style="background:${pal[j % 3]}">${x.p ? `<span class="pc">₹${esc(x.p)}</span>` : ""}${x.b ? `<span class="bs" title="Bestseller" aria-label="Bestseller">${ic("star", 13)}</span>` : ""}<div class="ti">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni" style="color:${on(pal[j % 3])}">${esc(x.n.charAt(0).toUpperCase())}</span>`}</div><div class="tb"><span><b>${esc(x.n)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ""}</span>${P.qty(m, x)}</div></div>`;
      const grid = m.prop ? P.props(m) : m.menu.length ? `<div class="sec rv" id="bz-menu"><div class="mh"><h2>${esc(m.menuTitle)}</h2><span>${count} item${count === 1 ? "" : "s"}${m.menu.length > 1 ? " · " + m.menu.length + " categories" : ""}</span></div>
        ${m.menu.length > 1 ? `<div class="chips2">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="tg2" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(tile).join("")}</div>`).join("")}</div>` : "";
      const quote = m.tag ? `<div class="sec rv"><div class="qs">${pics[3] || pics[0] ? `<div class="qi"><img src="${esc(pics[3] || pics[0])}" alt="" loading="lazy"></div>` : ""}<div class="qb"><span class="qm">”</span><p>${esc(m.tag)}</p><b>${esc(m.name)}</b><small>${esc([m.cat, m.area].filter(Boolean).join(" · "))}</small></div></div></div>` : "";
      const mq = m.offer ? `<div class="dm" aria-hidden="true"><div>${Array(8).fill(`<span>${esc(clip(m.offer.title, 40))}</span><i>${ic("star", 16)}</i>`).join("")}</div></div>` : "";
      const of = m.offer ? `<div class="sec rv"><div class="lo"><small>${esc(clip(m.offer.label || "Today's offer", 24))}</small><b>${esc(clip(m.offer.title, 60))}</b>${m.offer.text ? `<p>${esc(clip(m.offer.text, 160))}</p>` : ""}${m.offer.till ? `<span class="till">Valid till ${esc(clip(m.offer.till, 30))}</span>` : ""}</div></div>` : "";
      const f = m.feat; let featS = "";
      if (f) { const a = num(f.p), b = num(f.was), off = a && b && b > a ? Math.round((1 - a / b) * 100) : 0;
        featS = `<div class="sec rv"><div class="fw"><div class="ft"><small>${esc(f.label)}</small><h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}${f.p ? `<div class="pr"><b>₹${esc(f.p)}</b>${f.was ? `<s>₹${esc(f.was)}</s>` : ""}</div>` : ""}</div>${f.img ? `<div class="fi"><img src="${esc(f.img)}" alt="" loading="lazy">${off ? `<span class="off">-${off}%</span>` : ""}</div>` : ""}</div></div>`; }
      const why = [];
      if (m.ph) why.push(`<a href="tel:+${m.ph}">${ic("call", 18)}Call</a>`);
      if (m.wa) why.push(`<a href="https://wa.me/${m.wa}" target="_blank" rel="noopener">${ic("wa", 18)}WhatsApp</a>`);
      if (m.mapsU) why.push(`<a href="${esc(m.mapsU)}" target="_blank" rel="noopener">${ic("pin", 18)}Directions</a>`);
      if (m.upi) why.push(`<a href="#bz-pay">${ic("pay", 18)}Pay</a>`);
      const acts = why.length ? `<div class="la">${why.join("")}</div>` : "";
      const gal = m.gal.length ? `<div class="sec rv gs"><div class="gh"><span class="sp">${ic("ig", 14)} ${m.ig ? "On social" : esc(m.galTitle)}</span>${m.ig ? `<a href="https://instagram.com/${esc(m.ig)}" target="_blank" rel="noopener">${esc(m.ig)}</a>` : ""}</div><div class="gr">${m.gal.map(g => `<img src="${esc(g)}" alt="" loading="lazy">`).join("")}</div></div>` : "";
      const end = m.order ? "order now" : m.menu.length ? "visit us" : "say hello";
      const gpic = pics[Math.min(3, pics.length - 1)];
      const giant = `<div class="gf rv"><div class="gp">${gpic ? `<img src="${esc(gpic)}" alt="" loading="lazy">` : ""}<div class="sh"></div>${m.order ? `<a class="btn" href="#bz-menu">Get started</a>` : ""}</div><a class="fx gx2" href="${m.menu.length ? "#bz-menu" : m.wa ? "https://wa.me/" + m.wa : "#"}"><span>${esc(end)}</span></a>${badge("fb")}</div>`;
      return `${ann ? `<div class="an">${esc(ann)}</div>` : ""}<div class="ln"><span class="nm">${m.logo ? `<i style="background-image:url('${esc(m.logo)}')"></i>` : ""}${esc(m.name)}</span><span class="r">${P.bag(m)}${P.share()}</span></div>
        ${hero}<div class="wrap">${head}${acts}</div>${cards}<div class="wrap">${bento}${of}</div>${mq}<div class="wrap">${grid}${quote}${featS}${P.loy(m)}${P.review(m)}</div>${gal}<div class="wrap">${P.hours(m)}${P.visit(m)}${P.upi(m)}</div>${giant}<div class="wrap">${P.foot(m)}</div>`;
    },
  };

  // ---------- Online store: every product, search, categories, product details ----------
  function storeHtml(m) {
    const n = m.menu.reduce((t, s) => t + s.items.length, 0);
    return `<button type="button" class="sfab" data-store>${ic("bag", 18)} Shop all ${n} product${n === 1 ? "" : "s"}</button>
      <div class="sto" data-sto hidden role="dialog" aria-modal="true" aria-label="All products"><div class="sth"><button type="button" class="stx" data-stx aria-label="Close">${ic("arrow", 20)}</button><b>${esc(m.name)}</b><span data-scnt></span></div>
      <div class="sts"><input type="search" data-sq placeholder="Search products" aria-label="Search products" autocomplete="off"></div>
      <div class="stc">${m.menu.length > 1 ? `<button type="button" data-sc="-1" class="on">All</button>` + m.menu.map(s => `<button type="button" data-sc="${s.si}">${esc(s.n)}</button>`).join("") : ""}</div>
      <div class="stg" data-sg></div><button type="button" class="stm" data-smore hidden>Show more</button>
      <div class="spd" data-spd hidden></div></div>`;
  }
  function render(root, d, opts) {
    opts = opts || {}; css();
    const m = model(d, opts); fonts(m.lay);
    const th = m.th, ac = /^#[0-9a-f]{6}$/i.test(d.ac || "") ? d.ac : th.ac;
    root.className = "bz L-" + m.lay + (opts.preview ? " static" : " anim") + (th.dark ? " dk" : "");
    root.style.cssText = `--bg:${th.bg};--sf:${th.sf};--sf2:${th.sf2};--tx:${th.tx};--mu:${th.mu};--ac:${ac};--ink:${d.ac && ac === d.ac ? ac : th.ink || ac};--on:${th.on};--hi:${th.hi};--hit:${th.hit};--p1:${th.pal[0]};--p2:${th.pal[1]};--p3:${th.pal[2]}`;
    const note = m.shut ? "We're closed today. See you soon!" : m.order && m.pause ? "We're not taking orders on this page right now. Call or visit us." : "";
    root.innerHTML = (note ? `<div class="shutn" role="status">${esc(note)}</div>` : "") + L[m.lay](m) + (m.take ? `<div class="bk" role="region" aria-label="Your order"><div class="bt" data-sum></div><a class="btn" data-send href="#">${m.store ? ic("bag", 17) + " Checkout" : ic("wa", 17) + " Order on WhatsApp"}</a></div>
      <div class="ck" data-ck hidden><div class="ckb" role="dialog" aria-modal="true" aria-labelledby="bz-ckh"><button type="button" class="ckx" data-ckx aria-label="Close">×</button>
        <div data-ckf><b id="bz-ckh">Almost done</b><p class="cks" data-cks></p>
        <label>Your name<input data-f="name" autocomplete="name" maxlength="40" placeholder="So ${esc(m.name)} knows who it's for"></label>
        <label>Mobile number${m.store ? "" : " <small>(optional)</small>"}<input data-f="phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="14" placeholder="10-digit mobile"></label>
        <div class="ckm" role="radiogroup" aria-label="How do you want it?"><button type="button" data-mode="pickup" class="on">Pickup</button><button type="button" data-mode="delivery">Delivery</button><button type="button" data-mode="table">At a table</button></div>
        <label data-addr hidden><span data-addrl>Delivery address</span><input data-f="addr" maxlength="160" autocomplete="street-address"></label>
        ${m.store ? `<div class="ckm ckp" role="radiogroup" aria-label="Payment"><button type="button" data-pay="cod" class="on">Pay at the shop / on delivery</button>${m.upi ? `<button type="button" data-pay="upi">Pay now by UPI</button>` : ""}</div>` : ""}
        <label>Note <small>(optional)</small><input data-f="note" maxlength="160" placeholder="Less sugar, extra spicy…"></label>
        <button type="button" class="btn ckgo" data-go>${ic("wa", 17)} ${m.store ? "Place order" : "Send order on WhatsApp"}</button><small class="ckf">${m.store ? "Your order goes straight to " + esc(m.name) + ". You'll see when it's accepted." : "WhatsApp opens with your order typed in. Just press send."}</small></div><div data-ckd hidden></div></div></div>` : "") + (m.store && m.menu.length ? storeHtml(m) : "") + `<div class="toast"></div>`;

    const items = {}; m.menu.forEach(s => s.items.forEach(x => items[x.key] = x));
    const cart = {};
    const toast = t => { const e = root.querySelector(".toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._h); e._h = setTimeout(() => e.classList.remove("on"), 1800); };
    const sync = () => {
      let n = 0, tot = 0; Object.entries(cart).forEach(([k, q]) => { n += q; tot += q * (items[k].price || 0); });
      root.querySelectorAll("b[data-n]").forEach(b => { const q = cart[b.dataset.n] || 0; b.textContent = q; b.hidden = !q; b.previousElementSibling.hidden = !q; });
      root.querySelectorAll("[data-cnt]").forEach(e => { e.textContent = n; e.hidden = !n; });
      const bk = root.querySelector(".bk"); if (!bk) return;
      bk.classList.toggle("on", n > 0);
      root.querySelector("[data-sum]").innerHTML = `${n} item${n === 1 ? "" : "s"} · ${money(tot)}<small>${m.store ? "Tap Checkout to place your order" : "Tap to send your order to " + esc(m.name)}</small>`;
    };
    const total = () => Object.entries(cart).reduce((t, [k, q]) => t + q * (items[k].price || 0), 0);
    const MODE = { pickup: "Pickup", delivery: "Delivery", table: "At a table" };
    const orderText = (f, ref) => {
      const lines = Object.entries(cart).filter(([, q]) => q).map(([k, q]) => `${q} × ${items[k].n} — ${money(q * items[k].price)}`);
      return `Hi ${m.name}! I'd like to order${ref ? " (Order #" + ref + ")" : ""}:\n\n${lines.join("\n")}\n\nTotal: ${money(total())}\n\nName: ${f.name || ""}\n${MODE[f.mode]}${f.mode === "delivery" ? ": " + (f.addr || "") : f.mode === "table" && f.addr ? ": table " + f.addr : ""}${f.phone ? "\nMobile: " + f.phone : ""}${f.note ? "\nNote: " + f.note : ""}`;
    };
    // The customer's details are remembered on their own phone for next time.
    const me = () => { try { return JSON.parse(localStorage.getItem("bz-me") || "{}") || {}; } catch (x) { return {}; } };
    let mode = "pickup";
    const ck = root.querySelector("[data-ck]");
    const setMode = v => { mode = v; root.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === v)); const a = root.querySelector("[data-addr]"); a.hidden = v === "pickup"; root.querySelector("[data-addrl]").textContent = v === "table" ? "Table number" : "Delivery address"; root.querySelector('[data-f="addr"]').placeholder = v === "table" ? "e.g. 4" : "House, street, landmark"; };
    const openCk = () => { const p = me(); ["name", "phone", "addr"].forEach(k => { const i = root.querySelector(`[data-f="${k}"]`); if (!i.value && p[k]) i.value = p[k]; }); setMode(p.mode && MODE[p.mode] ? p.mode : "pickup"); const n = Object.values(cart).reduce((a, b) => a + b, 0); root.querySelector("[data-cks]").textContent = `${n} item${n === 1 ? "" : "s"} · ${money(total())}`; ck.hidden = false; requestAnimationFrame(() => ck.classList.add("on")); setTimeout(() => root.querySelector('[data-f="name"]').focus({ preventScroll: true }), 250); };
    const closeCk = () => { ck.classList.remove("on"); clearTimeout(pollT); setTimeout(() => { ck.hidden = true; if (ckf) { ckf.hidden = false; ckd.hidden = true; } }, 220); };
    const REFC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", newRef = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), x => REFC[x % 32]).join("");
    // Count taps for the owner's stats (live page only): Call, WhatsApp, Directions, Instagram, Pay, Review, Order.
    let pay = "cod";
    const ckf = root.querySelector("[data-ckf]"), ckd = root.querySelector("[data-ckd]");
    const ST = { new: "Sent. Waiting for the shop to accept…", prep: "Accepted. It's being prepared.", ready: "Ready!", done: "Completed. Thank you!", cancel: "The shop couldn't take this order. Please call them." };
    const upiPay = (amt, ref) => m.upi ? `upi://pay?pa=${encodeURIComponent(m.upi.id)}&pn=${encodeURIComponent(m.upi.name || m.name)}&am=${amt}&cu=INR&tn=${encodeURIComponent("Order " + ref)}` : "";
    let pollT = 0;
    const showDone = o => {
      if (!ckd) return; ckf.hidden = true; ckd.hidden = false;
      ckd.innerHTML = `<div class="okk">${ic("check", 26)}</div><b>Order placed</b><p class="cks">Order #${esc(o.ref)} · ${money(o.tot)}</p><div class="ost" data-ost>${esc(ST[o.st || "new"])}</div>
        ${o.pay === "upi" && m.upi && o.st !== "cancel" ? `<a class="btn" href="${esc(upiPay(o.tot, o.ref))}">${ic("pay", 17)} Pay ${money(o.tot)} by UPI</a>` : ""}
        ${m.wa ? `<a class="btn gh" href="https://wa.me/${m.wa}?text=${encodeURIComponent("Hi " + m.name + "! About my order #" + o.ref)}" target="_blank" rel="noopener">${ic("wa", 17)} Message the shop</a>` : ""}
        <button type="button" class="btn gh" data-ckx>Done</button>`;
      ck.hidden = false; requestAnimationFrame(() => ck.classList.add("on"));
      clearTimeout(pollT);
      const poll = async () => { if (ckd.hidden || !opts.id) return; try { const r = await fetch("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bz-status", id: opts.id, ref: o.ref }) }); const j = await r.json(); if (j.st) { o.st = j.st; const el = ckd.querySelector("[data-ost]"); if (el) el.textContent = ST[j.st] + (j.st === "ready" ? (o.mode === "delivery" ? " It's on its way soon." : " Come and collect it.") : ""); } } catch (x) {} if (!["done", "cancel"].includes(o.st)) pollT = setTimeout(poll, 12000); };
      poll();
    };
    const myOrders = () => { try { return JSON.parse(localStorage.getItem("bz-ord:" + opts.id) || "[]").filter(o => Date.now() - o.at < 864e5); } catch (x) { return []; } };
    const track = ev => { if (!opts.id || m.preview) return; try { fetch("/api/qr?ev=" + encodeURIComponent(opts.id) + "&t=" + ev, { keepalive: true, cache: "no-store" }); } catch (x) {} };
    const kindOf = h => /^tel:/.test(h) ? "call" : /wa\.me\//.test(h) ? "wa" : /^upi:/.test(h) || h === "#bz-pay" ? "pay" : /instagram\.com/.test(h) ? "ig" : m.review && h === m.review ? "review" : /google\.[a-z.]+\/maps|maps\.app\.goo|goo\.gl\/maps/.test(h) || (m.mapsU && h === m.mapsU) ? "dir" : "";
    const sto = root.querySelector("[data-sto]"), spd = sto && sto.querySelector("[data-spd]");
    let sCat = -1, sQ = "", shown = 40;
    const allP = m.menu.flatMap(s => s.items.map(x => ({ ...x, sec: s.n, si: s.si })));
    const offOf = x => x.price && x.wn && x.wn > x.price ? Math.round((1 - x.price / x.wn) * 100) : 0;
    const pCard = x => `<div class="spc${x.so ? " so" : ""}"><button type="button" class="spi" data-pd="${x.key}" aria-label="${esc(x.n)}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span>${esc(x.n.charAt(0).toUpperCase())}</span>`}${offOf(x) ? `<em>-${offOf(x)}%</em>` : ""}</button><button type="button" class="spn" data-pd="${x.key}">${esc(x.n)}</button><div class="spr"><b>${x.p ? "₹" + esc(x.p) : ""}</b>${x.w ? `<s>₹${esc(x.w)}</s>` : ""}</div>${P.qty(m, x)}</div>`;
    const drawStore = () => {
      if (!sto) return; const q = sQ.toLowerCase();
      const list = allP.filter(x => (sCat < 0 || x.si === sCat) && (!q || (x.n + " " + x.d + " " + x.sec).toLowerCase().includes(q)));
      sto.querySelector("[data-sg]").innerHTML = list.slice(0, shown).map(pCard).join("") || `<p class="spe">No products match “${esc(sQ)}”.</p>`;
      sto.querySelector("[data-smore]").hidden = list.length <= shown; sto.querySelector("[data-scnt]").textContent = list.length + " product" + (list.length === 1 ? "" : "s"); sync();
    };
    const openPd = k => { const x = allP.find(y => y.key === k); if (!x || !spd) return;
      spd.innerHTML = `<div class="sth"><button type="button" class="stx" data-stx aria-label="Back">${ic("arrow", 20)}</button><b>${esc(x.sec)}</b></div>${x.img ? `<img class="pdi" src="${esc(x.img)}" alt="">` : ""}<div class="pdb"><h3>${esc(x.n)}</h3><div class="spr"><b>${x.p ? "₹" + esc(x.p) : ""}</b>${x.w ? `<s>₹${esc(x.w)}</s>` : ""}${offOf(x) ? `<em>${offOf(x)}% off</em>` : ""}</div>${x.d ? `<p>${esc(x.d)}</p>` : ""}<div class="pdq">${P.qty(m, x) || (x.so ? "" : m.wa ? `<a class="btn" href="https://wa.me/${m.wa}?text=${encodeURIComponent("Hi! I'm interested in " + x.n)}" target="_blank" rel="noopener">${ic("wa", 17)} Ask on WhatsApp</a>` : "")}</div></div>`;
      spd.hidden = false; spd.scrollTop = 0; sync(); };
    if (sto) root.addEventListener("input", e => { if (e.target.matches("[data-sq]")) { sQ = e.target.value.trim(); shown = 40; drawStore(); } });
    if (m.store && opts.id && !m.preview && myOrders().length) { const o = myOrders()[0]; if (!["done", "cancel"].includes(o.st)) root.insertAdjacentHTML("beforeend", `<button type="button" class="myo" data-myord>${ic("bag", 16)} Your order #${esc(o.ref)} · track</button>`); }
    root.onclick = async e => {
      const t = e.target;
      const pb = t.closest("[data-pay]"); if (pb) { pay = pb.dataset.pay; root.querySelectorAll("[data-pay]").forEach(b => b.classList.toggle("on", b === pb)); return; }
      if (sto) {
        if (t.closest("[data-store]")) { sto.hidden = false; drawStore(); requestAnimationFrame(() => sto.classList.add("on")); document.documentElement.style.overflow = "hidden"; return; }
        if (t.closest("[data-stx]")) { if (!spd.hidden) { spd.hidden = true; return; } sto.classList.remove("on"); document.documentElement.style.overflow = ""; setTimeout(() => sto.hidden = true, 220); return; }
        const sc = t.closest("[data-sc]"); if (sc) { sCat = +sc.dataset.sc; shown = 40; root.querySelectorAll("[data-sc]").forEach(b => b.classList.toggle("on", b === sc)); drawStore(); return; }
        if (t.closest("[data-smore]")) { shown += 40; drawStore(); return; }
        const pd = t.closest("[data-pd]"); if (pd) { openPd(pd.dataset.pd); return; }
      }
      if (t.closest("[data-myord]")) { const o = myOrders()[0]; if (o) { t.closest("[data-myord]").remove(); showDone(o); } return; }
      const la = t.closest("a[href]"); if (la && !la.hasAttribute("data-send")) { const k = kindOf(la.getAttribute("href") || ""); if (k) track(k); }
      const jp = t.closest("[data-jump]"); if (jp) { e.preventDefault(); const c = root.querySelector(`#bz-menu [data-tab="${jp.dataset.jump}"]`); if (c) { c.click(); c.scrollIntoView({ block: "nearest", inline: "center" }); } const mn = root.querySelector("#bz-menu"); if (mn) mn.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      const tb = t.closest("[data-tab]"); if (tb) { const box = tb.parentNode.parentNode; box.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === tb)); box.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== tb.dataset.tab); return; }
      const ad = t.closest("[data-add]"); if (ad) { cart[ad.dataset.add] = (cart[ad.dataset.add] || 0) + 1; sync(); return; }
      const sb = t.closest("[data-sub]"); if (sb) { const k = sb.dataset.sub; cart[k] = Math.max(0, (cart[k] || 0) - 1); if (!cart[k]) delete cart[k]; sync(); return; }
      const acc = t.closest("[data-acc]"); if (acc) { acc.parentNode.classList.toggle("op"); return; }
      if (t.closest("[data-bag]")) { if (!Object.keys(cart).length) { toast("Tap + on any item to add it"); const mn = root.querySelector("#bz-menu"); if (mn) mn.scrollIntoView({ behavior: "smooth" }); } else root.querySelector("[data-send]").click(); return; }
      if (!opts.loyLive && t.closest("[data-ljoin]")) { toast("Customers tap here to get their card"); return; }
      if (t.closest("[data-send]")) { e.preventDefault(); if (m.preview) { toast("Opens WhatsApp with the order"); return; } openCk(); return; }
      if (t.closest("[data-ckx]") || t === ck) { closeCk(); return; }
      const md = t.closest("[data-mode]"); if (md) { setMode(md.dataset.mode); return; }
      if (t.closest("[data-go]")) {
        const f = { mode }; ["name", "phone", "addr", "note"].forEach(k => f[k] = root.querySelector(`[data-f="${k}"]`).value.trim());
        if (!f.name) { toast("Please add your name"); root.querySelector('[data-f="name"]').focus(); return; }
        if (f.mode === "delivery" && !f.addr) { toast("Please add the delivery address"); root.querySelector('[data-f="addr"]').focus(); return; }
        try { localStorage.setItem("bz-me", JSON.stringify({ name: f.name, phone: f.phone, addr: f.mode === "delivery" ? f.addr : me().addr || "", mode: f.mode })); } catch (x) {}
        if (m.store) {
          const ph = f.phone.replace(/\D/g, "").slice(-10);
          if (!/^[6-9]\d{9}$/.test(ph)) { toast("Please add your 10-digit mobile number"); root.querySelector('[data-f="phone"]').focus(); return; }
          if (!opts.id) { toast("Customers place the order here"); return; }
          const go = t.closest("[data-go]"); go.disabled = true;
          const ref = newRef(), its = Object.entries(cart).filter(([, q]) => q).map(([k, q]) => [k, q, items[k].n]);
          try {
            const r = await fetch("/api/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bz-order", id: opts.id, ref, items: its, ...f, phone: ph, pay, direct: true }) });
            const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Couldn't place the order. Please try again.");
            track("order");
            const o = { ref, tot: j.tot || total(), at: Date.now(), pay, mode: f.mode, st: "new" };
            try { localStorage.setItem("bz-ord:" + opts.id, JSON.stringify([o, ...myOrders()].slice(0, 5))); } catch (x) {}
            Object.keys(cart).forEach(k => delete cart[k]); sync(); showDone(o);
          } catch (x) { toast(x.message); }
          go.disabled = false; return;
        }
        const ref = opts.id ? newRef() : "";
        track("order");
        if (ref) try { fetch("/api/qr", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bz-order", id: opts.id, ref, items: Object.entries(cart).filter(([, q]) => q).map(([k, q]) => [k, q, items[k].n]), ...f }) }); } catch (x) {}
        window.open("https://wa.me/" + m.wa + "?text=" + encodeURIComponent(orderText(f, ref)), "_blank", "noopener");
        closeCk(); Object.keys(cart).forEach(k => delete cart[k]); sync(); toast("Order sent. Thank you!"); return;
      }
      const cp = t.closest("[data-copy]"); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast("UPI ID copied"); } catch (x) {} return; }
      if (t.closest("[data-share]")) { try { if (navigator.share) await navigator.share({ title: m.name, url: m.pageUrl }); else { await navigator.clipboard.writeText(m.pageUrl); toast("Link copied"); } } catch (x) {} return; }
      if (t.closest("[data-vcf]")) {
        e.preventDefault(); const v = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + m.name, "ORG:" + m.name, m.ph ? "TEL;TYPE=WORK,VOICE:+" + m.ph : "", d.addr ? "ADR;TYPE=WORK:;;" + String(d.addr).replace(/[\n;]/g, " ") : "", "URL:" + m.pageUrl, "END:VCARD"].filter(Boolean).join("\r\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([v], { type: "text/vcard" })); a.download = m.name.replace(/[^\w ]+/g, "").trim().replace(/\s+/g, "-") + ".vcf"; a.click(); return;
      }
      const a = t.closest("a"); if (!a) return;
      const h = a.getAttribute("href") || "";
      if (h.startsWith("#") && h.length > 1) { e.preventDefault(); const el = root.querySelector(h); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (m.preview) e.preventDefault();
    };
    // Pop and Label: shrink the giant name until every line fits
    const fit = () => root.querySelectorAll(".fx").forEach(h => { h.style.fontSize = ""; let fs = parseFloat(getComputedStyle(h).fontSize), w = h.clientWidth, g = 0; while (g++ < 40 && fs > 18 && [...h.children].some(s => s.scrollWidth > w + 1)) { fs *= .95; h.style.fontSize = fs + "px"; } });
    if (root.querySelector(".fx")) { fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); addEventListener("resize", fit); }
    if (!opts.preview && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
      root.querySelectorAll(".rv").forEach(el => io.observe(el));
    } else root.querySelectorAll(".rv").forEach(el => el.classList.add("in"));
  }

  const blank = cat => {
    cat = CATS[cat] ? cat : "cafe"; const df = defaults(cat);
    return { biz: 1, t: "", cat, catx: "", area: "", tag: "", lay: df.lay, th: df.th, ac: "", hl: df.hl, sc: df.sc, logo: "", cover: "", phone: "", wa: "", ig: "", review: "", maps: "", addr: "",
      hours: { d: Array.from({ length: 7 }, () => ["09:00", "22:00", false]) }, offer: { on: false, label: "Today's offer", title: "", text: "", till: "" },
      ft: { on: false, label: "New arrival", title: "", text: "", p: "", was: "", img: "" }, ord: df.ord,
      menuTitle: df.menuTitle, menu: [{ n: CATS[cat].prop ? "For sale" : "Bestsellers", items: [{ n: "", p: "", d: "", b: false, i: "", ...(CATS[cat].prop ? { s: "sale" } : {}) }] }], galTitle: df.galTitle, gal: [], upi: { id: "", name: "" } };
  };

  window.KSBiz = { render, THEMES, LAYOUTS, CATS, GROUPS, blank, defaults, esc, PST };
})();
