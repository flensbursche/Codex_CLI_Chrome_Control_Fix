# Codex CLI Chrome Control Fix

A reproducible Windows workaround for Codex CLI sessions that cannot use the built-in Chrome browser host and fail with errors such as:

```text
The browser access host is unavailable
Computer Use native pipe is unavailable
```

This project does **not** patch or replace Codex. It adds the official Chrome DevTools MCP server to Codex CLI and offers two visible-tab workflows: an immediate manual grouping fallback that needs no extension, and a companion extension for automatic grouping after policy approval.

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
   ├─ Immediate path: Codex selects the target; the user groups it once
   └─ Managed path: companion extension observes attached target IDs
      and moves those tabs into a named Chrome tab group automatically
```

The extension has no website host permissions. It uses the `debugger` permission only for `chrome.debugger.getTargets()`, then uses `chrome.tabs.group()` and `chrome.tabGroups.update()` to organize the returned tab IDs. It never attaches a debugger itself.

| Path | Available immediately | Extension required | Grouping behavior | Best for |
| --- | --- | --- | --- | --- |
| Manual fallback | Yes | No | User groups the Codex-selected tab once | Locked-down Chrome and immediate use |
| Managed extension | After installation approval | Yes | Attached page tabs are grouped automatically | Recurring use and many concurrent sessions |

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

The effective Windows policy is a `REG_DWORD` at:

```text
HKLM\SOFTWARE\Policies\Google\Chrome\RemoteDebuggingAllowed
```

On an endpoint that you are explicitly authorized to administer, an elevated PowerShell can create or enable it with:

```powershell
$chromePolicy = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
New-Item -Path $chromePolicy -Force | Out-Null
New-ItemProperty -Path $chromePolicy -Name RemoteDebuggingAllowed -PropertyType DWord -Value 1 -Force
```

Then close all Chrome windows, start Chrome again, open `chrome://policy`, choose **Reload policies**, and verify `RemoteDebuggingAllowed = true`. Chrome still requires explicit approval when an agent connects.

`RemoteDebuggingAllowed = 0` blocks both auto-connect and `--remote-debugging-port`. Domain GPO or MDM may overwrite a local value; in that case the responsible administrator must change the managed policy. Do not alter `ExtensionInstallBlocklist`, `ExtensionInstallAllowlist`, `ExtensionInstallForcelist`, or `BlockExternalExtensions` as a workaround. This registry value enables the DevTools connection only; it does not install the grouping extension.

### 4A. Use the immediate manual grouping fallback

Use this path when extension installation is blocked or has not yet been approved:

1. Ask Codex to call `list_pages` through the Chrome DevTools MCP server.
2. Ask Codex to select the intended page with `select_page` and `bringToFront=true`.
3. Confirm that the intended tab is active in Chrome.
4. Right-click that tab and choose **Add tab to new group**.
5. Name the group `Codex CLI · <project or session>` and choose a visible color.
6. Ask Codex to reuse that selected tab for the rest of the session.

This requires no extension, no administrator rights, and no policy change. Chrome DevTools can select the controlled page but cannot create a Chrome tab group, so the one grouping action remains deliberately user-driven. See [Immediate manual grouping](docs/IMMEDIATE-MANUAL-GROUPING.md) for the operator runbook and a reusable Codex prompt.

### 4B. Install automatic controlled-tab grouping

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

With the extension path, the controlled page should appear in the configured Chrome tab group automatically. With the manual path, run the grouping step after the smoke has selected or exposed the controlled tab.

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
