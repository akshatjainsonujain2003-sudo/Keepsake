// robots.txt, sitemap.xml and /api/config, in one function (the hosting plan allows at most 12).
const pages = ["/", "/shops", "/shops/cafe", "/shops/salon", "/shops/gym", "/shops/real-estate", "/shops/general-store", "/shops/boutique", "/shops/pharmacy", "/shops/clinic", "/digital-gifts", "/gifts/girlfriend", "/gifts/boyfriend", "/gifts/anniversary", "/gifts/birthday", "/gifts/karva-chauth", "/gifts/long-distance", "/designs", "/builder", "/studio", "/contact", "/terms", "/privacy", "/refunds", "/shipping"];
module.exports = (req, res) => {
  if ((req.query || {}).f === "config") { // public settings: Meta Pixel ID from META_PIXEL_ID
    const id = String(process.env.META_PIXEL_ID || "").trim();
    res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).send(JSON.stringify({ pixel: /^\d{6,20}$/.test(id) ? id : "", scanAI: !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY) }));
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  if ((req.query || {}).f === "robots") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /dashboard\nDisallow: /m/\nDisallow: /s/\nDisallow: /c/\nDisallow: /k/\nDisallow: /creator\nDisallow: /api/\n\nSitemap: https://getkeepsake.in/sitemap.xml\n`);
  }
  const base = "https://getkeepsake.in", day = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `<url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${day}</lastmod></url>`).join("\n") + "\n</urlset>");
};
