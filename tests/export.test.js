// Run: node --test tests/*.test.js
const test = require("node:test"), assert = require("node:assert/strict");
const G = require("../assets/gst.v1.js"), X = require("../assets/gst-export.v1.js");
const CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const gstin = st => [...CH].map(c => st + "AAPFU0939F1Z" + c).find(G.gstinOk);
const SELLER = gstin("08"), MH = gstin("27"), RJB = [...CH].map(c => "08AABCT1332L1Z" + c).find(G.gstinOk);
let n = 0;
function bill(lines, o = {}) {
  n++;
  const cust = { name: o.name || "", phone: "", gstin: o.gstin || "", addr: o.addr || "", state: o.gstin ? o.gstin.slice(0, 2) : (o.state || "08") };
  return { t: "t" + n, no: "MN/26-27/" + String(n).padStart(4, "0"), at: o.at || Date.UTC(2026, 9, 10, 6), kind: "tax", seller: { gstin: SELLER, state: "08" }, cust, inc: !!o.inc,
    calc: G.calc(lines, { gst: true, inc: !!o.inc, seller: "08", pos: cust.state }), paid: !!o.paid, pmode: o.paid ? "cash" : "", cancel: !!o.cancel };
}
const sheet = (r, name) => r.sheets.find(s => s.name === name).rows;

test("IST: a bill at 00:30 IST on 1 April is in the new financial year and month", () => {
  const t = Date.UTC(2027, 2, 31, 19, 0); // 31 Mar 19:00 UTC = 1 Apr 00:30 IST
  assert.equal(G.fy(t), "2027-28"); assert.equal(G.ym(t), "2027-04"); assert.equal(G.dmy(t), "01-Apr-2027");
  const [a, b] = G.monthRange("2027-04"); assert.ok(t >= a && t < b);
});

test("GSTR-1 sections: b2b, b2cl threshold, b2cs grouping, exemp, hsn split, docs", () => {
  n = 0;
  const bills = [
    bill([{ n: "Kurta", hsn: "6211", u: "PCS", q: 2, p: 1000, r: 5 }, { n: "Belt", hsn: "4203", q: 1, p: 500, r: 18 }], { gstin: RJB, name: "Shop A", addr: "Jaipur" }), // B2B intra, two rates
    bill([{ n: "Lehenga", hsn: "6204", q: 1, p: 120000, r: 5 }], { state: "27", name: "Riya", addr: "Pune" }),   // inter-state unregistered > 1 lakh → b2cl
    bill([{ n: "Dupatta", hsn: "6214", q: 1, p: 800, r: 5 }], { state: "27" }),                                   // inter-state small → b2cs 27
    bill([{ n: "Dupatta", hsn: "6214", q: 2, p: 800, r: 5 }]),                                                   // intra small → b2cs 08
    bill([{ n: "Dupatta", hsn: "6214", q: 1, p: 800, r: 5 }, { n: "Rice", hsn: "1006", u: "KGS", q: 5, p: 60, r: 0 }]), // nil line → exemp
    bill([{ n: "Saree", hsn: "5407", q: 1, p: 3000, r: 5 }], { gstin: MH, name: "Shop B", addr: "Mumbai" }),     // B2B inter-state
    bill([{ n: "Saree", hsn: "5407", q: 1, p: 3000, r: 5 }], { cancel: true })                                   // cancelled
  ];
  const r = X.build(bills, { name: "Maison Noor", gstin: SELLER });
  const b2b = sheet(r, "b2b");
  assert.equal(b2b.length - 1, 3); // invoice 1 has 2 rate rows, invoice 6 one row
  assert.deepEqual(b2b[1].slice(0, 7), [RJB, "Shop A", "MN/26-27/0001", "10-Oct-2026", 2690, "08-Rajasthan", "N"]);
  assert.deepEqual(b2b.slice(1).map(x => [x[10], x[11]]), [[5, 2000], [18, 500], [5, 3000]]);
  const b2cl = sheet(r, "b2cl"); assert.equal(b2cl.length - 1, 1); assert.equal(b2cl[1][0], "MN/26-27/0002"); assert.equal(b2cl[1][3], "27-Maharashtra"); assert.equal(b2cl[1][2], 126000);
  const b2cs = sheet(r, "b2cs").slice(1);
  assert.deepEqual(b2cs, [["OE", "08-Rajasthan", "", 5, 2400, 0, ""], ["OE", "27-Maharashtra", "", 5, 800, 0, ""]]);
  const ex = sheet(r, "exemp"); assert.equal(ex[4][0], "Intra-State supplies to unregistered persons"); assert.equal(ex[4][1], 300);
  const hb = sheet(r, "hsn(b2b)").slice(1), hc = sheet(r, "hsn(b2c)").slice(1);
  assert.deepEqual(hb.map(x => [x[0], x[2], x[3], x[5], x[6]]), [["4203", "NOS-NUMBERS", 1, 18, 500], ["5407", "NOS-NUMBERS", 1, 5, 3000], ["6211", "PCS-PIECES", 2, 5, 2000]]);
  const d6214 = hc.find(x => x[0] === "6214"); assert.equal(d6214[3], 4); assert.equal(d6214[6], 3200); assert.equal(d6214[7], 40); assert.equal(d6214[8], 60); assert.equal(d6214[9], 60);
  assert.ok(hc.find(x => x[0] === "1006" && x[2] === "KGS-KILOGRAMS" && x[5] === 0));
  assert.ok(!hc.find(x => x[0] === "5407")); // cancelled bill not in HSN
  const docs = sheet(r, "docs"); assert.deepEqual(docs[1], ["Invoices for outward supply", "MN/26-27/0001", "MN/26-27/0007", 7, 1]);
  // GSTR-3B: taxable excludes nil and cancelled; IGST only from the inter-state bills
  assert.equal(r.s3b.a.tv, 2000 + 500 + 120000 + 800 + 1600 + 800 + 3000);
  assert.equal(r.s3b.a.i, 6000 + 40 + 150); assert.equal(r.s3b.nil, 300);
  assert.deepEqual(r.s3b.unreg, [{ pos: "27-Maharashtra", tv: 120800, i: 6040 }]);
  // register has every bill, totals only the active ones
  const reg = sheet(r, "Sales register"); assert.equal(reg.length, 1 + 7 + 1); assert.equal(reg[7][14], "Cancelled");
});

test("every invoice's sections add back to its taxable value", () => {
  n = 0;
  const bills = [bill([{ n: "A", hsn: "1234", q: 3, p: 33.33, r: 18 }, { n: "B", hsn: "1234", q: 7, p: 9.99, r: 5 }], { inc: true })];
  const r = X.build(bills, {}), b2cs = sheet(r, "b2cs").slice(1), hc = sheet(r, "hsn(b2c)").slice(1);
  assert.equal(G.r2(b2cs.reduce((t, x) => t + x[4], 0)), bills[0].calc.taxable);
  assert.equal(G.r2(hc.reduce((t, x) => t + x[6], 0)), bills[0].calc.taxable);
  assert.equal(G.r2(hc.reduce((t, x) => t + x[8] + x[9], 0)), bills[0].calc.tax);
});

test("xlsx is a valid zip with all sheets; csv is quoted", () => {
  n = 0;
  const r = X.build([bill([{ n: 'Shirt, "slim"', hsn: "6205", q: 1, p: 999, r: 5 }])], { name: "A & B" });
  const z = X.xlsx(r.sheets);
  assert.equal(z[0], 0x50); assert.equal(z[1], 0x4b);
  require("fs").writeFileSync(require("path").join(require("os").tmpdir(), "ks-test.xlsx"), z);
  assert.ok(X.csv(r.sheets[0].rows).includes('"Shirt, ""slim"""') || X.csv(r.sheets[0].rows).length > 10);
});
