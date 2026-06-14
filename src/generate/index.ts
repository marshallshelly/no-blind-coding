/**
 * Generates per-editor rules files from a single source of truth (the mentor
 * persona). MCP `instructions` aren't honored equally across hosts, so each
 * editor also gets its own rules file in the convention it actually reads.
 *
 * Shared files (CLAUDE.md, AGENTS.md, …) are updated in place between markers
 * so an existing file's other content is preserved. Files we own outright
 * (Cursor's .mdc) are written whole.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SERVER_INSTRUCTIONS } from "../engine/persona.js";

export type TargetFormat = "section" | "mdc";

export interface Target {
  id: string;
  label: string;
  /** Path relative to the destination project root. */
  file: string;
  format: TargetFormat;
}

/** Editors and the rules file each one reads. */
export const TARGETS: readonly Target[] = [
  { id: "claude-code", label: "Claude Code", file: "CLAUDE.md", format: "section" },
  { id: "cursor", label: "Cursor", file: ".cursor/rules/no-blind-coding.mdc", format: "mdc" },
  { id: "copilot", label: "VS Code (Copilot)", file: ".github/copilot-instructions.md", format: "section" },
  { id: "zed", label: "Zed", file: ".rules", format: "section" },
  { id: "codex", label: "Codex", file: "AGENTS.md", format: "section" },
  { id: "antigravity", label: "Antigravity", file: "AGENTS.md", format: "section" },
];

const MARKER_START = "<!-- no-blind-coding:start -->";
const MARKER_END = "<!-- no-blind-coding:end -->";

export type WriteAction = "created" | "updated" | "unchanged";

export interface GenerateResult {
  file: string;
  action: WriteAction;
  targets: string[];
}

export interface GenerateOptions {
  only?: string[] | undefined;
  dryRun?: boolean | undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The mentor persona as a self-contained markdown block. */
function personaBlock(): string {
  return [
    "# No-Blind-Coding — mentor mode",
    "",
    SERVER_INSTRUCTIONS,
    "",
    "This project is paired with the no-blind-coding MCP server. Drive the loop",
    "through its tools: create_plan, current_step, prepare_file,",
    "submit_for_review, approve_step, request_changes, handoff, session_status.",
  ].join("\n");
}

/** Insert or replace the marked block, leaving any surrounding content intact. */
function upsertSection(existing: string | null, block: string): string {
  const wrapped = `${MARKER_START}\n${block}\n${MARKER_END}`;
  if (existing && existing.includes(MARKER_START) && existing.includes(MARKER_END)) {
    const pattern = new RegExp(
      `${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`,
    );
    return existing.replace(pattern, wrapped);
  }
  if (existing && existing.trim()) {
    return `${existing.replace(/\s*$/, "")}\n\n${wrapped}\n`;
  }
  return `${wrapped}\n`;
}

/** A dedicated file we own — frontmatter that pins it as always-applied. */
function renderMdc(block: string): string {
  return [
    "---",
    "description: No-Blind-Coding mentor mode",
    "alwaysApply: true",
    "---",
    "",
    block,
    "",
  ].join("\n");
}

function renderFor(format: TargetFormat, existing: string | null): string {
  const block = personaBlock();
  return format === "mdc" ? renderMdc(block) : upsertSection(existing, block);
}

export function resolveTargets(only?: string[]): Target[] {
  if (!only || only.length === 0) return [...TARGETS];
  const known = new Map(TARGETS.map((t) => [t.id, t]));
  const selected: Target[] = [];
  for (const id of only) {
    const target = known.get(id);
    if (!target) {
      throw new Error(
        `Unknown target "${id}". Known targets: ${TARGETS.map((t) => t.id).join(", ")}.`,
      );
    }
    selected.push(target);
  }
  return selected;
}

export function generate(destRoot: string, options: GenerateOptions = {}): GenerateResult[] {
  const { only, dryRun = false } = options;
  const targets = resolveTargets(only);

  // Several editors share one file (Codex + Antigravity → AGENTS.md); collapse
  // them so the file is written once and credited to every editor it serves.
  const byFile = new Map<string, { target: Target; labels: string[] }>();
  for (const target of targets) {
    const entry = byFile.get(target.file);
    if (entry) {
      entry.labels.push(target.label);
    } else {
      byFile.set(target.file, { target, labels: [target.label] });
    }
  }

  const results: GenerateResult[] = [];
  for (const [file, { target, labels }] of byFile) {
    const absolute = resolve(destRoot, file);
    const existing = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
    const next = renderFor(target.format, existing);

    let action: WriteAction;
    if (existing === null) action = "created";
    else if (existing === next) action = "unchanged";
    else action = "updated";

    if (!dryRun && action !== "unchanged") {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, next, "utf8");
    }

    results.push({ file, action, targets: labels });
  }

  return results;
}
