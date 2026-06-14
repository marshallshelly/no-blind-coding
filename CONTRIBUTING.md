# Contributing

Thanks for helping make No-Blind-Coding better. This project is small and
TypeScript-first; the bar is "tested, typed, and in keeping with the existing
style."

## Setup

Requires Node 18+ and pnpm (pinned via the `packageManager` field — Corepack
will fetch the right version).

```bash
pnpm install
pnpm run build      # tsc -> dist/
pnpm test           # node:test via tsx
pnpm run typecheck
```

## Project layout

- `src/engine/` — the model-free state machine. No LLM calls live here; it owns
  the methodology and the persisted session (`.nbc/session.json`).
  - `index.ts` (the `Engine`), `types.ts`, `store.ts`, `rubric.ts`, `diff.ts`,
    `persona.ts`.
- `src/server.ts` — the stdio MCP server that exposes the engine as tools.
- `src/generate/` — generates the per-editor rules files from `persona.ts`.
- `test/` — `node:test` suites; each uses an isolated temp dir.

## Making a change

1. Branch off `main`.
2. Make the change. Keep the engine model-free — intelligence belongs to the
   host LLM, state belongs to the engine.
3. Add or update tests. Engine behavior should be covered by `test/`.
4. Run `pnpm test` and `pnpm run typecheck` — both must pass.
5. **Add a changeset** so your change shows up in the changelog and triggers a
   release:

   ```bash
   pnpm changeset
   ```

   Pick the bump (patch/minor/major), describe the change in user-facing terms,
   and commit the generated `.changeset/*.md` with your PR.

## Style

- Match the surrounding code: `import type` for type-only imports, optional
  fields typed `T | undefined` where a zod-inferred `.optional()` flows in
  (the tsconfig is strict — `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- Comments explain _why_, not _what_. Keep them at the density of nearby code.
- Conventional-commit prefixes (`feat:`, `fix:`, `ci:`, `docs:`) are appreciated.

## Releases (maintainers)

Releases are automated by Changesets. Merging the **Version Packages** PR on
`main` publishes to npm and cuts the GitHub Release. You don't publish by hand.
