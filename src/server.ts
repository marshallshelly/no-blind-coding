#!/usr/bin/env node
/**
 * No-Blind-Coding MCP server.
 *
 * The universal adapter: one stdio MCP server that drops into every
 * MCP-capable host (Claude Code, Claude Desktop, Cursor, VS Code, Zed, Codex,
 * Antigravity). It exposes the engine as tools and ships the mentor persona as
 * the server's `instructions`.
 */

import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Engine } from "./engine/index.js";
import { SERVER_INSTRUCTIONS } from "./engine/persona.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const engine = new Engine();

const server = new McpServer(
  { name: "no-blind-coding", version },
  { instructions: SERVER_INSTRUCTIONS },
);

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(payload: unknown): ToolResult {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text", text }] };
}

function fail(error: unknown): ToolResult {
  const text = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text }], isError: true };
}

/** Run an engine call and normalize success/error into a tool result. */
function run(fn: () => unknown): ToolResult {
  try {
    return ok(fn());
  } catch (error) {
    return fail(error);
  }
}

/** Drop undefined-valued keys — exactOptionalPropertyTypes wants them omitted. */
function compact<T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

const sectionSchema = z.enum(["frontend", "backend", "general"]);

const stepSchema = z.object({
  title: z.string().describe("Short name for the step."),
  instruction: z
    .string()
    .describe("Plain-English description of the one piece of logic to write. No code."),
  section: sectionSchema.optional(),
  targetFile: z.string().optional().describe("File this step's logic will live in, if known."),
});

server.registerTool(
  "create_plan",
  {
    title: "Create a learning plan",
    description:
      "Break the developer's goal into ordered, bite-size steps and persist them. You author the steps; this activates the first one. Each step's instruction is plain English describing ONE piece of logic — never code.",
    inputSchema: {
      goal: z.string().describe("The overall task the developer wants to accomplish."),
      steps: z.array(stepSchema).min(1),
    },
  },
  async ({ goal, steps }) => run(() => engine.createPlan(goal, steps)),
);

server.registerTool(
  "current_step",
  {
    title: "Get the active step",
    description: "Return the step the developer is currently on, or null if the plan is complete.",
    inputSchema: {},
  },
  async () => run(() => engine.currentStep()),
);

server.registerTool(
  "prepare_file",
  {
    title: "Prepare the step's file",
    description:
      "Check whether the file for the current step exists. Returns an instruction telling you to either point the developer to the existing file or ask them to create it.",
    inputSchema: {
      path: z.string().describe("Path to the file (absolute, or relative to the project root)."),
    },
  },
  async ({ path }) => run(() => engine.prepareFile(path)),
);

server.registerTool(
  "submit_for_review",
  {
    title: "Submit the developer's code for review",
    description:
      "Call this when the developer says they're done. Reads their file and returns its contents plus a review rubric. Evaluate against the rubric, then call approve_step or request_changes.",
    inputSchema: {
      path: z
        .string()
        .optional()
        .describe("Override the file to review. Defaults to the current step's target file."),
    },
  },
  async ({ path }) => run(() => engine.submitForReview(path)),
);

server.registerTool(
  "approve_step",
  {
    title: "Approve the step and advance",
    description:
      "The review passed. Marks the current step done and activates the next pending step. The gate: only call this after the developer's own code is correct.",
    inputSchema: {
      note: z.string().optional().describe("Optional note on why it passed."),
    },
  },
  async ({ note }) => run(() => engine.approveStep(note)),
);

server.registerTool(
  "request_changes",
  {
    title: "Request changes on the step",
    description:
      "The review did not pass. Record specific, kind, teaching feedback (not the full answer) and return the developer to the same step.",
    inputSchema: {
      notes: z.string().describe("What to fix and why — guide, don't solve."),
    },
  },
  async ({ notes }) => run(() => engine.requestChanges(notes)),
);

server.registerTool(
  "handoff",
  {
    title: "Hand a section or step to the AI",
    description:
      "The developer delegates work to you (e.g. they dislike frontend). Pass a section to delegate all its steps, and/or a stepId for a single step (defaults to the current step). Only after this may you write that code directly.",
    inputSchema: {
      section: sectionSchema.optional().describe("Delegate every step in this section."),
      stepId: z.string().optional().describe("Delegate a single step. Defaults to the current step."),
    },
  },
  async ({ section, stepId }) => run(() => engine.handoff(compact({ section, stepId }))),
);

server.registerTool(
  "add_steps",
  {
    title: "Add steps to the plan",
    description:
      "Adapt the plan as you learn more about the task. Appends steps, or inserts them after a given step. Use this instead of recreating the plan, so completed work is preserved.",
    inputSchema: {
      steps: z.array(stepSchema).min(1),
      afterStepId: z
        .string()
        .optional()
        .describe("Insert the new steps right after this step. Omit to append at the end."),
    },
  },
  async ({ steps, afterStepId }) => run(() => engine.addSteps(steps, compact({ afterStepId }))),
);

server.registerTool(
  "revise_step",
  {
    title: "Revise a step",
    description:
      "Edit a step that isn't completed yet — clarify the instruction, rename it, change its section or target file. Use when the original framing turned out to be off.",
    inputSchema: {
      stepId: z.string().describe("Id of the step to revise."),
      title: z.string().optional(),
      instruction: z.string().optional(),
      section: sectionSchema.optional(),
      targetFile: z.string().optional(),
    },
  },
  async ({ stepId, title, instruction, section, targetFile }) =>
    run(() => engine.reviseStep(stepId, compact({ title, instruction, section, targetFile }))),
);

server.registerTool(
  "skip_step",
  {
    title: "Skip a step",
    description:
      "Mark a step skipped (defaults to the current step) and advance. Use when a step turns out to be unnecessary or the developer already had it covered.",
    inputSchema: {
      stepId: z.string().optional().describe("Step to skip. Defaults to the current step."),
      reason: z.string().optional().describe("Why it's being skipped."),
    },
  },
  async ({ stepId, reason }) => run(() => engine.skipStep(stepId, reason)),
);

server.registerTool(
  "reset_session",
  {
    title: "Reset the session",
    description:
      "Archive the current plan and clear it so a new goal can start fresh. The archived plan is kept under .nbc/archive. Requires explicit confirmation.",
    inputSchema: {
      confirm: z.boolean().describe("Must be true — guards against accidental resets."),
    },
  },
  async ({ confirm }) =>
    run(() => {
      if (!confirm) throw new Error("Pass confirm: true to reset the session.");
      return engine.resetSession();
    }),
);

server.registerTool(
  "session_status",
  {
    title: "Show session progress",
    description: "Return the goal, progress count, current step, handoffs, and the full step list.",
    inputSchema: {},
  },
  async () => run(() => engine.status()),
);

const transport = new StdioServerTransport();
await server.connect(transport);
