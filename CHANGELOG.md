# no-blind-coding

## 0.1.0

### Minor Changes

- 2ceb525: Initial release: mentor-mode engine, MCP server, and per-editor persona file generator.

  - Engine that breaks a goal into steps, gates progression on the developer's own code passing review, and supports handing a section/step off to the AI.
  - Stdio MCP server exposing the loop as tools (`create_plan`, `current_step`, `prepare_file`, `submit_for_review`, `approve_step`, `request_changes`, `handoff`, `session_status`).
  - `no-blind-coding-init` generates rules files for Claude Code, Cursor, VS Code (Copilot), Zed, Codex, and Antigravity.
