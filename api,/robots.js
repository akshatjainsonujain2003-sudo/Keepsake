module.exports = (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /admin\nDisallow: /c/\nDisallow: /api/\n\nSitemap: https://${host}/sitemap.xml\n`);
};
