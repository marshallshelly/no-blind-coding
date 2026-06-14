/**
 * The No-Blind-Coding engine.
 *
 * Model-free orchestration of a learning session: it builds and persists a
 * plan, advances a state machine one step at a time, gates progression on the
 * developer's own code passing review, and records handoffs. Every method
 * loads from disk, mutates, and saves — so calls are independent and safe to
 * drive from stateless MCP tool invocations.
 */

import { existsSync, readFileSync } from "node:fs";
import { projectRoot, loadSession, resolveInRoot, saveSession } from "./store.js";
import { buildReviewRubric } from "./rubric.js";
import type { Section, Session, Step } from "./types.js";

export interface StepInput {
  title: string;
  instruction: string;
  section?: Section | undefined;
  targetFile?: string | undefined;
}

export interface PlanResult {
  goal: string;
  total: number;
  current: Step;
}

export interface PrepareResult {
  exists: boolean;
  absolutePath: string;
  action: string;
  step: Step;
}

export interface ReviewRequest {
  step: Step;
  content: string;
  rubric: string;
}

export interface AdvanceResult {
  completed: Step;
  next: Step | null;
  done: boolean;
}

export interface HandoffResult {
  handed: Step[];
  handoffSections: Section[];
}

export interface StatusResult {
  goal: string;
  done: number;
  total: number;
  current: Step | null;
  handoffSections: Section[];
  steps: Step[];
}

export class Engine {
  constructor(private readonly root: string = projectRoot()) {}

  private load(): Session {
    const session = loadSession(this.root);
    if (!session) {
      throw new Error(
        "No active session. Break the task into steps and call create_plan first.",
      );
    }
    return session;
  }

  private requireCurrent(session: Session): Step {
    const step = session.steps.find((s) => s.id === session.currentStepId);
    if (!step) {
      throw new Error("No current step — the plan may already be complete.");
    }
    return step;
  }

  private touch(session: Session): void {
    session.updatedAt = new Date().toISOString();
    saveSession(session, this.root);
  }

  /** Persist an LLM-authored plan and activate the first step. */
  createPlan(goal: string, steps: StepInput[]): PlanResult {
    if (steps.length === 0) {
      throw new Error("A plan needs at least one step.");
    }
    const now = new Date().toISOString();
    const built: Step[] = steps.map((input, i) => ({
      id: `step-${i + 1}`,
      title: input.title,
      instruction: input.instruction,
      section: input.section ?? "general",
      status: "pending",
      reviewNotes: [],
      attempts: 0,
      ...(input.targetFile !== undefined ? { targetFile: input.targetFile } : {}),
    }));
    const first = built[0]!; // guaranteed: steps.length > 0
    const session: Session = {
      version: 1,
      goal,
      createdAt: now,
      updatedAt: now,
      currentStepId: first.id,
      steps: built,
      handoffSections: [],
    };
    saveSession(session, this.root);
    return { goal, total: built.length, current: first };
  }

  currentStep(): Step | null {
    const session = this.load();
    return session.steps.find((s) => s.id === session.currentStepId) ?? null;
  }

  /** Check whether the step's file exists and mark the step awaiting code. */
  prepareFile(path: string): PrepareResult {
    const session = this.load();
    const step = this.requireCurrent(session);
    const absolutePath = resolveInRoot(path, this.root);
    const exists = existsSync(absolutePath);
    step.targetFile = path;
    step.status = "awaiting_code";
    this.touch(session);
    const action = exists
      ? `The file ${path} already exists. Tell the developer you've located it and point them to where they'll write this step.`
      : `The file ${path} does not exist yet. Ask the developer to create it, then write the logic for this step.`;
    return { exists, absolutePath, action, step };
  }

  /** Read the developer's file and produce the review rubric for the host. */
  submitForReview(path?: string): ReviewRequest {
    const session = this.load();
    const step = this.requireCurrent(session);
    const target = path ?? step.targetFile;
    if (!target) {
      throw new Error(
        "No file to review. Call prepare_file first, or pass an explicit path.",
      );
    }
    const absolutePath = resolveInRoot(target, this.root);
    if (!existsSync(absolutePath)) {
      throw new Error(
        `File not found: ${target}. Ask the developer to create and save it first.`,
      );
    }
    const content = readFileSync(absolutePath, "utf8");
    step.targetFile = target;
    step.status = "under_review";
    step.attempts += 1;
    this.touch(session);
    return { step, content, rubric: buildReviewRubric(step, content) };
  }

  /** Review passed: mark the step done and activate the next pending step. */
  approveStep(note?: string): AdvanceResult {
    const session = this.load();
    const step = this.requireCurrent(session);
    if (note) step.reviewNotes.push(`approved: ${note}`);
    step.status = "done";
    const idx = session.steps.findIndex((s) => s.id === step.id);
    const next = session.steps.slice(idx + 1).find((s) => s.status === "pending") ?? null;
    session.currentStepId = next ? next.id : null;
    this.touch(session);
    return { completed: step, next, done: next === null };
  }

  /** Review failed: record teaching feedback and return the developer to it. */
  requestChanges(notes: string): { step: Step } {
    const session = this.load();
    const step = this.requireCurrent(session);
    step.reviewNotes.push(notes);
    step.status = "awaiting_code";
    this.touch(session);
    return { step };
  }

  /** Delegate a section or step to the AI; only then may it write that code. */
  handoff(opts: { section?: Section; stepId?: string }): HandoffResult {
    const session = this.load();
    const handed: Step[] = [];

    if (opts.section) {
      if (!session.handoffSections.includes(opts.section)) {
        session.handoffSections.push(opts.section);
      }
      for (const s of session.steps) {
        if (s.section === opts.section && s.status !== "done") {
          s.status = "handed_off";
          handed.push(s);
        }
      }
    }

    const stepId = opts.stepId ?? (opts.section ? null : session.currentStepId);
    if (stepId) {
      const step = session.steps.find((s) => s.id === stepId);
      if (step && !handed.includes(step)) {
        step.status = "handed_off";
        handed.push(step);
      }
    }

    this.touch(session);
    return { handed, handoffSections: session.handoffSections };
  }

  status(): StatusResult {
    const session = this.load();
    const done = session.steps.filter((s) => s.status === "done").length;
    const current = session.steps.find((s) => s.id === session.currentStepId) ?? null;
    return {
      goal: session.goal,
      done,
      total: session.steps.length,
      current,
      handoffSections: session.handoffSections,
      steps: session.steps,
    };
  }
}
