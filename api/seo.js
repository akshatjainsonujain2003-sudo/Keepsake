// robots.txt, sitemap.xml and public site settings, in one function (the hosting plan allows at most 12).
// ?f=robots | ?f=sitemap | ?f=config -> { pixel } (Meta Pixel ID from META_PIXEL_ID, or "")
const pages = ["/", "/designs", "/builder", "/contact", "/terms", "/privacy", "/refunds", "/shipping"];
module.exports = (req, res) => {
  const f = (req.query || {}).f;
  if (f === "config") {
    const id = String(process.env.META_PIXEL_ID || "").trim();
    res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).send(JSON.stringify({ pixel: /^\d{6,20}$/.test(id) ? id : "" }));
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  if (f === "robots") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /admin\nDisallow: /login\nDisallow: /dashboard\nDisallow: /m/\nDisallow: /s/\nDisallow: /c/\nDisallow: /api/\n\nSitemap: https://getkeepsake.in/sitemap.xml\n`);
  }
  const base = "https://getkeepsake.in", day = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `<url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${day}</lastmod></url>`).join("\n") + "\n</urlset>");
};
