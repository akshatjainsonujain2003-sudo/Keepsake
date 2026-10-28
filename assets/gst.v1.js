/* GST maths for Keepsake bills. One file for the browser (window.KSGST) and the server (require).
   Amounts are in rupees with paise; every tax amount is rounded to the paisa line by line, the bill total to the rupee.
   Line: { n, hsn, q, p, r, dp }  q = quantity, p = unit price, r = GST rate %, dp = discount %.
   Options: { inc: prices include GST, seller: "08", pos: "08" (place of supply state code), gst: false for a bill of supply } */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KSGST = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
  const STATES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory"
  };
  const r2 = x => Math.round((+x + Number.EPSILON) * 100) / 100;

  // GSTIN: 2-digit state, 10-char PAN, entity number, "Z", check character (mod-36 checksum).
  const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function gstinOk(g) {
    g = String(g || "").toUpperCase().trim();
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) || !STATES[g.slice(0, 2)]) return false;
    let sum = 0;
    for (let i = 0; i < 14; i++) { const v = CH.indexOf(g[i]) * (i % 2 ? 2 : 1); sum += Math.floor(v / 36) + (v % 36); }
    return CH[(36 - (sum % 36)) % 36] === g[14];
  }

  function calc(lines, o) {
    o = o || {};
    const gst = o.gst !== false, seller = String(o.seller || ""), pos = String(o.pos || seller), intra = !seller || pos === seller;
    const out = [], byRate = {};
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, disc = 0;
    for (const x of lines || []) {
      const q = +x.q || 0, p = +x.p || 0, dp = Math.min(100, Math.max(0, +x.dp || 0)), r = gst && RATES.includes(+x.r) ? +x.r : 0;
      if (!(q > 0) || p < 0) continue;
      const gross = q * p, off = gross * dp / 100, net = gross - off;
      const tv = r2(o.inc && r ? net / (1 + r / 100) : net);
      const c = intra ? r2(tv * r / 200) : 0, s = c, i = intra ? 0 : r2(tv * r / 100);
      const amt = r2(tv + c + s + i);
      out.push({ n: x.n, hsn: x.hsn || "", u: x.u || (/^99/.test(String(x.hsn || "")) ? "NA" : "NOS"), q, p, dp, r, tv, c, s, i, amt, net: r2(net) }); // net = the line as priced (after discount)
      taxable += tv; cgst += c; sgst += s; igst += i; disc += off;
      const b = byRate[r] = byRate[r] || { r, tv: 0, c: 0, s: 0, i: 0 };
      b.tv += tv; b.c += c; b.s += s; b.i += i;
    }
    taxable = r2(taxable); cgst = r2(cgst); sgst = r2(sgst); igst = r2(igst);
    const exact = r2(taxable + cgst + sgst + igst), total = Math.round(exact), roff = r2(total - exact);
    const rates = Object.values(byRate).sort((a, b) => a.r - b.r).map(b => ({ r: b.r, tv: r2(b.tv), c: r2(b.c), s: r2(b.s), i: r2(b.i) }));
    return { lines: out, intra, pos, taxable, cgst, sgst, igst, tax: r2(cgst + sgst + igst), disc: r2(disc), roff, total, rates, words: words(total) };
  }

  // Indian numbering: 1,23,45,678 → "One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Rupees Only".
  const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  const three = n => (n >= 100 ? ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? two(n % 100) : "");
  function words(n) {
    n = Math.round(Math.abs(+n || 0));
    if (!n) return "Zero Rupees Only";
    const parts = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
    if (cr) parts.push((cr >= 1000 ? words(cr).replace(/ Rupees Only$/, "") : three(cr)) + " Crore");
    if (lk) parts.push(two(lk) + " Lakh");
    if (th) parts.push(two(th) + " Thousand");
    if (rest) parts.push(three(rest));
    return parts.join(" ") + " Rupee" + (n === 1 ? "" : "s") + " Only";
  }

  // Dates in Indian time (IST, UTC+5:30), whatever clock the server or phone runs on.
  function ist(t) { const d = new Date((t == null ? Date.now() : +t) + 330 * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ym = t => { const x = ist(t); return x.y + "-" + String(x.m).padStart(2, "0"); };               // "2026-10"
  const dmy = t => { const x = ist(t); return String(x.d).padStart(2, "0") + "-" + MON[x.m - 1] + "-" + x.y; }; // "29-Oct-2026", the GST offline tool's format
  // Start and end (ms) of an IST calendar month "YYYY-MM".
  function monthRange(s) { const [y, m] = String(s).split("-").map(Number); const a = Date.UTC(y, m - 1, 1) - 330 * 60000, b = Date.UTC(y, m, 1) - 330 * 60000; return [a, b]; }
  // Financial year label for an invoice date: April to March, e.g. "2026-27".
  function fy(t) { const x = ist(t), y = x.m >= 4 ? x.y : x.y - 1; return y + "-" + String((y + 1) % 100).padStart(2, "0"); }

  // Units (UQC) the GST portal accepts, the common ones for shops. Services use "NA".
  const UQC = { NOS: "Numbers", PCS: "Pieces", SET: "Sets", PRS: "Pairs", KGS: "Kilograms", GMS: "Grams", LTR: "Litres", MLT: "Millilitres", MTR: "Metres", BOX: "Boxes", PAC: "Packs", DOZ: "Dozens", BTL: "Bottles", NA: "Service (no unit)", OTH: "Others" };
  const isService = h => /^99/.test(String(h || ""));

  return { RATES, STATES, UQC, gstinOk, calc, words, fy, ym, dmy, monthRange, ist, isService, r2 };
});
