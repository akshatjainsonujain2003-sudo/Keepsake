// Run: node --test tests/*.test.js
// Consumer product pages must remain crawlable, canonical and present in the sitemap.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const seo = require("../api/seo.js");

test("consumer product landing pages are not redirected away", () => {
  const sources = config.redirects.map(r => r.source);
  assert.ok(!sources.includes("/memory-card"));
  assert.ok(!sources.includes("/love-story-website"));
});

test("consumer product landing pages are included in the sitemap page list", () => {
  assert.ok(seo.PAGES.includes("/memory-card"));
  assert.ok(seo.PAGES.includes("/love-story-website"));
});

test("product landing pages are distinct from the consumer overview", () => {
  assert.ok(seo.PAGES.includes("/gifts"));
  assert.ok(seo.PAGES.includes("/digital-gifts"));
  assert.ok(seo.PAGES.includes("/memory-card"));
  assert.ok(seo.PAGES.includes("/love-story-website"));
});
