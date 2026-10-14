// robots.txt and sitemap.xml (one function: the hosting plan allows at most 12).
const pages = ["/", "/digital-gifts", "/gifts/girlfriend", "/gifts/boyfriend", "/gifts/anniversary", "/gifts/birthday", "/gifts/karva-chauth", "/gifts/long-distance", "/designs", "/builder", "/studio", "/contact"];
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  if ((req.query || {}).f === "robots") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /dashboard\nDisallow: /m/\nDisallow: /s/\nDisallow: /c/\nDisallow: /k/\nDisallow: /api/\n\nSitemap: https://getkeepsake.in/sitemap.xml\n`);
  }
  const base = "https://getkeepsake.in", day = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `<url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${day}</lastmod></url>`).join("\n") + "\n</urlset>");
};
