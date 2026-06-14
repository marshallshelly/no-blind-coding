/**
 * Domain types for the No-Blind-Coding engine.
 *
 * The engine is deliberately model-free: it owns the methodology and the
 * persisted state of a learning session, never the reasoning. The host LLM
 * (Claude Code, Cursor, Zed, …) supplies the intelligence through tool calls.
 */

export type Section = "frontend" | "backend" | "general";

/**
 * Lifecycle of a single step.
 *  pending      → not started
 *  awaiting_code → file is ready, developer is writing the logic
 *  under_review → developer submitted, host is evaluating
 *  done         → review passed, moved on
 *  handed_off   → developer delegated this step to the AI to implement
 */
export type StepStatus =
  | "pending"
  | "awaiting_code"
  | "under_review"
  | "done"
  | "handed_off";

export interface Step {
  id: string;
  title: string;
  /** Plain-English description of the one piece of logic to write. No code. */
  instruction: string;
  section: Section;
  targetFile?: string;
  status: StepStatus;
  /** Accumulated review feedback, so the curriculum has memory. */
  reviewNotes: string[];
  /** How many times the developer has submitted this step for review. */
  attempts: number;
}

export interface Session {
  version: 1;
  goal: string;
  createdAt: string;
  updatedAt: string;
  currentStepId: string | null;
  steps: Step[];
  /** Sections the developer has blanket-delegated to the AI. */
  handoffSections: Section[];
}
