import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, it } from "node:test";
import { TARGETS, generate, resolveTargets } from "../src/generate/index.js";

let dest: string;

beforeEach(() => {
  dest = mkdtempSync(join(tmpdir(), "nbc-gen-"));
});

function read(rel: string): string {
  return readFileSync(join(dest, rel), "utf8");
}

describe("generate", () => {
  it("writes a rules file for every editor", () => {
    const results = generate(dest);
    assert.ok(existsSync(join(dest, "CLAUDE.md")));
    assert.ok(existsSync(join(dest, ".cursor/rules/no-blind-coding.mdc")));
    assert.ok(existsSync(join(dest, ".github/copilot-instructions.md")));
    assert.ok(existsSync(join(dest, ".rules")));
    assert.ok(existsSync(join(dest, "AGENTS.md")));
    assert.ok(results.every((r) => r.action === "created"));
  });

  it("dedupes editors that share a file", () => {
    const results = generate(dest);
    const agents = results.find((r) => r.file === "AGENTS.md");
    assert.deepEqual(agents?.targets, ["Codex", "Antigravity"]);
    // one entry per file, not one per editor
    assert.equal(new Set(results.map((r) => r.file)).size, results.length);
  });

  it("is idempotent on a second run", () => {
    generate(dest);
    const second = generate(dest);
    assert.ok(second.every((r) => r.action === "unchanged"));
  });

  it("preserves existing content and updates between markers", () => {
    writeFileSync(join(dest, "CLAUDE.md"), "# House rules\n\nKeep tests green.\n");
    const first = generate(dest, { only: ["claude-code"] });
    assert.equal(first[0]?.action, "updated");
    const content = read("CLAUDE.md");
    assert.match(content, /House rules/);
    assert.match(content, /Keep tests green/);
    assert.equal((content.match(/no-blind-coding:start/g) ?? []).length, 1);

    // Re-running replaces the block in place rather than appending a new one.
    generate(dest, { only: ["claude-code"] });
    const after = read("CLAUDE.md");
    assert.equal((after.match(/no-blind-coding:start/g) ?? []).length, 1);
    assert.match(after, /House rules/);
  });

  it("gives Cursor a dedicated always-applied file", () => {
    generate(dest, { only: ["cursor"] });
    const mdc = read(".cursor/rules/no-blind-coding.mdc");
    assert.match(mdc, /^---\n/);
    assert.match(mdc, /alwaysApply: true/);
    assert.doesNotMatch(mdc, /no-blind-coding:start/); // owned, no markers
  });

  it("does not write when dryRun is set", () => {
    const results = generate(dest, { dryRun: true });
    assert.ok(results.every((r) => r.action === "created"));
    assert.equal(existsSync(join(dest, "CLAUDE.md")), false);
  });

  it("filters with only and rejects unknown targets", () => {
    const results = generate(dest, { only: ["zed"] });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.file, ".rules");
    assert.throws(() => resolveTargets(["nope"]), /Unknown target/);
  });

  it("every target id is unique", () => {
    assert.equal(new Set(TARGETS.map((t) => t.id)).size, TARGETS.length);
  });
});
