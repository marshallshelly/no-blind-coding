---
"no-blind-coding": minor
---

Adaptive mentoring and contributor docs.

- **Plan revision** — new tools `add_steps`, `revise_step`, and `skip_step` let the mentor adapt the plan as the work reveals itself instead of recreating it, preserving completed progress. `reset_session` archives the current plan (under `.nbc/archive`) to start a fresh goal.
- **Diff-based review** — `prepare_file` now snapshots the file, and `submit_for_review` reviews a line diff of what the developer actually wrote rather than the whole file.
- **Hint laddering** — review feedback escalates with attempts: a gentle nudge first, a concrete pointer next, a small worked example only when truly stuck.
- Added `CONTRIBUTING.md` and GitHub issue/PR templates.
