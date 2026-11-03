# Validation record

Date: 2026-11-03

## Environment

- Windows 11
- Codex CLI 0.166.0
- Chrome Stable 156.0.8078.80
- Node.js 24.22.1
- chrome-devtools-mcp 1.12.0

## Passed

- `RemoteDebuggingAllowed=1` read back from effective machine policy.
- Codex MCP entry enabled with auto-connect and privacy-focused flags.
- Live MCP initialize, tool discovery, and `list_pages` call returned `status=pass`, `reason=chrome_connected`.
- The MCP connection could inspect and operate an authenticated internal application tab after explicit Chrome approval.
- Application rollout through the browser UI completed source update, image build, container recreate, health smoke, and session smoke successfully.
- Extension JavaScript syntax checks passed.
- Three grouping unit tests passed.

## Environment-specific blocker

The live extension grouping smoke could not run on the validation workstation because enterprise policy correctly rejected unpacked extension installation:

```text
BlockExternalExtensions = 1
ExtensionInstallBlocklist = *
```

The machine has a finite `ExtensionInstallAllowlist`; this extension does not yet have a reviewed stable ID on that list. No policy was changed or bypassed.

## Remaining acceptance gate

After Web Store publication or managed enterprise distribution:

1. Read back the stable extension ID and effective policy.
2. Start a user-approved MCP auto-connect session.
3. Verify that attached page tabs enter the configured group.
4. Verify that unrelated tabs remain outside it.
5. Verify **Scan now** reports the same controlled-tab count.
6. Verify removal or policy rollback.

Until this gate passes, automatic grouping is implemented and unit-tested but not claimed as live-accepted in the managed production Chrome profile.
