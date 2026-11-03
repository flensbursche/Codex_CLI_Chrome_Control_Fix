const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SETTINGS,
  normalizeSettings,
  attachedPageTabs,
} = require("../extension/grouping.js");

test("normalizes group settings and limits the title", () => {
  assert.deepEqual(normalizeSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(
    normalizeSettings({ groupTitle: "  Codex   CLI · Demo  ", groupColor: "BLUE", collapsed: true }),
    { groupTitle: "Codex CLI · Demo", groupColor: "blue", collapsed: true },
  );
  assert.equal(normalizeSettings({ groupTitle: "x".repeat(100) }).groupTitle.length, 80);
});
test("falls back from invalid values", () => {
  assert.deepEqual(normalizeSettings({ groupTitle: "", groupColor: "invisible" }), DEFAULT_SETTINGS);
});

test("returns unique attached page tab ids only", () => {
  assert.deepEqual(
    attachedPageTabs([
      { attached: true, type: "page", tabId: 12 },
      { attached: true, type: "page", tabId: 12 },
      { attached: false, type: "page", tabId: 13 },
      { attached: true, type: "worker", tabId: 14 },
      { attached: true, type: "page" },
      null,
    ]),
    [12],
  );
});
