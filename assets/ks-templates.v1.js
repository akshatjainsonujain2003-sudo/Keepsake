/* Keepsake designed website templates (Wildflower, Candlelit).
   - KSKit.DEMO[tpl]   : the example content a new website starts with
   - KSKit.FIELDS[tpl] : what the builder lets customers edit
   - KSKit.boot(tpl, render): runs a template with the customer's data (or the demo),
     and re-renders live when the builder sends new data.
   Customer text is only ever set with textContent. Links are checked before use.
   Files in /assets are cached for a year: rename (v2…) when changing. */
(function () {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const FIG = id => "https://www.figma.com/api/mcp/asset/" + id + ".png";
  const P = {
    heroTall: FIG("2748263e-1118-431f-8025-5089c39cd40f"), heroWide: FIG("a5cd53e9-c42f-472a-935c-e8b8e877ac18"),
    flatlay: FIG("9b8065f7-e8f3-4a16-a9e3-3ad9435aeaa5"), sunset: FIG("0a49e7a2-43b4-4aa2-a557-72993a4d18b4"),
    cafe: FIG("8b78f683-febb-442d-bdb3-1ad52739579c"), hands: FIG("1066ea2d-ff10-44cd-8786-09b55f985aaa"),
    seaside: FIG("93aa1a90-ca0d-4fa6-9f5d-28e2c63175a4"), steps: FIG("80c674ab-7ebb-4641-8f49-43aad59c2563"),
    rain: FIG("76f33412-7a51-4a97-9fee-948756d562c6"), wheat: FIG("c98f48dd-1f8b-4159-9d49-224f2df2f134"),
    lakedance: "/assets/wildflower/lakedance.webp", lotus: "/assets/wildflower/lotus.webp", twirl: "/assets/wildflower/twirl.webp"
  };
  const SCHEDULE = [{ time: "4:00 pm", what: "Welcome drinks" }, { time: "5:30 pm", what: "The ceremony" }, { time: "7:00 pm", what: "Dinner under the stars" }, { time: "9:30 pm", what: "Dancing, until they stop us" }];

  const DEMO = {
    wildflower: {
      v: 1, tpl: "wildflower", a: "Meera", b: "Aarav", tagline: "Five years, and counting",
      date: "2027-02-14T17:30", place: "Udaipur, Rajasthan", note: "us, obviously",
      photos: { hero: P.heroTall, hero2: P.lakedance, calendar: P.flatlay, cover: P.sunset },
      calnote: "save this one, it's ours",
      quote: "Somewhere between the first coffee and the last train home, you became my favourite place.",
      song: { url: "", title: "Slow Mornings", cap: "Press play. It's the one from our first drive." },
      countdown: true,
      words: "forever, you, home, always, us, every day, my person, still you",
      story: [
        { title: "The beginning", text: "A borrowed table at a crowded café, two coffees going cold, and a conversation neither of us wanted to end.", when: "March 2022", photo: P.cafe },
        { title: "The first trip", text: "Salt in our hair, the wrong ferry twice, and the moment we knew we travelled well together.", when: "August 2023", photo: P.seaside },
        { title: "The question", text: "Somewhere along the way, forever stopped feeling like a distant idea and started feeling like us.", when: "December 2025", photo: P.lotus },
        { title: "Still choosing you", text: "Every ordinary evening, every small win, every quiet Sunday. This is the chapter we're writing now.", when: "Today", photo: P.lakedance }
      ],
      momentsIntro: "The glances, the detours, the days we didn't want to end.",
      moments: [
        { photo: P.twirl, cap: "One more spin" }, { photo: P.wheat, cap: "The long drive to nowhere" },
        { photo: P.rain, cap: "One umbrella, two people" }, { photo: P.sunset, cap: "That sunset we almost missed" },
        { photo: P.heroWide, cap: "Your hand in mine" }
      ],
      love: ["The way you hum when you cook.", "How you always save me the last bite.", "Your terrible jokes. Every single one.", "That you remember my coffee order.", "How safe I feel when you hold my hand.", "You, on a lazy Sunday morning."],
      letterTitle: "Open when you miss me", greeting: "My love,",
      letter: "You make ordinary days feel like a holiday. You remember the small things, you laugh at my worst jokes, and you make every room feel like home.\n\nThank you for five years of choosing me, on the easy days and the hard ones. I'd choose you again, every single time.",
      sign: "Yours, Aarav",
      showDay: true, schedule: SCHEDULE,
      venue: { name: "The Garden Courtyard", address: "Lake Pichola, Udaipur, Rajasthan", map: "https://maps.google.com/?q=Udaipur", photo: P.wheat }
    },
    candlelit: {
      v: 1, tpl: "candlelit", a: "Meera", b: "Aarav", recipient: "Meera", tagline: "two hearts, one story",
      date: "2027-02-14T17:30", place: "The Garden Courtyard, Udaipur", cue: "a letter is waiting for you",
      photos: { hero: P.heroTall, storyA: P.cafe, storyB: P.steps, tv: P.rain, cover: P.sunset, end: P.steps },
      greeting: "Dear you,",
      letter: "Five years ago a crowded café gave me the best seat in the house: the one across from you. Since then you've turned rainy days into stories and ordinary evenings into the parts of life I want to keep.\n\nThis page holds a few of them, so you can open it whenever you miss me, and remember that I'd choose you again, every single time.",
      sign: "Always yours, Aarav",
      timeText: "half past five in the evening", toast: "let's raise a glass",
      words: "forever, always, only you, my love, home, every day",
      filmCaption: "by candlelight, always",
      storyKicker: "chapter one, and every one since",
      story: "Once upon a time, two people reached for the last free table at the same café. Neither of us gave it up, so we shared it, and talked until they stacked the chairs.\n\nThen came the wrong ferry, the right umbrella, a hundred late-night drives and one very nervous question. This is the part where we promise each other the rest.",
      showDay: true,
      schedule: [{ time: "4:00", what: "Arrival & welcome" }, { time: "5:30", what: "The promise" }, { time: "7:00", what: "Dinner by candlelight" }, { time: "9:30", what: "Dancing till late" }],
      momentsIntro: "The glances, journeys and quiet celebrations that shaped everything we're about to begin.",
      moments: [{ photo: P.hands, cap: "the yes" }, { photo: P.seaside, cap: "wrong ferry" }, { photo: P.sunset, cap: "that sunset" }, { photo: P.wheat, cap: "long walks" }],
      openWhen: [
        { when: "you miss me", msg: "Close your eyes. I'm thinking of you right now, I promise." },
        { when: "you can't sleep", msg: "Count every time I said I love you today. Then add one more." },
        { when: "you need a smile", msg: "Remember the wrong ferry? I still laugh about it." },
        { when: "we've had a fight", msg: "I'm already sorry. Let's get chai and start over." }
      ],
      song: { url: "", title: "Slow Mornings", note: "the one from our first drive" }
    }
  };

  // What the builder shows. type: text | area | date | photo | toggle | list(of) | strings
  const PHOTO_LIST = (key, label, max, extra) => ({ key, label, type: "list", max, add: "Add a photo", of: [{ key: "photo", label: "Photo", type: "photo" }, { key: "cap", label: "Caption", type: "text", max: 60 }].concat(extra || []) });
  const FIELDS = {
    wildflower: [
      { group: "The two of you", fields: [
        { key: "a", label: "First name", type: "text", max: 30 }, { key: "b", label: "Second name", type: "text", max: 30 },
        { key: "tagline", label: "Line above your names", type: "text", max: 60 },
        { key: "date", label: "Your date (shown on the calendar and countdown)", type: "date" },
        { key: "place", label: "Place", type: "text", max: 60 },
        { key: "note", label: "Handwritten note by the photos", type: "text", max: 30 },
        { key: "photos.hero", label: "Main photo", type: "photo" }, { key: "photos.hero2", label: "Polaroid photo", type: "photo" } ] },
      { group: "Calendar & song", fields: [
        { key: "photos.calendar", label: "Photo beside the calendar", type: "photo" },
        { key: "calnote", label: "Handwritten line under the calendar", type: "text", max: 50 },
        { key: "quote", label: "Quote", type: "area", max: 220 },
        { key: "song.url", label: "Spotify song link", type: "text", max: 300, placeholder: "https://open.spotify.com/track/…" },
        { key: "song.title", label: "Song name", type: "text", max: 50 },
        { key: "song.cap", label: "Line under the player", type: "text", max: 90 },
        { key: "photos.cover", label: "Album cover photo", type: "photo" },
        { key: "countdown", label: "Show the countdown", type: "toggle" },
        { key: "words", label: "Scrolling words (separate with commas)", type: "text", max: 160 } ] },
      { group: "Our story", fields: [
        { key: "story", label: "Chapters", type: "list", max: 6, add: "Add a chapter", of: [
          { key: "title", label: "Title", type: "text", max: 40 }, { key: "text", label: "What happened", type: "area", max: 300 },
          { key: "when", label: "When", type: "text", max: 30 }, { key: "photo", label: "Photo", type: "photo" } ] } ] },
      { group: "Little moments", fields: [
        { key: "momentsIntro", label: "Intro line", type: "text", max: 120 },
        PHOTO_LIST("moments", "Photos", 10) ] },
      { group: "Things I love about you", fields: [
        { key: "love", label: "Sticky notes", type: "strings", max: 9, item: "Something you love about them", add: "Add a note", itemMax: 90 } ] },
      { group: "The letter", fields: [
        { key: "letterTitle", label: "Heading", type: "text", max: 50 },
        { key: "greeting", label: "Greeting", type: "text", max: 40 },
        { key: "letter", label: "Your letter (leave a blank line between paragraphs)", type: "area", max: 2000 },
        { key: "sign", label: "Signed", type: "text", max: 40 } ] },
      { group: "The day (optional)", fields: [
        { key: "showDay", label: "Show this section", type: "toggle" },
        { key: "schedule", label: "Schedule", type: "list", max: 8, add: "Add a time", of: [{ key: "time", label: "Time", type: "text", max: 14 }, { key: "what", label: "What's happening", type: "text", max: 50 }] },
        { key: "venue.name", label: "Place name", type: "text", max: 50 }, { key: "venue.address", label: "Address", type: "text", max: 90 },
        { key: "venue.map", label: "Google Maps link", type: "text", max: 300, placeholder: "https://maps.app.goo.gl/…" },
        { key: "venue.photo", label: "Place photo", type: "photo" } ] }
    ],
    candlelit: [
      { group: "The two of you", fields: [
        { key: "recipient", label: "Who is it for? (shown on the wax seal screen)", type: "text", max: 30 },
        { key: "a", label: "First name", type: "text", max: 30 }, { key: "b", label: "Second name", type: "text", max: 30 },
        { key: "tagline", label: "Line above your names", type: "text", max: 60 },
        { key: "date", label: "Your date", type: "date" },
        { key: "place", label: "Place", type: "text", max: 60 },
        { key: "photos.hero", label: "Photo in the gold frame", type: "photo" } ] },
      { group: "The letter", fields: [
        { key: "greeting", label: "Greeting", type: "text", max: 40 },
        { key: "letter", label: "Your letter (leave a blank line between paragraphs)", type: "area", max: 2000 },
        { key: "sign", label: "Signed", type: "text", max: 40 } ] },
      { group: "Save the date", fields: [
        { key: "timeText", label: "Time, in words", type: "text", max: 50 },
        { key: "toast", label: "Closing line", type: "text", max: 40 },
        { key: "filmCaption", label: "Caption on the candlelight photo", type: "text", max: 40 },
        { key: "words", label: "Scrolling words (separate with commas)", type: "text", max: 160 } ] },
      { group: "Our story", fields: [
        { key: "storyKicker", label: "Line above the heading", type: "text", max: 60 },
        { key: "story", label: "Your story (leave a blank line between paragraphs)", type: "area", max: 1500 },
        { key: "photos.storyA", label: "Oval frame photo", type: "photo" }, { key: "photos.storyB", label: "Square frame photo", type: "photo" } ] },
      { group: "The evening (optional)", fields: [
        { key: "showDay", label: "Show this section", type: "toggle" },
        { key: "photos.tv", label: "Photo on the old TV", type: "photo" },
        { key: "schedule", label: "Programme", type: "list", max: 8, add: "Add a time", of: [{ key: "time", label: "Time", type: "text", max: 10 }, { key: "what", label: "What's happening", type: "text", max: 50 }] } ] },
      { group: "Moments so far", fields: [
        { key: "momentsIntro", label: "Intro line", type: "text", max: 140 },
        PHOTO_LIST("moments", "Framed photos", 8) ] },
      { group: "Open when…", fields: [
        { key: "openWhen", label: "Envelopes", type: "list", max: 8, add: "Add an envelope", of: [{ key: "when", label: "Open when…", type: "text", max: 30 }, { key: "msg", label: "Note inside", type: "area", max: 200 }] } ] },
      { group: "Song & ending", fields: [
        { key: "song.url", label: "Spotify song link", type: "text", max: 300, placeholder: "https://open.spotify.com/track/…" },
        { key: "song.title", label: "Song name", type: "text", max: 50 },
        { key: "song.note", label: "Note about it", type: "text", max: 60 },
        { key: "photos.cover", label: "Album cover photo", type: "photo" },
        { key: "photos.end", label: "Closing portrait", type: "photo" } ] }
    ]
  };
  const NAMES = { wildflower: "Wildflower", candlelit: "Candlelit" };
  const HINTS = { wildflower: "Linen, pressed flowers and a scrapbook of you two", candlelit: "Velvet, wax seals and gold, by candlelight" };

  // ---------- helpers ----------
  const str = (v, n) => String(v == null ? "" : v).slice(0, n || 4000);
  function img(u) {
    u = String(u || "").trim();
    if (/^\/api\/img\?id=[a-z0-9]{6,16}$/i.test(u) || /^\/assets\/[\w\/-]+\.(webp|png|jpe?g)$/i.test(u) || /^https:\/\/[^\s"'<>()]+$/i.test(u)) return u;
    return "";
  }
  function link(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
  function spotify(u) {
    const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,40})/.exec(String(u || "").trim());
    return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`, h: m[1] === "track" ? 152 : 352 } : null;
  }
  function date(v) { const d = new Date(String(v || "")); return isNaN(d) ? new Date("2027-02-14T17:30") : d; }
  const roman = n => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] || String(n + 1);
  const paras = t => str(t, 6000).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const words = t => str(t, 300).split(",").map(x => x.trim()).filter(Boolean).slice(0, 14);
  const fmt = {
    long: d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    dots: d => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`,
    weekday: d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    month: d => MONTHS[d.getMonth()]
  };
  function setText(root, sel, v) { root.querySelectorAll(sel).forEach(e => e.textContent = str(v, 4000)); }
  function setImg(el, u) { const s = img(u); if (!el) return; if (s) { el.src = s; el.hidden = false; el.closest(".pic,.pf,figure")?.classList.remove("empty"); } else { el.removeAttribute("src"); el.closest(".pic,.pf,figure")?.classList.add("empty"); } }
  function get(o, path) { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }
  function set(o, path, v) { const ks = path.split("."); let c = o; ks.slice(0, -1).forEach(k => { if (typeof c[k] !== "object" || c[k] == null) c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // fill any fields missing from older saves with the demo's values
  function withDefaults(tpl, d) {
    const base = clone(DEMO[tpl]);
    const merge = (a, b) => { Object.keys(b || {}).forEach(k => { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") merge(a[k], b[k]); else if (b[k] !== undefined) a[k] = b[k]; }); return a; };
    return merge(base, d || {});
  }

  // Run a template: customer data (from /s/:id), else the demo. Live-update from the builder.
  function boot(tpl, render) {
    const preview = /[?&]preview=1/.test(location.search);
    document.documentElement.classList.toggle("ks-preview", preview);
    const first = window.KS_DATA ? withDefaults(tpl, window.KS_DATA) : clone(DEMO[tpl]);
    render(first, true);
    if (window.KS_META && window.KS_META.ownerPreview) {
      const b = document.createElement("div");
      b.style.cssText = "position:sticky;top:0;z-index:200;background:#d6b06a;color:#2a0409;padding:10px 14px;text-align:center;font:600 14px/1.4 system-ui,sans-serif";
      b.append("Preview: only you can see this until it’s activated. ");
      const a = document.createElement("a"); a.href = "/builder?edit=" + encodeURIComponent(window.KS_META.id) + "#publish"; a.textContent = "Activate it"; a.style.color = "#2a0409"; b.append(a);
      document.body.prepend(b);
    }
    if (preview) window.addEventListener("message", e => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "ks-preview") return;
      render(withDefaults(tpl, e.data.data), false);
    });
  }

  window.KSKit = { DEMO, FIELDS, NAMES, HINTS, PHOTOS: P, img, link, spotify, date, roman, paras, words, fmt, str, setText, setImg, get, set, clone, withDefaults, boot };
})();
