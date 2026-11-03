# Immediate manual grouping

This is the operational fallback when Codex CLI can control Chrome through `chrome-devtools-mcp`, but Chrome policy blocks installation of the automatic grouping extension.

It does not bypass enterprise policy. Codex identifies and activates the intended page; the user performs Chrome's normal **Add tab to new group** action once.

## When to use it

- `chrome-devtools-mcp` connects successfully.
- Chrome Remote Debugging has been explicitly enabled and the connection approved.
- `list_pages` returns the intended page.
- Unpacked or external extensions are blocked, not yet reviewed, or intentionally unavailable.

## Operator runbook

1. Start Chrome and leave the intended signed-in profile open.
2. Start Codex CLI with the configured `chrome-devtools` MCP server.
3. Approve Chrome's Remote Debugging connection prompt.
4. Ask Codex to list the available Chrome pages.
5. Identify the exact target by title and URL. Do not guess an index from an older list.
6. Ask Codex to call `select_page` for that current page with `bringToFront=true`.
7. Confirm visually that the correct tab is active.
8. Right-click the active tab and select **Add tab to new group**.
9. Create a group named `Codex CLI · <project or session>` and choose a visible color.
10. Tell Codex to reuse the selected tab and avoid opening extra tabs unless required.

The Chrome automation banner remains visible. It is a browser security indicator and is not replaced or hidden by this workflow.

## Reusable Codex prompt

```text
Use the configured chrome-devtools MCP connection. Call list_pages first.
Find the page whose title and URL match <target>. Select that current page with
select_page and bringToFront=true. Do not create a new tab. After selection,
stop and tell me which tab is active so I can place it in the Chrome group
"Codex CLI · <project or session>". Reuse that page for subsequent browser work.
```

## Session rules

- Always call `list_pages` again before selecting when page IDs may have changed.
- Match both title and URL; do not select solely by an old numeric page ID.
- Reuse the grouped page for navigation when practical.
- If a task requires a second tab, bring it forward and let the user add it to the same group.
- Never change Chrome enterprise policies to automate this fallback.

## Expected evidence

- MCP connection smoke returns `status=pass` and `reason=chrome_connected`.
- `list_pages` shows the intended page.
- `select_page` reports that page as selected.
- The user confirms the active tab is in the named group.

## Limitation

Chrome DevTools Protocol controls page targets, not Chrome's tab-strip organization. Creating or updating a tab group is exposed through Chrome's extension APIs. Therefore the manual fallback has one deliberate user action; the managed extension path automates it after approval.
