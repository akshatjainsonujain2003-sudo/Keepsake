/* Remembers a creator's code from links like getkeepsake.in/?ref=PRIYA for 30 days, so it's applied at checkout. */
(function () {
  try {
    var q = new URLSearchParams(location.search), c = (q.get("ref") || q.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    if (c.length >= 3) localStorage.setItem("ks-ref", JSON.stringify({ code: c, at: Date.now() }));
  } catch (e) {}
})();
