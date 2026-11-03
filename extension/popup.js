const titleInput = document.querySelector("#group-title");
const colorInput = document.querySelector("#group-color");
const collapsedInput = document.querySelector("#collapsed");
const statusOutput = document.querySelector("#status");

function renderStatus(status) {
  if (!status) {
    statusOutput.textContent = "No scan has run yet.";
    return;
  }
  if (status.error) {
    statusOutput.textContent = `Scan failed: ${status.error}`;
    return;
  }
  const details = [];
  if (status.skippedTabCount) details.push(`${status.skippedTabCount} stale tab(s) skipped`);
  if (status.failedWindowCount) details.push(`${status.failedWindowCount} window(s) failed`);
  const suffix = details.length ? ` ${details.join("; ")}.` : "";
  statusOutput.textContent = `${status.groupedTabCount} controlled tab(s) in “${status.groupTitle}”.${suffix}`;
}

async function scan() {
  try {
    renderStatus(await chrome.runtime.sendMessage({ type: "scan" }));
  } catch (error) {
    renderStatus({ error: String(error) });
  }
}

async function load() {
  const settings = CodexTabGrouping.normalizeSettings(
    await chrome.storage.sync.get(CodexTabGrouping.DEFAULT_SETTINGS),
  );
  titleInput.value = settings.groupTitle;
  colorInput.value = settings.groupColor;
  collapsedInput.checked = settings.collapsed;
  renderStatus(await chrome.runtime.sendMessage({ type: "status" }));
}

document.querySelector("#save").addEventListener("click", async () => {
  const settings = CodexTabGrouping.normalizeSettings({
    groupTitle: titleInput.value,
    groupColor: colorInput.value,
    collapsed: collapsedInput.checked,
  });
  await chrome.storage.sync.set(settings);
  await scan();
});

document.querySelector("#scan").addEventListener("click", scan);
void load().catch((error) => renderStatus({ error: String(error) }));
