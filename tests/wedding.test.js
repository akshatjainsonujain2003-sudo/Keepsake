// Run: node --test tests/*.test.js
// The wedding invitation is a website template sold as its own product.
const test = require("node:test"), assert = require("node:assert/strict");
const P = require("../api/_pay.js");

const site = (tpl, paid) => ({ kind: "site", paid, data: { tpl } });

test("a wedding invitation has its own price, separate from a love-story website", () => {
  const c = P.catalog();
  assert.equal(c.products.wedding.price, 1999);
  assert.equal(P.productOf(site("wedding")), "wedding");
  assert.equal(P.productOf(site("wildflower")), "site");
  assert.equal(P.productOf({ kind: "biz", data: { tpl: "wedding" } }), "biz");
  assert.equal(P.amountFor(site("wedding", false), "digital").rupees, 1999);
  assert.equal(P.amountFor(site("wildflower", false), "digital").rupees, c.products.site.price);
});

test("the wedding price is never discounted by the launch offer and can be set in Vercel", () => {
  const old = { ...process.env };
  process.env.SALE_PERCENT = "50"; process.env.SALE_ENDS = "2099-01-01"; process.env.PRICE_WEDDING = "2499";
  try {
    const c = P.catalog();
    assert.equal(c.products.wedding.price, 2499); assert.equal(c.products.wedding.was, undefined);
    assert.equal(P.amountFor(site("wedding", false), "digital").rupees, 2499);
  } finally { process.env = old; }
});

test("a wedding invitation is digital only and can't be paid twice", () => {
  assert.ok(P.amountFor(site("wedding", false), "frameQr").error);
  assert.ok(P.amountFor(site("wedding", true), "digital").error);
});

test("the template kit ships the wedding design with safe WhatsApp numbers", () => {
  global.window = {}; global.location = { search: "" }; global.document = { documentElement: { classList: { toggle() {} } } };
  require("../assets/ks-templates.v5.js");
  const K = global.window.KSKit;
  assert.ok(K.DEMO.wedding && K.FIELDS.wedding.length >= 5);
  assert.equal(K.DEMO.wedding.events.length, 5);
  assert.equal(K.waNum("98290 12345"), "919829012345");
  assert.equal(K.waNum("+91-98290-12345"), "919829012345");
  assert.equal(K.waNum("12345"), ""); assert.equal(K.waNum("https://evil.example"), "");
  delete global.window; delete global.location; delete global.document;
});
