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

test("Vercel preview root redirects to consumer gifts without changing production root", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(index.includes('location.hostname.endsWith(".vercel.app")'));
  assert.ok(index.includes('location.replace("/gifts.html"'));
  assert.ok(!config.rewrites.some(r => r.source === "/"));
});
test("new 18-card collection is present in consumer gallery and studio", () => {
  const gallery = fs.readFileSync(path.join(root, "designs.html"), "utf8");
  const studio = fs.readFileSync(path.join(root, "studio.html"), "utf8");
  for (let i = 1; i <= 18; i++) {
    const id = "new" + String(i).padStart(2, "0");
    assert.ok(gallery.includes(id), "gallery missing " + id);
    assert.ok(studio.includes(id), "studio catalog missing " + id);
  }
  assert.ok(gallery.includes("new-card-collection"));
  assert.ok(studio.includes("requestedDesign"));
});

test("new card gallery is placed before the older card gallery and styled responsively", () => {
  const gallery = fs.readFileSync(path.join(root, "designs.html"), "utf8");
  const newSection = gallery.indexOf('id="new-card-collection"');
  const oldSection = gallery.indexOf('id="cards"');
  assert.ok(newSection >= 0 && oldSection > newSection, "new collection should be shown before old collection");
  assert.ok(gallery.includes(".new-card-grid{display:grid"));
  assert.ok(gallery.includes("@media(max-width:600px)"));
});
test("all 18 card artwork assets exist and dashboard redesign is applied", () => {
  for (let i = 1; i <= 18; i++) {
    const file = path.join(root, "assets", "cards", "new-" + String(i).padStart(2, "0") + ".svg");
    assert.ok(fs.existsSync(file), "missing art asset " + file);
  }
  const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  assert.ok(dashboard.includes("dashboard-redesign-v2"));
});
