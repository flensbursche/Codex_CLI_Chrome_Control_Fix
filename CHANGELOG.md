# Changelog

## 1.0.1 - 2026-11-03

- Reuse only tab groups created by the extension in the current browser session, preventing collisions with same-titled user groups and stale group IDs.
- Continue grouping healthy Chrome windows when another window fails and expose partial failures in the popup status.
- Record background scan failures instead of leaving rejected service-worker promises unhandled.
- Stop the MCP smoke process tree promptly on success or failure and reject unsafe version input.
- Detect machine-wide, 32-bit, and user-local Chrome installations; allow an explicit `-ChromePath` override.
- Add mocked Chrome API integration tests for group ownership, collision avoidance, stale tabs, and partial failures.

## 1.0.0 - 2026-11-03

- Initial manual and managed Chrome control workaround.
