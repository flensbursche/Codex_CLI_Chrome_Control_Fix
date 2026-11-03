(function exposeScanner(globalObject) {
  const grouping =
    globalObject.CodexTabGrouping ||
    (typeof require !== "undefined" ? require("./grouping.js") : null);

  if (!grouping) throw new Error("CodexTabGrouping must be loaded before scanner.js.");

  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  function normalizeManagedGroupIds(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([windowId, groupId]) =>
          /^\d+$/.test(windowId) && Number.isInteger(groupId) && groupId >= 0,
      ),
    );
  }

  async function findOrCreateGroup(chromeApi, windowId, tabIds, settings, managedGroupIds) {
    const groups = await chromeApi.tabGroups.query({ windowId });
    const rememberedId = managedGroupIds[String(windowId)];
    const existing = groups.find((group) => group.id === rememberedId);
    const options = existing
      ? { groupId: existing.id, tabIds }
      : { createProperties: { windowId }, tabIds };
    const groupId = await chromeApi.tabs.group(options);
    managedGroupIds[String(windowId)] = groupId;
    await chromeApi.tabGroups.update(groupId, {
      title: settings.groupTitle,
      color: settings.groupColor,
      collapsed: settings.collapsed,
    });
    return groupId;
  }

  async function performScan(chromeApi, settings, now = () => new Date()) {
    const targets = await chromeApi.debugger.getTargets();
    const attachedTabIds = grouping.attachedPageTabs(targets);
    const tabs = await Promise.all(
      attachedTabIds.map(async (tabId) => {
        try {
          return await chromeApi.tabs.get(tabId);
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

    const stored = await chromeApi.storage.session.get({ managedGroupIds: {} });
    const managedGroupIds = normalizeManagedGroupIds(stored.managedGroupIds);
    const groupIds = [];
    const errors = [];
    let groupedTabCount = 0;

    for (const [windowId, tabIds] of tabsByWindow) {
      try {
        groupIds.push(
          await findOrCreateGroup(chromeApi, windowId, tabIds, settings, managedGroupIds),
        );
        groupedTabCount += tabIds.length;
      } catch (error) {
        errors.push({ windowId, message: errorMessage(error) });
      }
    }

    const status = {
      checkedAt: now().toISOString(),
      attachedTabCount: attachedTabIds.length,
      groupedTabCount,
      skippedTabCount: attachedTabIds.length - tabs.filter(Boolean).length,
      failedWindowCount: errors.length,
      groupIds,
      groupTitle: settings.groupTitle,
      errors,
    };
    await chromeApi.storage.session.set({ managedGroupIds });
    await chromeApi.storage.local.set({ lastScan: status });
    return status;
  }

  const api = {
    normalizeManagedGroupIds,
    findOrCreateGroup,
    performScan,
  };
  globalObject.CodexTabScanner = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
