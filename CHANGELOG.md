# no-blind-coding

## 0.2.0

### Minor Changes

- 84fa24d: Adaptive mentoring and contributor docs.

  - **Plan revision** — new tools `add_steps`, `revise_step`, and `skip_step` let the mentor adapt the plan as the work reveals itself instead of recreating it, preserving completed progress. `reset_session` archives the current plan (under `.nbc/archive`) to start a fresh goal.
  - **Diff-based review** — `prepare_file` now snapshots the file, and `submit_for_review` reviews a line diff of what the developer actually wrote rather than the whole file.
  - **Hint laddering** — review feedback escalates with attempts: a gentle nudge first, a concrete pointer next, a small worked example only when truly stuck.
  - Added `CONTRIBUTING.md` and GitHub issue/PR templates.

## 0.1.0

### Minor Changes

- 2ceb525: Initial release: mentor-mode engine, MCP server, and per-editor persona file generator.

  - Engine that breaks a goal into steps, gates progression on the developer's own code passing review, and supports handing a section/step off to the AI.
  - Stdio MCP server exposing the loop as tools (`create_plan`, `current_step`, `prepare_file`, `submit_for_review`, `approve_step`, `request_changes`, `handoff`, `session_status`).
  - `no-blind-coding-init` generates rules files for Claude Code, Cursor, VS Code (Copilot), Zed, Codex, and Antigravity.
