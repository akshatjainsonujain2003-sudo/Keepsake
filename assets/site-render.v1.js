/* Renders a Keepsake custom website from its saved data. Used by /builder (preview) and /s/:id (public page).
   Customer text is always inserted as text, never as HTML. Media links are rebuilt from parsed IDs.
   Files in /assets are cached for a year: rename (v2…) when changing. */
(function () {
  const THEMES = {
    reel: { name: "Velvet Reel", hint: "Cinematic, deep red, film strip", fonts: "Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=EB+Garamond:ital@0;1" },
    lace: { name: "Willow Lace", hint: "Garden, lace edges, gold frames", fonts: "Italiana&family=Lora:ital,wght@0,400;0,500;1,400" },
    sidea: { name: "Side A", hint: "Playlist, sage, a turning record", fonts: "Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Instrument+Serif:ital@0;1" },
    scrap: { name: "Scrapbook", hint: "Paper, polaroids, handwriting", fonts: "Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300&family=Caveat:wght@500;600" }
  };
  const SECTIONS = {
    story: { name: "Our story", fields: ["h", "text", "img"] },
    gallery: { name: "Photo gallery", fields: ["h", "imgs"] },
    songs: { name: "Songs (Spotify)", fields: ["h", "songs"] },
    video: { name: "Video", fields: ["h", "url"] },
    quote: { name: "Quote", fields: ["text", "by"] },
    timeline: { name: "Timeline", fields: ["h", "items"] },
    letter: { name: "Letter", fields: ["h", "text", "from"] },
    details: { name: "When & where", fields: ["h", "when", "where", "map"] }
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null && text !== "") e.textContent = String(text); return e; };
  const clean = (v, n) => String(v == null ? "" : v).slice(0, n || 2000);

  // Only our own uploaded photos or https images.
  function imgUrl(u) {
    u = String(u || "").trim();
    if (/^\/api\/img\?id=[a-z0-9]{6,16}$/i.test(u)) return u;
    if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
    return "";
  }
  function spotify(u) {
    const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]{10,40})/.exec(String(u || "").trim());
    return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: m[1] === "track" || m[1] === "episode" ? 152 : 352 } : null;
  }
  function video(u) {
    u = String(u || "").trim(); let m;
    if ((m = /^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)([\w-]{11})/.exec(u)) || (m = /^https:\/\/youtu\.be\/([\w-]{11})/.exec(u)))
      return { kind: "frame", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
    if ((m = /^https:\/\/(?:www\.)?vimeo\.com\/(\d{5,12})/.exec(u))) return { kind: "frame", src: `https://player.vimeo.com/video/${m[1]}` };
    if (/^https:\/\/[^\s"'<>]+\.(mp4|webm|mov)(\?[^\s"'<>]*)?$/i.test(u)) return { kind: "file", src: u };
    return null;
  }
  function mapUrl(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }

  function photo(url, editing, label) {
    const u = imgUrl(url);
    if (u) { const i = el("img"); i.src = u; i.alt = ""; i.loading = "lazy"; i.decoding = "async"; return i; }
    return editing ? el("div", "k-ph", label || "Add a photo") : null;
  }
  const add = (parent, child) => { if (child) parent.appendChild(child); return child; };
  const heading = (wrap, s, fallback) => { const t = clean(s.h, 120) || fallback; if (t) add(wrap, el("h2", null, t)); };

  function section(s, theme, editing) {
    const def = SECTIONS[s.type]; if (!def) return null;
    const sec = el("section", "k-sec k-" + s.type), wrap = add(sec, el("div", "k-wrap"));
    const box = theme === "scrap" && s.type !== "gallery" ? add(wrap, el("div", "k-card")) : wrap;
    const polaroid = img => { if (!img) return null; if (theme !== "scrap") return img; const p = el("div", "k-pol"); p.appendChild(img); return p; };
    switch (s.type) {
      case "story": {
        heading(box, s, editing ? "Our story" : "");
        const im = photo(s.img, editing);
        if (im) { if (theme === "lace") { const o = add(box, el("div", "k-oval")); o.appendChild(im); } else add(box, polaroid(im)); }
        add(box, el("div", "k-text", clean(s.text, 4000) || (editing ? "Write how it all began…" : "")));
        break;
      }
      case "gallery": {
        heading(wrap, s, "");
        const imgs = (Array.isArray(s.imgs) ? s.imgs : []).map(imgUrl).filter(Boolean).slice(0, 24);
        if (!imgs.length && !editing) return null;
        // The film strip runs edge to edge; other themes keep the gallery in the text column.
        const g = add(theme === "reel" ? sec : wrap, el("div", "k-gal"));
        (imgs.length ? imgs : ["", "", ""]).forEach(u => add(g, polaroid(photo(u, editing, " "))));
        break;
      }
      case "songs": {
        heading(box, s, editing ? "Songs that remind me of you" : "");
        const list = add(box, el("div", "k-songs"));
        const songs = (Array.isArray(s.songs) ? s.songs : []).slice(0, 12);
        let shown = 0;
        songs.forEach(x => {
          const sp = spotify(x.url); if (!sp && !editing) return;
          const row = add(list, el("div", "k-song"));
          if (sp) { const f = el("iframe", "k-embed"); f.src = sp.src; f.height = sp.h; f.loading = "lazy"; f.allow = "encrypted-media; clipboard-write; fullscreen"; f.title = "Spotify"; row.appendChild(f); }
          else row.appendChild(el("div", "k-ph", "Paste a Spotify song link"));
          if (x.note) add(row, el("p", "k-song-note", clean(x.note, 300)));
          shown++;
        });
        if (!shown) { if (!editing) return null; add(list, el("div", "k-ph", "Add a Spotify song link")); }
        break;
      }
      case "video": {
        const v = video(s.url); if (!v && !editing) return null;
        heading(box, s, "");
        const frame = add(box, el("div", "k-video"));
        if (!v) frame.appendChild(el("div", "k-ph", "Paste a YouTube, Vimeo or .mp4 link"));
        else if (v.kind === "frame") { const f = el("iframe"); f.src = v.src; f.loading = "lazy"; f.allow = "fullscreen; picture-in-picture"; f.allowFullscreen = true; f.title = "Video"; frame.appendChild(f); }
        else { const vd = el("video"); vd.src = v.src; vd.controls = true; vd.playsInline = true; vd.preload = "metadata"; frame.appendChild(vd); }
        break;
      }
      case "quote": {
        const t = clean(s.text, 600); if (!t && !editing) return null;
        add(box, el("blockquote", null, t || "A line you both love…"));
        if (s.by) add(box, el("cite", null, clean(s.by, 120)));
        break;
      }
      case "timeline": {
        heading(box, s, editing ? "Our timeline" : "");
        const items = (Array.isArray(s.items) ? s.items : []).filter(x => x && (x.when || x.what)).slice(0, 30);
        if (!items.length && !editing) return null;
        const ul = add(box, el("ul", "k-tl"));
        (items.length ? items : [{ when: "Day one", what: "Add your first moment" }]).forEach(x => { const li = add(ul, el("li")); add(li, el("b", null, clean(x.when, 60))); add(li, el("span", null, clean(x.what, 300))); });
        break;
      }
      case "letter": {
        const t = clean(s.text, 6000); if (!t && !editing) return null;
        heading(box, s, "");
        add(box, el("div", "k-text", t || "Write something only they will read…"));
        if (s.from) add(box, el("div", "k-from", clean(s.from, 80)));
        break;
      }
      case "details": {
        if (!s.when && !s.where && !editing) return null;
        heading(box, s, "");
        const holder = theme === "reel" ? add(box, el("div", "k-ticket")) : box;
        if (theme === "reel") add(holder, el("div", "k-admit", "ADMIT TWO"));
        add(holder, el("div", "k-when", clean(s.when, 120) || (editing ? "Saturday, 14 February" : "")));
        const w = clean(s.where, 300); if (w) add(holder, el("div", "k-where k-text", w));
        const m = mapUrl(s.map); if (m) { const a = add(holder, el("a", "k-map", "Open in Maps")); a.href = m; a.target = "_blank"; a.rel = "noopener"; }
        break;
      }
    }
    return sec;
  }

  function loadFonts(theme) {
    const t = THEMES[theme]; if (!t) return;
    const id = "kss-font-" + theme; if (document.getElementById(id)) return;
    const l = document.createElement("link"); l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + t.fonts + "&display=swap";
    document.head.appendChild(l);
  }

  // data: { theme, t, sub, date, cover, sections: [...] }. opts.editing shows placeholders for empty parts.
  function render(root, data, opts) {
    opts = opts || {};
    const theme = THEMES[data.theme] ? data.theme : "reel";
    loadFonts(theme);
    root.className = "kss"; root.dataset.theme = theme; root.textContent = "";
    const hero = add(root, el("header", "k-hero"));
    if (theme !== "sidea") add(hero, photo(data.cover, opts.editing, "Add a cover photo"));
    const hin = add(hero, el("div", "k-hero-in"));
    // Side A puts the cover photo in the middle of a turning record instead of behind the title.
    if (theme === "sidea") { const rec = add(hin, el("div", "k-record")); add(rec, photo(data.cover, opts.editing, " ")); }
    add(hin, el("h1", null, clean(data.t, 80) || (opts.editing ? "Your names" : "")));
    if (data.sub) add(hin, el("div", "k-sub", clean(data.sub, 160)));
    if (data.date) add(hin, el("div", "k-date", clean(data.date, 60)));
    (Array.isArray(data.sections) ? data.sections : []).slice(0, 30).forEach(s => add(root, section(s || {}, theme, opts.editing)));
    const f = add(root, el("footer", "k-foot"));
    f.append("Made with ");
    const a = add(f, el("a", null, "Keepsake")); a.href = "/"; a.target = "_top";
    return root;
  }

  // Ready-made starting content so a new website never begins empty.
  function starter(theme) {
    return {
      v: 1, theme: theme || "reel", t: "Meera & Aarav", sub: "Five years, one story", date: "14 February 2027", cover: "",
      sections: [
        { type: "story", h: "How it started", text: "A borrowed umbrella outside the library, and a conversation that didn't end when the rain did.\n\nWe've been finishing each other's sentences ever since.", img: "" },
        { type: "gallery", h: "Little moments", imgs: [] },
        { type: "songs", h: "Songs that remind me of you", songs: [{ url: "", note: "The one from our first drive" }] },
        { type: "timeline", h: "Our timeline", items: [{ when: "2022", what: "First coffee, three hours long" }, { when: "2023", what: "Goa, and the sunset we missed" }, { when: "2025", what: "Our first home" }] },
        { type: "letter", h: "Open when you miss me", text: "You make ordinary days feel like a holiday. Thank you for every one of them.", from: "Yours, always" },
        { type: "details", h: "Save the date", when: "Saturday, 14 February 2027", where: "The Garden Courtyard\nUdaipur", map: "" }
      ]
    };
  }

  window.KSSite = { render, starter, THEMES, SECTIONS, imgUrl, spotify, video };
})();
