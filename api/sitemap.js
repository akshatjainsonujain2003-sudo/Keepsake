const base = "https://getkeepsake.in", day = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/xml; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(p => `<url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${day}</lastmod></url>`).join("\n") + "\n</urlset>");
};
