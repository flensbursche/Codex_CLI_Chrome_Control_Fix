# Validation record

Date: 2026-11-03

## Original live-validation environment

- Windows 11
- Codex CLI 0.166.0
- Chrome Stable 156.0.8078.80
- Node.js 24.22.1
- chrome-devtools-mcp 1.12.0

## Original live validation passed

- `RemoteDebuggingAllowed=1` read back from effective machine policy.
- Codex MCP entry enabled with auto-connect and privacy-focused flags.
- Live MCP initialize, tool discovery, and `list_pages` call returned `status=pass`, `reason=chrome_connected`.
- The MCP connection could inspect and operate an authenticated internal application tab after explicit Chrome approval.
- The immediate fallback passed live: MCP `list_pages` identified the application page, `select_page` brought it to the foreground, and the user placed the active tab in a named Chrome group without an extension or policy change.
- Application rollout through the browser UI completed source update, image build, container recreate, health smoke, and session smoke successfully.

## Version 1.0.1 hardening validation

Validated locally on Windows 11 with Node.js 24.14.1 and Chrome Stable 156.0.8078.80:

- Extension and smoke-test JavaScript syntax checks passed for version `1.0.1`.
- Eight unit and mocked Chrome API integration tests passed.
- Group ownership tests verified that a same-titled user group is not reused.
- Partial-failure tests verified that healthy windows continue to be grouped when another window fails and that stale tabs are reported.
- The installer dry-run found the default Chrome installation and emitted the expected pinned MCP command without changing configuration.
- Unsafe `CHROME_DEVTOOLS_MCP_VERSION` input was rejected before a child process could start.
- The packaged extension contained all seven expected files, including `scanner.js`.
- Release artifact: `dist/codex-cli-controlled-tab-grouper-v1.0.1.zip`.
- SHA-256: `7515e6ce1925d30912192ed9c8a3a524807c07fb9c26cd08da03919935e7b77b`.
- `git diff --check` passed with no whitespace errors.

## Version 1.1.0 skill and plugin validation

- The bundled Skill Creator validator reported `Skill is valid!`.
- Twelve repository tests passed, including four plugin/skill configuration tests.
- Six structured skill evaluation cases cover direct activation, indirect activation, ambiguous input, non-activation, policy safety, and missing MCP tools.
- `agents/openai.yaml` declares the `chrome-devtools` stdio MCP dependency.
- `plugin.json` and `mcp.json` use the portable Agent Plugins layout and require local execution.
- The packaged plugin contained exactly the skill bundle, `plugin.json`, `mcp.json`, and `LICENSE`.
- Release artifact: `dist/codex-cli-chrome-control-plugin-v1.1.0.zip`.
- SHA-256: `3b4733b68b60186bb726ddbbe05e2604f125724039d2b7a3758b407805b4cb7e`.

## Environment-specific automatic-path blocker

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

Until this gate passes, automatic grouping is implemented and tested with mocked Chrome APIs but not claimed as live-accepted in the managed production Chrome profile. The immediate manual grouping fallback is independently live-accepted and remains available.
