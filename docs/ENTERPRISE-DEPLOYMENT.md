# Enterprise deployment

The controlled-tab group is a required usability and safety feature when users have many tabs open. Managed Chrome environments should deploy the companion extension through policy rather than asking users to bypass extension controls.

## Why unpacked installation may fail

The following policy combination blocks an unpacked extension by design:

```text
BlockExternalExtensions = 1
ExtensionInstallBlocklist = *
```

`ExtensionInstallAllowlist` exempts listed IDs from the general blocklist. `BlockExternalExtensions` is a separate policy that blocks externally installed extensions. Do not weaken either policy globally merely to test this project.

Inspect the effective state in `chrome://policy` or read the machine policy without changing it:

```powershell
$root = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
Get-ItemProperty $root -Name BlockExternalExtensions
Get-ItemProperty "$root\ExtensionInstallBlocklist"
Get-ItemProperty "$root\ExtensionInstallAllowlist"
Get-ItemProperty "$root\ExtensionInstallForcelist" -ErrorAction SilentlyContinue
```

## Recommended: Chrome Web Store plus enterprise allowlist

This is the preferred route for colleagues and external users:

1. Security reviews the source and declared permissions.
2. The maintainer uploads a release ZIP to the Chrome Web Store.
3. Record the assigned stable extension ID.
4. IT adds that ID to `ExtensionInstallAllowlist`, or uses managed Chrome app and extension settings to allow or force-install it.
5. Users reload policy from `chrome://policy` and install the approved listing, unless it is force-installed.
6. Validate grouping with the MCP smoke test and the extension's **Scan now** readback.

For a general allowlist entry on Windows:

```text
HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist\<n>
  = <stable-extension-id>
```

For a Web Store force-install entry:

```text
<stable-extension-id>;https://clients2.google.com/service/update2/crx
```

Policy ownership remains with IT. This repository deliberately provides no script that writes these registry values.

## Alternative: internally hosted managed CRX

Eligible AD/Azure AD/Chrome Enterprise-managed Windows devices can force-install a non-Web-Store extension. This path requires:

- a protected extension signing key;
- a stable extension ID derived from that key;
- a signed CRX artifact;
- an HTTPS update manifest and CRX host;
- an `ExtensionInstallForcelist` entry containing `<id>;<update-url>`;
- a release and key-rotation process owned by IT.

Do not commit the private signing key to this public repository. Do not use a personal workstation or GitHub Actions secret as the only copy of an organizational signing key.

## Permission review

The extension declares:

| Permission | Purpose |
| --- | --- |
| `debugger` | Calls `chrome.debugger.getTargets()` to identify page targets already attached by external automation. It never calls `attach()` or `sendCommand()`. |
| `tabGroups` | Creates and names the visible controlled-tab group. |
| `storage` | Stores the selected title/color/collapsed settings, last scan status, and current-session ownership of extension-created groups. |
| `alarms` | Provides a periodic fallback scan for service-worker suspension. |

There are no host permissions and no content scripts. The extension cannot read page DOM, cookies, form values, or network traffic through its implementation.

Chrome's `debugger` permission remains powerful and must be reviewed as such. Source review and managed distribution are required; the narrow implementation is a control, not a replacement for permission governance.

## Acceptance checklist

- [ ] Source and requested permissions reviewed.
- [ ] Stable extension ID recorded.
- [ ] Web Store or internal update source approved.
- [ ] Allowlist or force-install policy deployed.
- [ ] `chrome://policy` shows the expected effective policy without conflicts.
- [ ] Extension is installed and enabled.
- [ ] Remote Debugging remains explicitly user-approved per connection.
- [ ] MCP smoke returns `status=pass`.
- [ ] Attached tab appears in the configured `Codex CLI · <project/session>` group.
- [ ] Non-attached tabs remain outside the group.
- [ ] Removal/rollback path tested.

## IT approval request template

```text
Subject: Review and managed deployment of Codex CLI Controlled Tab Grouper

Purpose:
Make browser tabs controlled through an approved Codex CLI / Chrome DevTools MCP
session clearly visible and findable in Chrome windows with many tabs.

Requested action:
1. Review the public source and four declared permissions.
2. Approve the stable extension ID through Chrome enterprise policy.
3. Prefer a Chrome Web Store allowlist or managed force-install.

Security boundaries:
- no website host permissions;
- no content scripts;
- no page-content, cookie, form, or network reads by the extension;
- chrome.debugger is used only for getTargets();
- the extension never attaches or sends DevTools commands;
- Chrome's own remote-debugging approval and automation banner remain intact;
- enterprise extension and remote-debugging policies are not bypassed.

Evidence required before rollout:
- repository commit;
- package tests;
- policy readback;
- MCP connection smoke;
- visible tab-group smoke;
- rollback verification.
```

## Primary policy references

- [Chrome Enterprise: BlockExternalExtensions](https://chromeenterprise.google/policies/block-external-extensions/)
- [Chrome Enterprise: ExtensionInstallAllowlist](https://chromeenterprise.google/policies/extension-install-allowlist/)
- [Chrome Enterprise: ExtensionInstallBlocklist](https://chromeenterprise.google/policies/extension-install-blocklist/)
- [Chrome Enterprise: ExtensionInstallForcelist](https://chromeenterprise.google/policies/extension-install-forcelist/)
