<p align="center">
  <img src="assets/logo.svg" width="200" alt="No-Blind-Coding">
</p>

<h1 align="center">No-Blind-Coding</h1>

<p align="center">
  <em>Your AI won't write it. You will. That's the point.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/no-blind-coding?style=flat-square&color=15151c&label=npm" alt="npm version">
  <img src="https://img.shields.io/github/stars/marshallshelly/no-blind-coding?style=flat-square&color=15151c&label=stars" alt="Stars">
  <img src="https://img.shields.io/badge/works%20with-7%20editors-15151c?style=flat-square" alt="Works with 7 editors">
  <img src="https://img.shields.io/badge/license-MIT-15151c?style=flat-square" alt="MIT license">
</p>

<p align="center">
  <strong>0 lines written for you &middot; 100% written by you &middot; reviewed line by line</strong><br>
  <sub>A senior mentor that lives inside your AI editor and refuses to touch your keyboard.</sub>
</p>

---

Most AI tools finish the task for you. You paste fifty lines you didn't write, ship them, and couldn't explain a single one in code review. It feels fast. It's debt — and it's quietly starving junior devs of the exact struggle that turns them into seniors.

No-Blind-Coding flips the agent around. It still breaks the big task down, but instead of writing the code, it tells you — in plain English — the one small piece to write next, opens the file, waits, then reviews what **you** wrote like a senior at your shoulder. You ship code you understand because you wrote it.

## Before / after

You ask for a rate limiter.

**A normal agent** writes the class, the tests, and a paragraph about token buckets. You merge it. Next month it breaks and it may as well be someone else's code.

**No-Blind-Coding:**

```text
you   build me a rate limiter
nbc   Five steps. Step 1, in limiter.ts: write a class that keeps a list of request timestamps per key. Just the shape — no logic yet.
you   done
nbc   Good. One nudge: use Map<string, number[]>, not an object — keys can be anything, and Map won't collide with prototype keys. Fix that and we'll add the sliding window in step 2.
```

You wrote every line. You can debug it at 2am. You can explain it in the interview.

## How it works

The loop is a short ladder. The AI never skips a rung for you:

```
create_plan        break the task into small, ordered steps
prepare_file       open the file — or tell you to create it → you write the one piece it asked for, then say "done"
submit_for_review  it reads exactly what you wrote
approve / changes  pass and advance, or teach (not solve) and retry
```

Two rules keep it honest:

- **The gate.** It only moves to the next step after _your_ code passes review. Progress is bound to your keystrokes, not the model's.
- **The escape hatch.** Hate frontend? `handoff` that section and the AI writes it — then explains what it did, so you still learn something.

## Install

Works with **7 editors**. Pick your setup; the mentor is the same everywhere.

### Claude Code

```bash
claude mcp add --scope user no-blind-coding -- npx -y no-blind-coding
```

That's it. Start a session and say _"use no-blind-coding to mentor me through &lt;your task&gt;."_

### Cursor · Claude Desktop · VS Code · Zed · Codex · Antigravity

Add the server to the host's MCP config:

```json
{
  "mcpServers": {
    "no-blind-coding": {
      "command": "npx",
      "args": ["-y", "no-blind-coding"]
    }
  }
}
```

### Editor rules files (recommended)

MCP server instructions aren't honored equally by every host, so drop a native rules file into your project. One command writes the right file for each editor:

```bash
npx -p no-blind-coding no-blind-coding-init .      # all editors
npx -p no-blind-coding no-blind-coding-init . --only cursor,zed
npx -p no-blind-coding no-blind-coding-init . --list
```

| Editor              | File it writes                      |
| ------------------- | ----------------------------------- |
| Claude Code         | `CLAUDE.md`                         |
| Cursor              | `.cursor/rules/no-blind-coding.mdc` |
| VS Code (Copilot)   | `.github/copilot-instructions.md`   |
| Zed                 | `.rules`                            |
| Codex / Antigravity | `AGENTS.md`                         |

Existing files are updated in place between markers — your content is preserved, and re-running is idempotent. (Claude Desktop has no rules file; it leans on the server's instructions.)

## The tools

| Tool                | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `create_plan`       | Break the goal into ordered steps; activate the first.   |
| `current_step`      | Show the step you're on.                                 |
| `prepare_file`      | Open the step's file, or tell you to create it.          |
| `submit_for_review` | Read what you wrote and weigh it against a rubric.       |
| `approve_step`      | The gate — advance only after your code is right.        |
| `request_changes`   | Specific, kind feedback that teaches instead of solving. |
| `handoff`           | Delegate a section or step to the AI, on demand.         |
| `session_status`    | Goal, progress, current step, handoffs, full plan.       |

## Configuration

The mentor keeps your lesson state in `.nbc/session.json` so it survives restarts — and even switching editors mid-task. By default that's the current working directory; pin it explicitly with an env var:

```jsonc
"env": { "NBC_PROJECT_ROOT": "/absolute/path/to/your/project" }
```

No other config. No API keys. The model is whatever your editor already runs.

## Development

```bash
pnpm install
pnpm build       # tsc -> dist/
pnpm test        # node:test via tsx, isolated temp dirs
```

Versioning and changelogs run on [Changesets](https://github.com/changesets/changesets): run `pnpm changeset` with any meaningful change and commit the generated file. Merging to `main` opens a release PR; merging that publishes to npm.

## FAQ

**Will it just write the code if I ask nicely?**
Only what you `handoff`. Everything else, you write. It'll explain the parts it does take, so a handoff still teaches you something.

**Isn't this slower than letting the AI do it?**
Yes. So was learning to read. You're buying understanding, not lines.

**I'm a senior. I don't need a babysitter.**
Then hand off the boring parts and keep the interesting ones — or close the tab. It won't be offended.

**Does it need a config file or an API key?**
No and no. It rides on the model your editor already has.

**What does it actually protect?**
Correctness, edge cases, and your growth. It won't let you advance on broken code, and it won't hand you the answer when a hint will do.

## License

[MIT](LICENSE).
