// Run: node --test tests/
const test = require("node:test"), assert = require("node:assert/strict");
const G = require("../assets/gst.v1.js");

test("intra-state: CGST + SGST split, exclusive prices", () => {
  const b = G.calc([{ n: "Shirt", q: 2, p: 500, r: 5 }], { seller: "08", pos: "08" });
  assert.equal(b.intra, true);
  assert.equal(b.taxable, 1000); assert.equal(b.cgst, 25); assert.equal(b.sgst, 25); assert.equal(b.igst, 0);
  assert.equal(b.total, 1050); assert.equal(b.roff, 0);
});

test("inter-state: IGST only", () => {
  const b = G.calc([{ n: "Laptop bag", q: 1, p: 1000, r: 18 }], { seller: "08", pos: "27" });
  assert.equal(b.intra, false); assert.equal(b.igst, 180); assert.equal(b.cgst, 0); assert.equal(b.total, 1180);
});

test("inclusive prices: tax is taken out of the price", () => {
  const b = G.calc([{ n: "Coffee", q: 1, p: 105, r: 5 }], { inc: true, seller: "08" });
  assert.equal(b.taxable, 100); assert.equal(b.cgst, 2.5); assert.equal(b.sgst, 2.5); assert.equal(b.total, 105); assert.equal(b.lines[0].net, 105);
});

test("inclusive with paise rounds to the rupee with a round-off line", () => {
  const b = G.calc([{ n: "Tea", q: 3, p: 10, r: 18 }], { inc: true, seller: "08" });
  // 30 / 1.18 = 25.42; tax 2.29 + 2.29 = 30.00
  assert.equal(b.taxable, 25.42); assert.equal(b.cgst, 2.29); assert.equal(b.sgst, 2.29);
  assert.equal(b.total, 30); assert.equal(b.roff, 0);
});

test("round-off line is shown when the exact total has paise", () => {
  const b = G.calc([{ n: "Item", q: 1, p: 99.5, r: 18 }], { seller: "08" });
  // 99.50 + 8.96 + 8.96 = 117.42 → 117, round-off -0.42
  assert.equal(b.total, 117); assert.equal(b.roff, -0.42);
});

test("line discount reduces the taxable value", () => {
  const b = G.calc([{ n: "Saree", q: 1, p: 2000, r: 5, dp: 10 }], { seller: "08" });
  assert.equal(b.disc, 200); assert.equal(b.taxable, 1800); assert.equal(b.total, 1890); assert.equal(b.lines[0].net, 1800);
});

test("mixed rates give a rate-wise summary", () => {
  const b = G.calc([{ n: "A", q: 1, p: 100, r: 5 }, { n: "B", q: 1, p: 100, r: 18 }, { n: "C", q: 1, p: 100, r: 5 }], { seller: "08" });
  assert.deepEqual(b.rates.map(x => [x.r, x.tv]), [[5, 200], [18, 100]]);
  assert.equal(b.tax, 28);
});

test("bill of supply: no tax even if a rate is given", () => {
  const b = G.calc([{ n: "Rice", q: 2, p: 60, r: 5 }], { gst: false });
  assert.equal(b.tax, 0); assert.equal(b.total, 120);
});

test("unknown rates and bad lines are ignored safely", () => {
  const b = G.calc([{ n: "X", q: 1, p: 100, r: 7 }, { n: "Y", q: 0, p: 100, r: 5 }, { n: "Z", q: 1, p: -5, r: 5 }], { seller: "08" });
  assert.equal(b.lines.length, 1); assert.equal(b.tax, 0); assert.equal(b.total, 100);
});

test("3% jewellery rate", () => {
  const b = G.calc([{ n: "Gold ring", q: 1, p: 50000, r: 3 }], { seller: "08" });
  assert.equal(b.cgst, 750); assert.equal(b.total, 51500);
});

test("amount in words, Indian system", () => {
  assert.equal(G.words(0), "Zero Rupees Only");
  assert.equal(G.words(1), "One Rupee Only");
  assert.equal(G.words(1050), "One Thousand Fifty Rupees Only");
  assert.equal(G.words(12345678), "One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Rupees Only");
  assert.equal(G.words(100000), "One Lakh Rupees Only");
});

test("financial year label", () => {
  assert.equal(G.fy(new Date(2026, 2, 31).getTime()), "2025-26");
  assert.equal(G.fy(new Date(2026, 3, 1).getTime()), "2026-27");
});

test("GSTIN checksum", () => {
  assert.equal(G.gstinOk("27AAPFU0939F1ZV"), true); // a widely published sample GSTIN
  assert.equal(G.gstinOk("27AAPFU0939F1ZX"), false);
  assert.equal(G.gstinOk("99AAPFU0939F1ZV"), false);
  assert.equal(G.gstinOk("hello"), false);
});
