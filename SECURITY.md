# Security

This project connects a coding agent to a real, signed-in browser profile. Treat that as privileged access.

## Security properties

- The recommended MCP configuration disables usage statistics, CrUX lookups, and JavaScript-evaluation tools.
- The portable local plugin starts the pinned `chrome-devtools-mcp@1.12.0` package through `npx`; review `mcp.json` and the pinned upstream package before installation. The plugin requires local execution and does not bundle Node.js, npm, Chrome, or the MCP package itself.
- The tab-grouping extension declares no host permissions and injects no scripts into websites.
- The extension uses `chrome.debugger.getTargets()` only to identify externally attached page targets. It does not attach, read page content, or send DevTools commands.
- The extension remembers its own group IDs only for the current browser session and does not claim unrelated user groups that happen to use the same title or receive a reused ID later.
- Chrome still asks the user to approve each auto-connect session.
- The setup script never changes or bypasses enterprise policy.

## Important limitations

- A connected agent can inspect and operate authenticated browser tabs through Chrome DevTools MCP.
- The Chrome `debugger` permission is powerful and produces an installation warning even though this extension uses only `getTargets()`.
- Chrome exposes whether a target is attached, but not the name of the attaching client. The extension therefore groups every externally attached page target, not only Codex targets.
- The built-in automation banner is a Chrome security indicator and is intentionally left intact.

Use a separate Chrome profile when the agent should not have access to personal or unrelated work sessions. Review the source before installing the unpacked extension.

Please report security issues privately to the repository owner rather than opening a public issue containing credentials, cookies, internal URLs, or screenshots.
