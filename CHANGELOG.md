# no-blind-coding

## 0.4.0

### Minor Changes

- 978c234: Add a pedagogy layer: mission grounding and learning records.

  The mentor now pins down _why_ the developer is here (`set_mission`, or a
  `mission` on `create_plan`) and keeps cross-step, cross-restart memory of what
  they've demonstrably learned (`record_learning`, with supersession). Review is
  grounded in the mission and calibrated to the developer's real level (zone of
  proximal development), and the persona/rubric now push storage strength —
  spacing and interleaving — over in-the-moment fluency.

## 0.3.1

### Patch Changes

- 0cd5a5a: Persona now tells the host to treat the developer as a collaborator: welcome pushback, adopt a better approach or correction via `revise_step` when the developer is right, explain disagreements instead of overruling, and trust the developer on current APIs/versions over its own training cutoff.

## 0.3.0

### Minor Changes

- d08cd3d: Add Trae to `no-blind-coding-init` — generates `.trae/rules/project_rules.md`. (The MCP server already worked in Trae via `.trae/mcp.json`; this adds the native rules file.)

### Patch Changes

- d08cd3d: Review rubric now tells the host to apply the project's conventions and any active editor rules/skills (semantic HTML, framework idioms), and treats accessibility, semantic correctness, and security as non-negotiable — flagged even on a first pass.

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
