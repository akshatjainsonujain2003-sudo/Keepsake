// robots.txt, sitemap.xml and /api/config, in one function (the hosting plan allows at most 12).
const pages = ["/", "/shops/cafe", "/shops/salon", "/shops/gym", "/shops/real-estate", "/shops/general-store", "/shops/boutique", "/shops/clinic", "/shops/bakery", "/shops/sweet-shop", "/shops/restaurant", "/shops/cloud-kitchen", "/shops/tea-stall", "/shops/jewellery", "/shops/ethnic-wear", "/shops/gift-shop", "/shops/barber", "/shops/coaching", "/shops/optician", "/shops/hardware", "/shops/mobile-repair", "/shops/jaipur", "/hi/dukaan-ki-website", "/hi/qr-menu-kaise-banaye", "/hi/whatsapp-gst-bill", "/gifts", "/wedding", "/digital-gifts", "/gifts/girlfriend", "/gifts/boyfriend", "/gifts/anniversary", "/gifts/birthday", "/gifts/karva-chauth", "/gifts/long-distance", "/designs", "/contact", "/terms", "/privacy", "/refunds", "/shipping"];
// Date the public pages last changed. Bump it when page content changes; search engines trust lastmod only when it's accurate.
const UPDATED = "2026-10-31";
// Private or per-customer paths: crawled by nobody (they are also noindex).
const PRIVATE = ["/admin", "/hq", "/api/", "/login", "/dashboard", "/account", "/creator", "/shops/dashboard", "/shops/my", "/m/", "/s/", "/c/", "/k/", "/u/", "/p/", "/bill/", "/ca/"];
const handler = async (req, res) => {
  const q = req.query || {};
  // Shop pages (/b/<id>, rewritten here): the page with the shop's own title, description, local business data and readable copy.
  if (q.f === "shop") {
    const S = require("./_shopseo"), id = String(q.id || "");
    let m = null; if (/^[a-z0-9]{8,16}$/i.test(id)) { try { m = await require("./_db").getj("customer-memory:" + id); } catch (e) {} }
    let r; try { r = S.page(m, id); } catch (e) { console.error("shop page", id, e.message); res.setHeader("Cache-Control", "no-store"); return res.redirect(302, "/biz?b=" + encodeURIComponent(id)); }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
    return res.status(r.status).send(r.html);
  }
  // IndexNow key file (/<key>.txt): search engines check it before trusting our pings.
  if (q.f === "inkey") { res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.status(200).send(require("./_shopseo").INDEXNOW_KEY); }
  if (q.f === "config") { // public settings: Meta Pixel ID from META_PIXEL_ID
    const id = String(process.env.META_PIXEL_ID || "").trim();
    res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).send(JSON.stringify({ pixel: /^\d{6,20}$/.test(id) ? id : "", scanAI: !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY) }));
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  if (q.f === "robots") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    // AI answer engines (ChatGPT, Perplexity, Claude, Gemini, Apple, Common Crawl) may read the public pages, same as search engines.
    const ai = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot"];
    const dis = PRIVATE.map(x => "Disallow: " + x).join("\n");
    return res.status(200).send(ai.map(b => `User-agent: ${b}`).join("\n") + `\nAllow: /\n${dis}\n\nUser-agent: *\nAllow: /\n${dis}\n\nSitemap: https://getkeepsake.in/sitemap.xml\n# Plain summary for AI assistants: https://getkeepsake.in/llms.txt\n`);
  }
  const base = "https://getkeepsake.in", day = new Date().toISOString().slice(0, 10);
  // Live shop pages that are ready for Google (see api/_shopseo.js), each with its last update.
  let shops = []; try { shops = await require("./_shopseo").sitemapShops(); } catch (e) {}
  const iso = t => t ? new Date(t).toISOString().slice(0, 10) : day;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `<url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${UPDATED}</lastmod></url>`).concat(shops.map(x => `<url><loc>${base}/b/${x.id}</loc><lastmod>${iso(x.at)}</lastmod></url>`)).join("\n") + "\n</urlset>");
};
module.exports = handler;
module.exports.PAGES = pages;
