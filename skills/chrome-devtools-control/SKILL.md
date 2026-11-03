---
name: chrome-devtools-control
description: Control and verify pages in an existing authenticated Chrome session through the chrome-devtools MCP server, especially when Codex reports that native browser or desktop access is unavailable. Use for Chrome UI tests, deployments through a web UI, page inspection, and controlled-tab recovery; do not use it to bypass Chrome security or enterprise policy.
---

# Chrome DevTools Control

Use the configured `chrome-devtools` MCP server before concluding that browser work is impossible. A broken native Browser or Computer Use channel does not prove that the MCP path is unavailable.

## Establish capability

1. Inspect the tools available in the current Codex session for the `chrome-devtools` server.
2. If its page tools are present, use them. Do not fall back to native Browser or desktop automation merely because those channels failed.
3. If the server was configured after this Codex session started, explain that the session must be restarted for tool discovery. A skill cannot hot-add missing MCP tools.
4. If the tools exist but Chrome does not connect, ask the user to open `chrome://inspect/#remote-debugging`, enable Remote Debugging when authorized, and approve Chrome's connection prompt. Do not accept the prompt for the user.

When the tools are absent, report the exact missing capability and recommend this readback:

```powershell
codex mcp get chrome-devtools
codex mcp list
```

Do not respond only with a generic statement such as "no browser is available."

## Select the controlled page

1. Call `list_pages` immediately before selecting. Page IDs are session state and may change.
2. Match the target using both its current URL and visible title. Never reuse a numeric page ID from an earlier listing without a fresh readback.
3. Prefer an existing appropriate tab. Call `select_page` with `bringToFront=true`.
4. Reuse the selected tab for subsequent navigation unless the task genuinely needs another tab or the user asks for one.
5. Create a new page only when no suitable tab exists and doing so matches the user's request.

If more than one page matches, show the concise candidates and ask which one to use rather than guessing.

## Navigate and verify

- Use `navigate_page` for the requested URL after selecting the intended tab.
- Use `wait_for` when the page has a known loading state or expected text.
- Prefer `take_snapshot` for accessible structure and actionable controls.
- Use `take_screenshot` when visual layout or a rendered state materially matters.
- After every navigation or meaningful action, read back the current URL and page state before claiming success.
- For a UI deployment or administrative mutation, verify the final status shown by the application and preserve any failure details. Do not infer success from a click alone.

Honor the user's requested action boundary. Inspection does not authorize writes, deployments, permission changes, form submissions, or deletion.

## Keep the controlled tab findable

Choose the path supported by the environment:

- **Immediate manual path:** bring the target tab forward, tell the user its title and URL, and ask them to use Chrome's **Add tab to new group** once. Recommend `Codex CLI - <project or session>` as the group title. Continue in that same selected tab after confirmation.
- **Managed automatic path:** when the repository's reviewed grouping extension is installed and permitted, let it group attached page targets automatically. Do not weaken enterprise extension policy to install it.

Chrome's automation banner is a security indicator. Do not attempt to hide or rename it.

## Failure reporting

Distinguish these conditions explicitly:

- `native_channel_unavailable`: native Browser or Computer Use failed, but MCP has not yet been ruled out.
- `mcp_tools_missing`: the current Codex session did not discover `chrome-devtools`; verify configuration and restart the session.
- `chrome_connection_pending`: MCP tools exist, but Chrome needs Remote Debugging enabled or user approval.
- `target_page_missing`: Chrome connected, but no matching page exists.
- `page_operation_failed`: the page was selected, but navigation or interaction returned a concrete error.

Never describe an enterprise-policy block as a software defect, and never change Registry, GPO, MDM, or extension allowlists without explicit authorization.
