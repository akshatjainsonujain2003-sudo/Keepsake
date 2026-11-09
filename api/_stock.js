// Stock counts on the shop's page (each menu item's k). Not a route.
// A sale takes items out (page orders, sales added in the shop, bills); a cancel or a return puts them back.
// Only items whose stock is counted change. At 0 an item is marked sold out (sok marks that the count did it), and when
// a cancel or return brings it back above 0 it is back in stock. An item the owner marked sold out by hand stays so.
const db = require("./_db");

const key = n => String(n == null ? "" : n).toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();

// lines: [{ k?: "section.item", n: name, q: quantity }]; sign -1 takes out, +1 puts back. Returns true if a count changed.
async function move(id, lines, sign) {
  const want = (Array.isArray(lines) ? lines : []).filter(l => l && !l.x && +l.q > 0);
  if (!want.length) return false;
  try {
    const k = "customer-memory:" + id, m = await db.getj(k);
    if (!m || !m.data || !Array.isArray(m.data.menu)) return false;
    let changed = false;
    for (const l of want) {
      let x = null;
      if (/^\d+\.\d+$/.test(String(l.k || ""))) { const [si, ii] = String(l.k).split(".").map(Number), y = m.data.menu[si] && (m.data.menu[si].items || [])[ii]; if (y && key(y.n) === key(l.n)) x = y; }
      if (!x) for (const s of m.data.menu) { x = ((s && s.items) || []).find(y => y && key(y.n) === key(l.n)) || null; if (x) break; }
      if (!x || x.k === "" || x.k == null || !isFinite(+x.k)) continue;
      const before = Math.round(+x.k), after = Math.max(0, Math.round(before + sign * +l.q));
      if (after === before) continue;
      x.k = after; changed = true;
      if (after === 0) { if (!x.so) x.sok = 1; x.so = true; } else if (x.sok) { x.so = false; delete x.sok; }
    }
    if (changed) { m.updated = Date.now(); await db.setj(k, m); }
    return changed;
  } catch (e) { console.error("stock move", e.message); return false; }
}

module.exports = { move };
