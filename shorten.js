// Vercel serverless function: shortens a link to THIS site via is.gd -> v.gd -> tinyurl.
// Stateless, no database. Only links to your own domain are accepted (not an open proxy).
const providers = [
  async (u, s) => { const r = await fetch("https://is.gd/create.php?format=simple&url=" + encodeURIComponent(u), { signal: s }); return r.ok ? (await r.text()).trim() : ""; },
  async (u, s) => { const r = await fetch("https://v.gd/create.php?format=simple&url=" + encodeURIComponent(u), { signal: s }); return r.ok ? (await r.text()).trim() : ""; },
  async (u, s) => { const r = await fetch("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(u), { signal: s }); return r.ok ? (await r.text()).trim() : ""; }
];
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const raw = String((req.query && req.query.url) || "");
    const u = new URL(raw);
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
    if (!/^https?:$/.test(u.protocol) || raw.length > 4900 || u.host.toLowerCase() !== host)
      return res.status(400).json({ error: "Only links to this site can be shortened." });
    for (const p of providers) {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 6000);
      try { const out = await p(raw, c.signal); if (/^https:\/\/\S{8,60}$/.test(out)) return res.status(200).json({ short: out }); } catch (e) {} finally { clearTimeout(t); }
    }
    return res.status(502).json({ error: "All shorteners are unavailable right now." });
  } catch (e) { return res.status(400).json({ error: "Invalid link." }); }
};
