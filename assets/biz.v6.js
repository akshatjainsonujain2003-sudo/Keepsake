/* KSBiz v2: renders a GetKeepsake business page (shops, cafés, salons, studios…) from its saved data.
   Used by /b/:id (live page) and /shops/studio (live preview while editing).
   KSBiz.render(root, data, { preview, url }) · KSBiz.THEMES · KSBiz.LAYOUTS · KSBiz.CATS · KSBiz.GROUPS · KSBiz.blank(cat) · KSBiz.defaults(cat)
   Files in /assets are cached for a year: copy to v3 when changing this file after it goes live. */
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
    riot:     { name: "Riot",     ink: "#6d5f0c", bg: "#efefdc", sf: "#fbfbef", sf2: "#e2e2c8", tx: "#2b2a1e", mu: "#6f6d58", ac: "#e3d44a", on: "#2b2a1e", hi: "#9bc0e2", hit: "#1d1c14", pal: ["#e3d44a", "#9bc0e2", "#c9913f"] }
  };

  const LAYOUTS = {
    classic:   { name: "Classic",   best: "Clinics, stores, professionals" },
    poster:    { name: "Poster",    best: "Cafés, food, fashion" },
    botanical: { name: "Botanical", best: "Salons, spas, florists, wellness" },
    bold:      { name: "Bold",      best: "Gyms, studios, services" }
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
    bold: "family=Anton&family=Inter:wght@400;500;600;700;800"
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
    if (document.getElementById("ks-biz2-css")) return;
    const s = document.createElement("style"); s.id = "ks-biz2-css";
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
.bz .toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:var(--tx);color:var(--bg);font:600 13px var(--fn);opacity:0;transition:.25s;pointer-events:none;z-index:9}
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
    const th = THEMES[d.th] || THEMES.espresso, lay = LAYOUTS[d.lay] ? d.lay : "classic";
    const name = clip(d.t || "Your business", 60), catDef = CATS[d.cat], prop = !!(catDef && catDef.prop);
    const cat = d.cat === "other" ? clip(d.catx, 30) : catDef ? catDef.name : "";
    const ph = phone10(d.phone), wa = phone10(d.wa || d.phone), ig = String(d.ig || "").replace(/^@/, "").replace(/[^\w.]/g, "").slice(0, 30);
    const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? d.upi : null;
    const menu = (Array.isArray(d.menu) ? d.menu : []).map((s, si) => ({
      si, n: clip(s && s.n || "Section", 24),
      items: (s && Array.isArray(s.items) ? s.items : []).map((x, ii) => x && x.n ? { key: si + "." + ii, n: clip(x.n, 50), p: prop ? clip(String(x.p || "").replace(/^\s*(₹|rs\.?|inr)\s*/i, ""), 24) : cleanP(x.p), d: clip(x.d, 140), b: !!x.b, img: safeImg(x.i), price: num(x.p), st: prop && PST[x.s] ? x.s : "" } : null).filter(Boolean).slice(0, 60)
    })).filter(s => s.items.length);
    const f = d.ft && d.ft.on && d.ft.title ? { label: clip(d.ft.label || "New", 24), title: clip(d.ft.title, 50), text: clip(d.ft.text, 200), p: prop ? clip(String(d.ft.p || "").replace(/^\s*(₹|rs\.?|inr)\s*/i, ""), 24) : cleanP(d.ft.p), was: cleanP(d.ft.was), img: safeImg(d.ft.img) } : null;
    return {
      d, th, lay, name, cat, area: clip(d.area, 40), tag: clip(d.tag, 140), cover: safeImg(d.cover), logo: safeImg(d.logo),
      hl: clip(d.hl, 60), sc: clip(d.sc, 24),
      ph, wa, ig, review: safeUrl(d.review), mapsU: safeUrl(d.maps) || (d.addr ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + d.addr) : ""),
      upi, upiLink: upi ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.name || name)}&cu=INR` : "",
      hi: hoursInfo(d.hours), menu, menuTitle: clip(d.menuTitle || "Menu", 24), gal: (Array.isArray(d.gal) ? d.gal : []).map(safeImg).filter(Boolean).slice(0, 10),
      galTitle: clip(d.galTitle || "Inside", 24), offer: d.offer && d.offer.on && d.offer.title ? d.offer : null, feat: f,
      stats: (Array.isArray(d.stats) ? d.stats : []).filter(x => x && x.v).slice(0, 4).map(x => ({ v: clip(x.v, 8), l: clip(x.l, 28) })),
      order: !prop && !!d.ord && !!wa, prop, loy: loyOf(d, prop), pageUrl: opts.url || location.href, preview: !!opts.preview
    };
  }

  // ---------- pieces shared by every layout ----------
  const P = {
    status(m) { const hi = m.hi; return hi ? `<span class="pill${hi.open ? "" : " cl"}"><i></i>${hi.open ? "Open now" + (hi.until ? " · till " + esc(hi.until) : "") : hi.nextOpen ? "Opens " + esc(hi.nextOpen) : "Closed now"}</span>` : "<span></span>"; },
    share: () => `<button class="ibtn" data-share aria-label="Share">${ic("share", 19)}</button>`,
    bag: m => m.order ? `<button class="ibtn" data-bag aria-label="Your order">${ic("bag", 19)}<em data-cnt hidden>0</em></button>` : "",
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
    qty: (m, it) => m.order && it.price != null ? `<span class="q" data-q="${it.key}"><button type="button" class="m" data-sub="${it.key}" aria-label="Remove one" hidden>${ic("minus", 16)}</button><b data-n="${it.key}" hidden>0</b><button type="button" data-add="${it.key}" aria-label="Add ${esc(it.n)}">${ic("plus", 16)}</button></span>` : "",
    offer: m => m.offer ? `<div class="sec rv"><div class="offer"><small>${esc(clip(m.offer.label || "Today's offer", 24))}</small><b>${esc(clip(m.offer.title, 60))}</b>${m.offer.text ? `<p>${esc(clip(m.offer.text, 160))}</p>` : ""}${m.offer.till ? `<span class="till">Valid till ${esc(clip(m.offer.till, 30))}</span>` : ""}</div></div>` : "",
    // Loyalty card: the live page fills it in (assets/loyal.v1.js); the studio preview shows a sample with a few stamps.
    loy(m) {
      const l = m.loy; if (!l) return "";
      const demo = m.preview ? Math.min(3, l.n - 1) : 0;
      const dots = Array.from({ length: l.n }, (_, i) => `<i class="${i < demo ? "on" : ""}${i === l.n - 1 ? " gf" : ""}">${i === l.n - 1 ? ic("gift", 18) : i < demo ? ic("check", 16) : `<u>${i + 1}</u>`}</i>`).join("");
      return `<div class="sec rv" id="bz-loy"><div class="loy" data-loy data-n="${l.n}"><div class="lh"><span class="lb">${ic("star", 13)} Loyalty card</span><span class="lc" data-lc>${demo ? demo + " / " + l.n : "Free to join"}</span></div>
        <b class="lr">${esc(l.r)}</b><p class="lp" data-lp>${l.t ? esc(l.t) : `Collect ${l.n} stamps, one every visit, and the ${esc(l.r.toLowerCase())} is on us.`}</p>
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
          ${s.items.map(x => `<div class="row"><button type="button" data-acc>${x.b ? "★ " : ""}<span>${esc(x.n)}</span>${x.p ? `<i>₹${esc(x.p)}</i>` : ""}${ic("plus", 16)}</button><div class="dd"><span>${esc(x.d || (x.p ? "₹" + x.p : ""))}</span>${P.qty(m, x)}</div></div>`).join("")}</div>`;
      }).join("");
      return `<div class="tb"><b>${esc(m.name)}</b><span style="display:flex;gap:8px">${P.bag(m)}${P.share()}</span></div>
        ${ph.length ? `<div class="strip${ph.length === 1 ? " one" : ""}">${ph.map(u => `<div><img src="${esc(u)}" alt=""></div>`).join("")}</div>` : ""}
        <div class="wrap"><div class="hx">${m.cat ? `<small>${esc(m.cat)}${m.area ? " · " + esc(m.area) : ""}</small>` : ""}<h1>${mark(m.hl || m.name)}</h1>${m.tag ? `<p class="nm">${esc(m.tag)}</p>` : ""}${cta}</div>
        <div style="text-align:center;margin-top:16px">${P.status(m).replace('class="pill', 'style="background:color-mix(in srgb,var(--tx) 80%,transparent)" class="pill')}</div>
        ${P.acts(m)}${P.offer(m)}${P.loy(m)}</div>
        ${m.prop ? `<div class="wrap">${P.props(m)}</div>` : m.menu.length ? `<div class="svc" id="bz-menu" style="--gs:min(${(88 / (Math.max(4, m.menuTitle.length) * 0.5)).toFixed(1)}vw,${Math.round(500 / (Math.max(4, m.menuTitle.length) * 0.5))}px)"><div class="gw">${esc(m.menuTitle)}</div><div class="cards wrap">${cards}</div></div>` : ""}
        <div class="wrap">${P.feat(m)}${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    }
  };

  function render(root, d, opts) {
    opts = opts || {}; css();
    const m = model(d, opts); fonts(m.lay);
    const th = m.th, ac = /^#[0-9a-f]{6}$/i.test(d.ac || "") ? d.ac : th.ac;
    root.className = "bz L-" + m.lay + (opts.preview ? " static" : " anim") + (th.dark ? " dk" : "");
    root.style.cssText = `--bg:${th.bg};--sf:${th.sf};--sf2:${th.sf2};--tx:${th.tx};--mu:${th.mu};--ac:${ac};--ink:${d.ac && ac === d.ac ? ac : th.ink || ac};--on:${th.on};--hi:${th.hi};--hit:${th.hit};--p1:${th.pal[0]};--p2:${th.pal[1]};--p3:${th.pal[2]}`;
    root.innerHTML = L[m.lay](m) + (m.order ? `<div class="bk" role="region" aria-label="Your order"><div class="bt" data-sum></div><a class="btn" data-send href="#">${ic("wa", 17)} Order on WhatsApp</a></div>` : "") + `<div class="toast"></div>`;

    const items = {}; m.menu.forEach(s => s.items.forEach(x => items[x.key] = x));
    const cart = {};
    const toast = t => { const e = root.querySelector(".toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._h); e._h = setTimeout(() => e.classList.remove("on"), 1800); };
    const sync = () => {
      let n = 0, tot = 0; Object.entries(cart).forEach(([k, q]) => { n += q; tot += q * (items[k].price || 0); });
      root.querySelectorAll("[data-n]").forEach(b => { const q = cart[b.dataset.n] || 0; b.textContent = q; b.hidden = !q; b.previousElementSibling.hidden = !q; });
      root.querySelectorAll("[data-cnt]").forEach(e => { e.textContent = n; e.hidden = !n; });
      const bk = root.querySelector(".bk"); if (!bk) return;
      bk.classList.toggle("on", n > 0);
      root.querySelector("[data-sum]").innerHTML = `${n} item${n === 1 ? "" : "s"} · ${money(tot)}<small>Tap to send your order to ${esc(m.name)}</small>`;
    };
    const orderText = () => {
      const lines = Object.entries(cart).filter(([, q]) => q).map(([k, q]) => `${q} × ${items[k].n} — ${money(q * items[k].price)}`);
      const tot = Object.entries(cart).reduce((t, [k, q]) => t + q * (items[k].price || 0), 0);
      return `Hi ${m.name}! I'd like to order:\n\n${lines.join("\n")}\n\nTotal: ${money(tot)}\n\nName:\nPickup / delivery address:`;
    };
    // Count taps for the owner's stats (live page only): Call, WhatsApp, Directions, Instagram, Pay, Review, Order.
    const track = ev => { if (!opts.id || m.preview) return; try { fetch("/api/qr?ev=" + encodeURIComponent(opts.id) + "&t=" + ev, { keepalive: true, cache: "no-store" }); } catch (x) {} };
    const kindOf = h => /^tel:/.test(h) ? "call" : /wa\.me\//.test(h) ? "wa" : /^upi:/.test(h) || h === "#bz-pay" ? "pay" : /instagram\.com/.test(h) ? "ig" : m.review && h === m.review ? "review" : /google\.[a-z.]+\/maps|maps\.app\.goo|goo\.gl\/maps/.test(h) || (m.mapsU && h === m.mapsU) ? "dir" : "";
    root.onclick = async e => {
      const t = e.target;
      const la = t.closest("a[href]"); if (la && !la.hasAttribute("data-send")) { const k = kindOf(la.getAttribute("href") || ""); if (k) track(k); }
      const tb = t.closest("[data-tab]"); if (tb) { const box = tb.parentNode.parentNode; box.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === tb)); box.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== tb.dataset.tab); return; }
      const ad = t.closest("[data-add]"); if (ad) { cart[ad.dataset.add] = (cart[ad.dataset.add] || 0) + 1; sync(); return; }
      const sb = t.closest("[data-sub]"); if (sb) { const k = sb.dataset.sub; cart[k] = Math.max(0, (cart[k] || 0) - 1); if (!cart[k]) delete cart[k]; sync(); return; }
      const acc = t.closest("[data-acc]"); if (acc) { acc.parentNode.classList.toggle("op"); return; }
      if (t.closest("[data-bag]")) { if (!Object.keys(cart).length) { toast("Tap + on any item to add it"); const mn = root.querySelector("#bz-menu"); if (mn) mn.scrollIntoView({ behavior: "smooth" }); } else root.querySelector("[data-send]").click(); return; }
      if (!opts.loyLive && t.closest("[data-ljoin]")) { toast("Customers tap here to get their card"); return; }
      if (t.closest("[data-send]")) { e.preventDefault(); if (m.preview) { toast("Opens WhatsApp with the order"); return; } track("order"); window.open("https://wa.me/" + m.wa + "?text=" + encodeURIComponent(orderText()), "_blank", "noopener"); return; }
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
