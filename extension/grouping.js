(function exposeGrouping(globalObject) {
  const DEFAULT_SETTINGS = Object.freeze({
    groupTitle: "Codex CLI",
    groupColor: "purple",
    collapsed: false,
  });

  const ALLOWED_COLORS = new Set([
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ]);

  function normalizeSettings(settings = {}) {
    const title = String(settings.groupTitle || "").trim().replace(/\s+/g, " ");
    const color = String(settings.groupColor || "").trim().toLowerCase();
    return {
      groupTitle: title.slice(0, 80) || DEFAULT_SETTINGS.groupTitle,
      groupColor: ALLOWED_COLORS.has(color) ? color : DEFAULT_SETTINGS.groupColor,
      collapsed: settings.collapsed === true,
    };
  }

  function attachedPageTabs(targets = []) {
    return [
      ...new Set(
        targets
          .filter(
            (target) =>
              target &&
              target.attached === true &&
              target.type === "page" &&
              Number.isInteger(target.tabId),
          )
          .map((target) => target.tabId),
      ),
    ];
  }

  const api = { DEFAULT_SETTINGS, normalizeSettings, attachedPageTabs };
  globalObject.CodexTabGrouping = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
