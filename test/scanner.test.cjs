const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeManagedGroupIds,
  performScan,
} = require("../extension/scanner.js");

const SETTINGS = {
  groupTitle: "Codex CLI · Test",
  groupColor: "purple",
  collapsed: false,
};

function createChrome({
  targets,
  tabs,
  groups = {},
  managedGroupIds = {},
  failingWindows = [],
  failingUpdates = [],
}) {
  const state = {
    local: {},
    session: { managedGroupIds: { ...managedGroupIds } },
  };
  const calls = { group: [], update: [], set: [] };
  let nextGroupId = 500;

  const chromeApi = {
    debugger: {
      async getTargets() {
        return targets;
      },
    },
    tabs: {
      async get(tabId) {
        if (!tabs[tabId]) throw new Error("Tab not found");
        return tabs[tabId];
      },
      async group(options) {
        calls.group.push(options);
        const windowId = options.createProperties?.windowId ?? tabs[options.tabIds[0]].windowId;
        if (failingWindows.includes(windowId)) throw new Error(`Grouping failed in ${windowId}`);
        return options.groupId ?? nextGroupId++;
      },
    },
    tabGroups: {
      async query({ windowId }) {
        return groups[windowId] || [];
      },
      async update(groupId, options) {
        calls.update.push({ groupId, options });
        if (failingUpdates.includes(groupId)) throw new Error(`Update failed for ${groupId}`);
      },
    },
    storage: {
      local: {
        async get(defaults) {
          return { ...defaults, ...state.local };
        },
        async set(value) {
          calls.set.push(value);
          Object.assign(state.local, value);
        },
      },
      session: {
        async get(defaults) {
          return { ...defaults, ...state.session };
        },
        async set(value) {
          calls.set.push(value);
          Object.assign(state.session, value);
        },
      },
    },
  };

  return { chromeApi, calls, state };
}

test("normalizes remembered extension-owned group ids", () => {
  assert.deepEqual(normalizeManagedGroupIds({ 10: 20, invalid: 30, 40: "50", 60: -1 }), {
    10: 20,
  });
  assert.deepEqual(normalizeManagedGroupIds(null), {});
});

test("reuses only a remembered extension-owned group", async () => {
  const { chromeApi, calls, state } = createChrome({
    targets: [{ attached: true, type: "page", tabId: 1 }],
    tabs: { 1: { id: 1, windowId: 10 } },
    groups: {
      10: [
        { id: 77, title: "Old extension title" },
        { id: 88, title: SETTINGS.groupTitle },
      ],
    },
    managedGroupIds: { 10: 77 },
  });

  const status = await performScan(chromeApi, SETTINGS, () => new Date("2026-11-03T12:00:00Z"));

  assert.deepEqual(calls.group, [{ groupId: 77, tabIds: [1] }]);
  assert.equal(calls.update[0].groupId, 77);
  assert.equal(status.groupedTabCount, 1);
  assert.equal(status.failedWindowCount, 0);
  assert.deepEqual(state.session.managedGroupIds, { 10: 77 });
});

test("does not reuse a same-titled user group", async () => {
  const { chromeApi, calls, state } = createChrome({
    targets: [{ attached: true, type: "page", tabId: 1 }],
    tabs: { 1: { id: 1, windowId: 10 } },
    groups: { 10: [{ id: 88, title: SETTINGS.groupTitle }] },
  });

  await performScan(chromeApi, SETTINGS);

  assert.deepEqual(calls.group, [{ createProperties: { windowId: 10 }, tabIds: [1] }]);
  assert.deepEqual(state.session.managedGroupIds, { 10: 500 });
});

test("continues scanning other windows and records partial failures", async () => {
  const { chromeApi, state } = createChrome({
    targets: [
      { attached: true, type: "page", tabId: 1 },
      { attached: true, type: "page", tabId: 2 },
      { attached: true, type: "page", tabId: 3 },
    ],
    tabs: {
      1: { id: 1, windowId: 10 },
      2: { id: 2, windowId: 20 },
    },
    failingWindows: [20],
  });

  const status = await performScan(chromeApi, SETTINGS);

  assert.equal(status.attachedTabCount, 3);
  assert.equal(status.groupedTabCount, 1);
  assert.equal(status.skippedTabCount, 1);
  assert.equal(status.failedWindowCount, 1);
  assert.deepEqual(status.errors, [{ windowId: 20, message: "Grouping failed in 20" }]);
  assert.equal(state.local.lastScan, status);
});

test("remembers a newly created group when styling it fails", async () => {
  const { chromeApi, state } = createChrome({
    targets: [{ attached: true, type: "page", tabId: 1 }],
    tabs: { 1: { id: 1, windowId: 10 } },
    failingUpdates: [500],
  });

  const status = await performScan(chromeApi, SETTINGS);

  assert.equal(status.groupedTabCount, 0);
  assert.equal(status.failedWindowCount, 1);
  assert.deepEqual(state.session.managedGroupIds, { 10: 500 });
});
