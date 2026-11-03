importScripts("grouping.js");

const { DEFAULT_SETTINGS, normalizeSettings, attachedPageTabs } = CodexTabGrouping;
const SCAN_ALARM = "codex-controlled-tab-scan";
const SCAN_PERIOD_MINUTES = 0.5;
let scanPromise = null;
let scanTimer = null;

async function loadSettings() {
  return normalizeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
}

async function findOrCreateGroup(windowId, tabIds, settings) {
  const groups = await chrome.tabGroups.query({ windowId });
  const existing = groups.find((group) => group.title === settings.groupTitle);
  const options = existing
    ? { groupId: existing.id, tabIds }
    : { createProperties: { windowId }, tabIds };
  const groupId = await chrome.tabs.group(options);
  await chrome.tabGroups.update(groupId, {
    title: settings.groupTitle,
    color: settings.groupColor,
    collapsed: settings.collapsed,
  });
  return groupId;
}

async function performScan() {
  const settings = await loadSettings();
  const targets = await chrome.debugger.getTargets();
  const attachedTabIds = attachedPageTabs(targets);
  const tabs = await Promise.all(
    attachedTabIds.map(async (tabId) => {
      try {
        return await chrome.tabs.get(tabId);
      } catch {
        return null;
      }
    }),
  );

  const tabsByWindow = new Map();
  for (const tab of tabs.filter(Boolean)) {
    if (!tabsByWindow.has(tab.windowId)) tabsByWindow.set(tab.windowId, []);
    tabsByWindow.get(tab.windowId).push(tab.id);
  }

  const groupIds = [];
  for (const [windowId, tabIds] of tabsByWindow) {
    groupIds.push(await findOrCreateGroup(windowId, tabIds, settings));
  }

  const status = {
    checkedAt: new Date().toISOString(),
    attachedTabCount: attachedTabIds.length,
    groupedTabCount: tabs.filter(Boolean).length,
    groupIds,
    groupTitle: settings.groupTitle,
  };
  await chrome.storage.local.set({ lastScan: status });
  return status;
}

function scan() {
  if (!scanPromise) {
    scanPromise = performScan().finally(() => {
      scanPromise = null;
    });
  }
  return scanPromise;
}

function scheduleScan(delay = 250) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => void scan(), delay);
}

async function initialize() {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(normalizeSettings(existing));
  await chrome.alarms.create(SCAN_ALARM, { periodInMinutes: SCAN_PERIOD_MINUTES });
  await scan();
}

chrome.runtime.onInstalled.addListener(() => void initialize());
chrome.runtime.onStartup.addListener(() => void initialize());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) void scan();
});
chrome.tabs.onActivated.addListener(() => scheduleScan(0));
chrome.tabs.onCreated.addListener(() => scheduleScan());
chrome.tabs.onUpdated.addListener(() => scheduleScan());
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "scan") {
    scan().then(sendResponse, (error) => sendResponse({ error: String(error) }));
    return true;
  }
  if (message?.type === "status") {
    chrome.storage.local
      .get({ lastScan: null })
      .then(({ lastScan }) => sendResponse(lastScan));
    return true;
  }
  return false;
});

void initialize();
