// Public site settings the browser needs. GET -> { pixel }
// pixel: the Meta (Facebook) Pixel ID from the META_PIXEL_ID environment variable, or "" if not set.
module.exports = (req, res) => {
  const id = String(process.env.META_PIXEL_ID || "").trim();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.statusCode = 200;
  res.end(JSON.stringify({ pixel: /^\d{6,20}$/.test(id) ? id : "" }));
};
