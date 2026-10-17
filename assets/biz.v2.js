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
    stores:   { name: "Stores & Professionals", gal: "Our store", ord: false }
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
    ["health", "clinic", "Doctor & Clinic", "classic", "ocean", "", "", "Services"],
    ["health", "dentist", "Dental Clinic", "classic", "ocean", "", "", "Treatments"],
    ["health", "pharmacy", "Pharmacy", "classic", "sage", "", "", "Products"],
    ["health", "optician", "Optician", "classic", "ocean", "", "", "Frames & lenses"],
    ["health", "lab", "Diagnostic Lab", "classic", "ocean", "", "", "Tests"],
    ["stores", "grocery", "Kirana & Grocery", "classic", "linen", "", "", "Products"],
    ["stores", "store", "General Store", "classic", "linen", "", "", "Products"],
    ["stores", "hardware", "Hardware & Electricals", "classic", "ocean", "", "", "Products"],
    ["stores", "realestate", "Real Estate", "classic", "noir", "", "", "Properties"],
    ["stores", "pro", "CA, Lawyer & Consultant", "classic", "noir", "", "", "Services"],
    ["stores", "other", "Something else", "classic", "espresso", "", "", "Menu"]
  ];
  const CATS = {}, GROUPS = [];
  CAT_LIST.forEach(([g, k, label, lay, th, hl, sc, menuTitle]) => {
    CATS[k] = { label: k === "other" ? "" : label, name: label, group: g, lay, th, hl, sc, menuTitle, galTitle: GROUP_DEF[g].gal, ord: GROUP_DEF[g].ord };
    let gr = GROUPS.find(x => x.key === g); if (!gr) GROUPS.push(gr = { key: g, name: GROUP_DEF[g].name, cats: [] }); gr.cats.push(k);
  });
  const defaults = cat => { const c = CATS[cat] || CATS.other; return { lay: c.lay, th: c.th, hl: c.hl, sc: c.sc, menuTitle: c.menuTitle, galTitle: c.galTitle, ord: c.ord }; };

  const FONTS = {
    classic: "family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Inter:wght@400;500;600;700",
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
    down: '<path d="m6 9 6 6 6-6"/>'
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

/* ---------- Classic ---------- */
.L-classic .hero{position:relative;height:min(64vh,560px);min-height:400px;overflow:hidden;background:var(--sf2)}
.L-classic .hero .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 40%}
.L-classic .hero .sh{position:absolute;inset:0;background:linear-gradient(180deg,#0006 0%,#0000 28%,#0000 45%,var(--bg) 100%)}
.bz .ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--mu);font:italic 400 22px var(--fh);background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--ac) 35%,transparent),transparent 60%),var(--sf2)}
.L-classic .top,.L-poster .top{position:absolute;left:18px;right:18px;top:16px;display:flex;justify-content:space-between;align-items:center;gap:10px;z-index:3}
.L-classic .id{position:relative;margin-top:-92px;padding:0 22px;text-align:center;z-index:2}
.L-classic h1{font:500 clamp(34px,9vw,46px)/1.04 var(--fh);letter-spacing:-.015em;margin:16px 0 8px}
.bz .tag{font:italic 400 18px/1.45 var(--fh);color:var(--mu);margin:10px auto 0;max-width:380px}
.bz .feat{margin:0 18px;border-radius:26px;overflow:hidden;background:var(--hi);color:var(--hit);display:grid}
.L-classic .feat{grid-template-columns:1fr}
.L-classic .feat img{width:100%;aspect-ratio:16/10;object-fit:cover}
.L-classic .feat .fx{padding:22px}
.bz .feat small{font:700 11px var(--fn);letter-spacing:.22em;text-transform:uppercase;opacity:.75}
.bz .feat h3{margin:6px 0 6px;font:500 28px/1.1 var(--fh)}
.bz .feat p{margin:0 0 14px;font:400 14px/1.5 var(--fn);opacity:.85}
.bz .feat .pr{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.bz .feat .pr b{font:700 26px var(--fn)}.bz .feat .pr s{opacity:.55;font:600 16px var(--fn)}

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

  // Everything the layouts need, cleaned and validated once.
  function model(d, opts) {
    const th = THEMES[d.th] || THEMES.espresso, lay = LAYOUTS[d.lay] ? d.lay : "classic";
    const name = clip(d.t || "Your business", 60), catDef = CATS[d.cat];
    const cat = d.cat === "other" ? clip(d.catx, 30) : catDef ? catDef.name : "";
    const ph = phone10(d.phone), wa = phone10(d.wa || d.phone), ig = String(d.ig || "").replace(/^@/, "").replace(/[^\w.]/g, "").slice(0, 30);
    const upi = d.upi && /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(d.upi.id || "") ? d.upi : null;
    const menu = (Array.isArray(d.menu) ? d.menu : []).map((s, si) => ({
      si, n: clip(s && s.n || "Section", 24),
      items: (s && Array.isArray(s.items) ? s.items : []).map((x, ii) => x && x.n ? { key: si + "." + ii, n: clip(x.n, 50), p: cleanP(x.p), d: clip(x.d, 140), b: !!x.b, img: safeImg(x.i), price: num(x.p) } : null).filter(Boolean).slice(0, 60)
    })).filter(s => s.items.length);
    const f = d.ft && d.ft.on && d.ft.title ? { label: clip(d.ft.label || "New", 24), title: clip(d.ft.title, 50), text: clip(d.ft.text, 200), p: cleanP(d.ft.p), was: cleanP(d.ft.was), img: safeImg(d.ft.img) } : null;
    return {
      d, th, lay, name, cat, area: clip(d.area, 40), tag: clip(d.tag, 140), cover: safeImg(d.cover), logo: safeImg(d.logo),
      hl: clip(d.hl, 60), sc: clip(d.sc, 24),
      ph, wa, ig, review: safeUrl(d.review), mapsU: safeUrl(d.maps) || (d.addr ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + d.addr) : ""),
      upi, upiLink: upi ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.name || name)}&cu=INR` : "",
      hi: hoursInfo(d.hours), menu, menuTitle: clip(d.menuTitle || "Menu", 24), gal: (Array.isArray(d.gal) ? d.gal : []).map(safeImg).filter(Boolean).slice(0, 10),
      galTitle: clip(d.galTitle || "Inside", 24), offer: d.offer && d.offer.on && d.offer.title ? d.offer : null, feat: f,
      order: !!d.ord && !!wa, pageUrl: opts.url || location.href, preview: !!opts.preview
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
    review: m => m.review ? `<div class="sec rv"><div class="card rev"><div style="flex:1"><div class="st">${Array(5).fill(ic("star", 18)).join("")}</div><b>Loved your visit?</b><p>A quick Google review helps us a lot.</p></div><a class="btn" href="${esc(m.review)}" target="_blank" rel="noopener">Review us</a></div></div>` : "",
    list(m) { // menu as an elegant list with tabs (Classic, Botanical)
      if (!m.menu.length) return "";
      const count = m.menu.reduce((n, s) => n + s.items.length, 0);
      return `<div class="sec rv" id="bz-menu"><div class="h2"><b>${esc(m.menuTitle)}</b><small>${count} item${count > 1 ? "s" : ""}</small></div>
        ${m.menu.length > 1 ? `<div class="tabs">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="card menu" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(x => `<div class="it">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ""}<div class="tx"><div class="r"><span class="n">${esc(x.n)}${x.b ? '<span class="bs">Bestseller</span>' : ""}</span><span class="dl"></span>${x.p ? `<span class="p">₹${esc(x.p)}</span>` : ""}</div>${x.d ? `<p class="d">${esc(x.d)}</p>` : ""}</div>${P.qty(m, x)}</div>`).join("")}</div>`).join("")}</div>`;
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
      return `<div class="hero">${m.cover ? `<img class="cv kb" src="${esc(m.cover)}" alt="">` : `<div class="ph">${esc(m.name)}</div>`}<div class="sh"></div>
        <div class="top">${P.status(m)}<span style="display:flex;gap:8px">${P.bag(m)}${P.share()}</span></div></div>
        <div class="wrap"><div class="id">${P.logo(m)}<h1>${esc(m.name)}</h1>${m.cat || m.area ? `<div class="cat">${esc([m.cat, m.area].filter(Boolean).join(" · "))}</div>` : ""}${m.tag ? `<p class="tag">${esc(m.tag)}</p>` : ""}</div>
        ${P.acts(m)}${P.offer(m)}${P.feat(m)}${P.review(m)}${P.list(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    },
    poster(m) {
      const words = plain(m.hl || m.name).trim().split(/\s+/), w1 = words.shift() || "", w2 = words.join(" ");
      const gridSec = m.menu.length ? `<div class="sec rv" id="bz-menu"><div class="mh"><div><b>${esc(m.menuTitle)}</b>${m.cat ? `<i>${esc(m.cat.split(/[ &,]/)[0].toLowerCase())}</i>` : ""}</div><small>${m.menu.reduce((n, s) => n + s.items.length, 0)} items</small></div>
        ${m.menu.length > 1 ? `<div class="chips">${m.menu.map((s, i) => `<button type="button" data-tab="${i}"${i ? "" : ' class="on"'}>${esc(s.n)}</button>`).join("")}</div>` : ""}
        ${m.menu.map((s, i) => `<div class="grid" data-pane="${i}"${i ? " hidden" : ""}>${s.items.map(x => `<div class="pc"><div class="im">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni">${esc(x.n.charAt(0).toUpperCase())}</span>`}${x.b ? '<span class="bs">Bestseller</span>' : ""}</div><b>${esc(x.n)}</b>${x.d ? `<p>${esc(x.d)}</p>` : "<p></p>"}<div class="rw"><span class="p">${x.p ? "₹" + esc(x.p) : ""}</span>${P.qty(m, x)}</div></div>`).join("")}</div>`).join("")}</div>` : "";
      const f = m.feat, fw = f ? f.label.split(/\s+/) : [];
      const featSec = f ? `<div class="sec rv" style="padding:30px 0 0"><div class="feat"><div class="ww"><span>${esc(fw[0] || "")}</span>${fw.length > 1 ? `<em>${esc(fw.slice(1).join(" "))}</em>` : ""}</div>${m.sc ? `<span class="sc2">${esc(m.sc)}</span>` : ""}
        <h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}${f.p ? `<div class="pr"><b>₹${esc(f.p)}</b>${f.was ? `<s>₹${esc(f.was)}</s>` : ""}</div>` : ""}${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy">` : '<div class="pad"></div>'}</div></div>` : "";
      return `<div class="hero">${m.cover ? `<img class="cv kb" src="${esc(m.cover)}" alt="">` : `<div class="ph"></div>`}<div class="sh"></div>
        <div class="top"><span class="brand">${esc(m.name)}</span><span class="r">${P.bag(m)}${P.share()}</span></div>
        <div class="big w1">${esc(w1)}</div>${w2 ? `<div class="big w2">${esc(w2)}</div>` : ""}${m.sc ? `<div class="scr">${esc(m.sc)}</div>` : ""}
        <div class="foot1">${P.status(m)}${m.menu.length ? `<a class="btn" href="#bz-menu">${esc(m.menuTitle)} ${ic("arrow", 16)}</a>` : ""}</div></div>
        <div class="wrap"><div class="id">${P.logo(m)}<div><h1>${esc(m.name)}</h1>${m.cat || m.area ? `<div class="cat" style="margin-top:6px">${esc([m.cat, m.area].filter(Boolean).join(" · "))}</div>` : ""}</div></div>${m.tag ? `<p class="tag">${esc(m.tag)}</p>` : ""}
        ${P.acts(m)}${P.offer(m)}${gridSec}</div>${featSec}<div class="wrap">${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
    },
    botanical(m) {
      const all = m.menu.flatMap(s => s.items), pics = all.filter(x => x.img);
      const pick = (pics.length >= 2 ? pics : all).slice().sort((a, b) => b.b - a.b).slice(0, 8);
      const ribbon = (m.offer ? m.offer.title : m.tag ? m.tag.split(/[.!]/)[0] : "Welcome to " + m.name).slice(0, 60);
      const rib = Array(8).fill(esc(ribbon) + "  ✦  ").join("");
      const wave = `<svg class="wave" viewBox="0 0 400 74" preserveAspectRatio="none" aria-hidden="true"><path class="fl" d="M0 30 Q50 6 100 30 T200 30 T300 30 T400 30 V74 H0Z"/><path id="bzw" class="ln" d="M0 30 Q50 6 100 30 T200 30 T300 30 T400 30"/><path class="ln" d="M0 56 Q50 32 100 56 T200 56 T300 56 T400 56"/>
        <text dy="17"><textPath href="#bzw" startOffset="0">${rib}${m.preview ? "" : `<animate attributeName="startOffset" from="0" to="-400" dur="16s" repeatCount="indefinite"/>`}</textPath></text></svg>`;
      const arch = pick.length >= 2 ? `<div class="sec rv"><div class="ctr">${pick.some(x => x.b) ? "Bestsellers" : "Featured"}</div><div class="arches">${pick.map(x => `<div class="ar"><div class="im">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="ni">${esc(x.n.charAt(0).toUpperCase())}</span>`}</div>${x.b ? '<span class="bd">Best&shy;seller</span>' : ""}<b>${esc(x.n)}</b>${x.p ? `<span class="p">₹${esc(x.p)}</span>` : ""}${P.qty(m, x) ? `<div>${P.qty(m, x)}</div>` : ""}</div>`).join("")}</div></div>` : "";
      return `${m.offer || m.area ? `<div class="ann">${esc(m.offer ? m.offer.title + (m.offer.till ? " · till " + m.offer.till : "") : m.area)}</div>` : ""}
        <div class="hd">${P.share()}<b>${esc(m.name)}</b>${P.bag(m) || "<span></span>"}</div>
        <div class="hero">${m.cover ? `<img class="cv kb" src="${esc(m.cover)}" alt="">` : `<div class="ph">${esc(m.name)}</div>`}${P.status(m)}
        <div class="hcard"><h1>${esc(plain(m.hl) || m.name)}</h1>${m.tag ? `<p>${esc(m.tag)}</p>` : ""}${m.menu.length ? `<a class="btn" href="#bz-menu">View ${esc(m.menuTitle.toLowerCase())}</a>` : ""}</div></div>${wave}
        <div class="wrap"><div class="id">${P.logo(m)}<h2>${esc(m.name)}</h2>${m.cat || m.area ? `<div class="cat">${esc([m.cat, m.area].filter(Boolean).join(" · "))}</div>` : ""}</div>
        ${P.acts(m)}${arch}${P.feat(m)}${P.list(m)}${P.offer(m)}${P.review(m)}${P.gallery(m)}${P.tail(m)}</div>`;
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
        ${P.acts(m)}${P.offer(m)}</div>
        ${m.menu.length ? `<div class="svc" id="bz-menu" style="--gs:min(${(88 / (Math.max(4, m.menuTitle.length) * 0.5)).toFixed(1)}vw,${Math.round(500 / (Math.max(4, m.menuTitle.length) * 0.5))}px)"><div class="gw">${esc(m.menuTitle)}</div><div class="cards wrap">${cards}</div></div>` : ""}
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
    root.onclick = async e => {
      const t = e.target;
      const tb = t.closest("[data-tab]"); if (tb) { const box = tb.parentNode.parentNode; box.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === tb)); box.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== tb.dataset.tab); return; }
      const ad = t.closest("[data-add]"); if (ad) { cart[ad.dataset.add] = (cart[ad.dataset.add] || 0) + 1; sync(); return; }
      const sb = t.closest("[data-sub]"); if (sb) { const k = sb.dataset.sub; cart[k] = Math.max(0, (cart[k] || 0) - 1); if (!cart[k]) delete cart[k]; sync(); return; }
      const acc = t.closest("[data-acc]"); if (acc) { acc.parentNode.classList.toggle("op"); return; }
      if (t.closest("[data-bag]")) { if (!Object.keys(cart).length) { toast("Tap + on any item to add it"); const mn = root.querySelector("#bz-menu"); if (mn) mn.scrollIntoView({ behavior: "smooth" }); } else root.querySelector("[data-send]").click(); return; }
      if (t.closest("[data-send]")) { e.preventDefault(); if (m.preview) { toast("Opens WhatsApp with the order"); return; } window.open("https://wa.me/" + m.wa + "?text=" + encodeURIComponent(orderText()), "_blank", "noopener"); return; }
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
      menuTitle: df.menuTitle, menu: [{ n: "Bestsellers", items: [{ n: "", p: "", d: "", b: false, i: "" }] }], galTitle: df.galTitle, gal: [], upi: { id: "", name: "" } };
  };

  window.KSBiz = { render, THEMES, LAYOUTS, CATS, GROUPS, blank, defaults, esc };
})();
