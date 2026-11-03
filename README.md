# Codex CLI Chrome Control Fix

A reproducible Windows workaround for Codex CLI sessions that cannot use the built-in Chrome browser host and fail with errors such as:

```text
The browser access host is unavailable
Computer Use native pipe is unavailable
```

This project does **not** patch or replace Codex. It adds the official Chrome DevTools MCP server to Codex CLI and includes a transparent Chrome extension that automatically places externally controlled tabs in a visible tab group.

## What it solves

- Reuses an already signed-in Chrome session from Codex CLI.
- Keeps controlled tabs findable in browser windows with many open tabs.
- Lets the user choose a group/session title such as `Codex CLI · EWS_Betriebsrat`.
- Preserves Chrome's connection approval and automation warning.
- Provides a deterministic smoke test and policy diagnostics.

It does not repair OpenAI's built-in browser-host channel. The upstream symptom is tracked in [openai/codex#56928](https://github.com/openai/codex/issues/56928).

## Tested baseline

Validated on 2026-11-03 with:

- Windows 11
- Codex CLI `0.166.0`
- Chrome Stable `156`
- Node.js `24`
- `chrome-devtools-mcp@1.12.0`

Chrome auto-connect requires Chrome 144 or newer.

## Architecture

```text
Codex CLI
   │ MCP over stdio
   ▼
chrome-devtools-mcp
   │ user-approved auto-connect
   ▼
Existing Chrome profile ── controlled page targets
   │
   └─ Companion extension observes attached target IDs
      and moves those tabs into a named Chrome tab group
```

The extension has no website host permissions. It uses the `debugger` permission only for `chrome.debugger.getTargets()`, then uses `chrome.tabs.group()` and `chrome.tabGroups.update()` to organize the returned tab IDs. It never attaches a debugger itself.

## Quick start

### 1. Clone and verify

```powershell
git clone https://github.com/flensbursche/Codex_CLI_Chrome_Control_Fix.git
cd Codex_CLI_Chrome_Control_Fix
npm test
```

### 2. Check and install the Codex MCP entry

The setup is dry-run by default:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Apply it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Apply
```

Equivalent command:

```powershell
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@1.12.0 --autoConnect --no-usage-statistics --no-performance-crux --no-javascript-evaluation
```

Verify:

```powershell
codex mcp get chrome-devtools
codex mcp list
```

Codex supports adding and verifying MCP servers through its CLI. Restart Codex CLI after changing the MCP configuration so the new tools are discovered.

### 3. Enable Chrome auto-connect

Open:

```text
chrome://inspect/#remote-debugging
```

Enable **Remote Debugging**. Chrome asks for approval whenever a client connects; choose **Allow** only for a session you trust.

If the switch is unavailable, inspect `chrome://policy` and the machine policy:

```powershell
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Google\Chrome' -Name RemoteDebuggingAllowed
```

`RemoteDebuggingAllowed = 0` blocks auto-connect and `--remote-debugging-port`. Ask the responsible administrator to enable the policy. Do not bypass enterprise policy locally.

### 4. Install automatic controlled-tab grouping

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository's `extension` directory.
5. Review and accept the `debugger`, `tabGroups`, `storage`, and `alarms` permissions.
6. Pin **Codex CLI Controlled Tab Grouper** to the toolbar.
7. Open its popup and set a title, for example `Codex CLI · EWS_Betriebsrat` or a Codex session title.
8. Choose **Save & scan**.

The extension scans immediately on browser startup, relevant tab activity, and at least every 30 seconds. **Scan now** provides an explicit readback.

If Chrome reports `Extension installation is blocked by policy`, stop. Do not remove or bypass the policy locally. Managed environments commonly combine `ExtensionInstallBlocklist = *` with an explicit allowlist and may also set `BlockExternalExtensions = 1`. Follow [Enterprise deployment](docs/ENTERPRISE-DEPLOYMENT.md) instead.

> Chrome does not expose the identity of an external debugger client. The extension groups every externally attached page target. This is disclosed in the popup and in [SECURITY.md](SECURITY.md).

### 5. Run the end-to-end smoke test

Keep Chrome running with Remote Debugging enabled, then run:

```powershell
node .\scripts\mcp-smoke.cjs
```

Chrome should ask for connection approval. After **Allow**, a successful result contains:

```json
{
  "status": "pass",
  "reason": "chrome_connected"
}
```

The controlled page should appear in the configured Chrome tab group.

## Privacy-focused defaults

The recommended MCP entry uses:

- `--no-usage-statistics`: disables Chrome DevTools MCP usage telemetry.
- `--no-performance-crux`: prevents performance-trace URLs from being sent to the CrUX API.
- `--no-javascript-evaluation`: removes JavaScript-evaluation tools from the MCP surface.

These flags reduce exposure but do not make an attached browser session unprivileged. The agent can still read and operate pages through the remaining DevTools tools.

## Troubleshooting

### MCP is configured but tools are missing

Restart Codex CLI after `codex mcp add`. MCP discovery happens when the Codex session starts.

### Chrome never asks for approval

- Confirm Chrome is version 144 or newer.
- Confirm Remote Debugging is enabled at `chrome://inspect/#remote-debugging`.
- Check `RemoteDebuggingAllowed` in `chrome://policy`.
- Confirm `codex mcp get chrome-devtools` reports `enabled: true`.

### The connection works but no tab is grouped

1. Open the extension popup and choose **Scan now**.
2. Confirm the popup reports at least one controlled tab.
3. Inspect the extension service worker from `chrome://extensions` for errors.
4. Confirm the controlled target is a normal page tab. Workers and browser-internal targets are deliberately ignored.

### Extension installation is blocked by policy

Read [Enterprise deployment](docs/ENTERPRISE-DEPLOYMENT.md). The recommended organizational path is a reviewed Chrome Web Store listing that is allowlisted or force-installed by IT. An internally hosted CRX is also possible on eligible managed Windows devices, but requires controlled signing-key and update-host operations.

### The group title is wrong

Set the desired project or session title in the extension popup and choose **Save & scan**. Existing groups with that exact title are reused per browser window.

### Remove the workaround

```powershell
codex mcp remove chrome-devtools
```

Then remove **Codex CLI Controlled Tab Grouper** from `chrome://extensions`. The extension intentionally leaves already grouped tabs grouped; ungroup them normally in Chrome if desired.

## Why the Chrome automation banner is unchanged

Chrome's “controlled by automated test software” banner is a browser security indicator with a fixed localized string. It cannot be renamed to include a Codex project or session title through MCP. This project adds the visible tab group instead of hiding or modifying that warning.

## Primary references

- [OpenAI: connect and verify MCP servers in Codex](https://developers.openai.com/learn/docs-mcp)
- [Chrome: connect an agent with auto-connect](https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect)
- [Chrome DevTools MCP configuration](https://developer.chrome.com/docs/devtools/agents/get-started/configuration)
- [Chrome `debugger` API](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [Chrome `tabs.group()` API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-group)
- [Chrome `tabGroups` API](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)
- [Chromium `RemoteDebuggingAllowed` policy](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/policy/resources/templates/policy_definitions/Miscellaneous/RemoteDebuggingAllowed.yaml)

## Status

This is a community workaround, not an official OpenAI or Google product. Pinning the MCP package makes the tested setup reproducible; review upstream release notes before changing the version.
