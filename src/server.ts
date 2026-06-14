#!/usr/bin/env node
/**
 * No-Blind-Coding MCP server.
 *
 * The universal adapter: one stdio MCP server that drops into every
 * MCP-capable host (Claude Code, Claude Desktop, Cursor, VS Code, Zed, Codex,
 * Antigravity). It exposes the engine as tools and ships the mentor persona as
 * the server's `instructions`.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Engine } from "./engine/index.js";
import { SERVER_INSTRUCTIONS } from "./engine/persona.js";

const engine = new Engine();

const server = new McpServer(
  { name: "no-blind-coding", version: "0.1.0" },
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

const sectionSchema = z.enum(["frontend", "backend", "general"]);

server.registerTool(
  "create_plan",
  {
    title: "Create a learning plan",
    description:
      "Break the developer's goal into ordered, bite-size steps and persist them. You author the steps; this activates the first one. Each step's instruction is plain English describing ONE piece of logic — never code.",
    inputSchema: {
      goal: z.string().describe("The overall task the developer wants to accomplish."),
      steps: z
        .array(
          z.object({
            title: z.string().describe("Short name for the step."),
            instruction: z
              .string()
              .describe("Plain-English description of the one piece of logic to write. No code."),
            section: sectionSchema.optional(),
            targetFile: z
              .string()
              .optional()
              .describe("File this step's logic will live in, if known."),
          }),
        )
        .min(1),
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
  async ({ section, stepId }) =>
    run(() =>
      engine.handoff({
        ...(section !== undefined ? { section } : {}),
        ...(stepId !== undefined ? { stepId } : {}),
      }),
    ),
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
