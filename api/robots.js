module.exports = (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /dashboard\nDisallow: /m/\nDisallow: /s/\nDisallow: /c/\nDisallow: /api/\n\nSitemap: https://getkeepsake.in/sitemap.xml\n`);
};
