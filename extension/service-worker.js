importScripts("grouping.js", "scanner.js");

const { DEFAULT_SETTINGS, normalizeSettings } = CodexTabGrouping;
const { performScan } = CodexTabScanner;
const SCAN_ALARM = "codex-controlled-tab-scan";
const SCAN_PERIOD_MINUTES = 0.5;
let scanPromise = null;
let scanTimer = null;

async function loadSettings() {
  return normalizeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
}

async function scanChrome() {
  const settings = await loadSettings();
  return performScan(chrome, settings);
}

function scan() {
  if (!scanPromise) {
    scanPromise = scanChrome().finally(() => {
      scanPromise = null;
    });
  }
  return scanPromise;
}

function scheduleScan(delay = 250) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => void runBackgroundScan(), delay);
}

async function recordBackgroundError(error) {
  const status = {
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };
  console.error("Controlled-tab scan failed:", error);
  try {
    await chrome.storage.local.set({ lastScan: status });
  } catch (storageError) {
    console.error("Could not store controlled-tab scan failure:", storageError);
  }
  return status;
}

async function runBackgroundScan() {
  try {
    return await scan();
  } catch (error) {
    return recordBackgroundError(error);
  }
}

async function initialize() {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(normalizeSettings(existing));
  await chrome.alarms.create(SCAN_ALARM, { periodInMinutes: SCAN_PERIOD_MINUTES });
  await runBackgroundScan();
}

chrome.runtime.onInstalled.addListener(() => void initialize().catch(recordBackgroundError));
chrome.runtime.onStartup.addListener(() => void initialize().catch(recordBackgroundError));
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAN_ALARM) void runBackgroundScan();
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
      .then(({ lastScan }) => sendResponse(lastScan))
      .catch((error) => sendResponse({ error: String(error) }));
    return true;
  }
  return false;
});

void initialize().catch(recordBackgroundError);
