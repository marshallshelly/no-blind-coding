import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Engine } from "../src/engine/index.js";
import type { StepInput } from "../src/engine/index.js";

let root: string;
let engine: Engine;

const plan: StepInput[] = [
  { title: "Validate email", instruction: "Write isValidEmail(s)", section: "backend", targetFile: "auth.js" },
  { title: "Login form", instruction: "Build the form markup", section: "frontend", targetFile: "login.html" },
];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "nbc-engine-"));
  engine = new Engine(root);
});

afterEach(() => {
  // temp dirs are disposable; left for the OS to reap
});

describe("Engine", () => {
  it("throws before a plan exists", () => {
    assert.throws(() => engine.currentStep(), /No active session/);
    assert.throws(() => engine.status(), /No active session/);
  });

  it("creates a plan and activates the first step", () => {
    const result = engine.createPlan("Add login", plan);
    assert.equal(result.total, 2);
    assert.equal(result.current.title, "Validate email");
    assert.equal(result.current.status, "pending");
    assert.equal(engine.currentStep()?.id, "step-1");
  });

  it("rejects an empty plan", () => {
    assert.throws(() => engine.createPlan("Nothing", []), /at least one step/);
  });

  it("reports whether the step file exists and marks it awaiting code", () => {
    engine.createPlan("Add login", plan);
    const missing = engine.prepareFile("auth.js");
    assert.equal(missing.exists, false);
    assert.match(missing.action, /does not exist/);
    assert.equal(missing.step.status, "awaiting_code");
    assert.equal(missing.step.targetFile, "auth.js");

    writeFileSync(join(root, "auth.js"), "// stub\n");
    const present = engine.prepareFile("auth.js");
    assert.equal(present.exists, true);
    assert.match(present.action, /already exists/);
  });

  it("reads the file and builds a rubric on review, counting attempts", () => {
    engine.createPlan("Add login", plan);
    engine.prepareFile("auth.js");
    writeFileSync(join(root, "auth.js"), "export const isValidEmail = s => /.+@.+/.test(s);\n");

    const review = engine.submitForReview();
    assert.equal(review.step.attempts, 1);
    assert.equal(review.step.status, "under_review");
    assert.match(review.content, /isValidEmail/);
    assert.match(review.rubric, /Correctness/);
    assert.match(review.rubric, /isValidEmail/);

    engine.requestChanges("Anchor the regex.");
    writeFileSync(join(root, "auth.js"), "export const isValidEmail = s => /^.+@.+$/.test(s);\n");
    const second = engine.submitForReview();
    assert.equal(second.step.attempts, 2);
    assert.match(second.rubric, /Anchor the regex/); // prior feedback carried forward
  });

  it("errors reviewing a file that was never created", () => {
    engine.createPlan("Add login", plan);
    engine.prepareFile("auth.js");
    assert.throws(() => engine.submitForReview(), /File not found/);
  });

  it("request_changes returns the developer to the same step", () => {
    engine.createPlan("Add login", plan);
    const before = engine.currentStep();
    const { step } = engine.requestChanges("Edge case: empty string.");
    assert.equal(step.status, "awaiting_code");
    assert.deepEqual(step.reviewNotes, ["Edge case: empty string."]);
    assert.equal(engine.currentStep()?.id, before?.id); // did not advance
  });

  it("gates progression: approve marks done and advances", () => {
    engine.createPlan("Add login", plan);
    const advanced = engine.approveStep("clean");
    assert.equal(advanced.completed.id, "step-1");
    assert.equal(advanced.completed.status, "done");
    assert.equal(advanced.next?.id, "step-2");
    assert.equal(advanced.done, false);
    assert.equal(engine.currentStep()?.id, "step-2");

    const last = engine.approveStep();
    assert.equal(last.done, true);
    assert.equal(last.next, null);
    assert.equal(engine.currentStep(), null);
  });

  it("hands off a whole section", () => {
    engine.createPlan("Add login", plan);
    const result = engine.handoff({ section: "frontend" });
    assert.deepEqual(result.handoffSections, ["frontend"]);
    assert.deepEqual(result.handed.map((s) => s.title), ["Login form"]);
    const frontend = engine.status().steps.find((s) => s.section === "frontend");
    assert.equal(frontend?.status, "handed_off");
  });

  it("hands off the current step by default", () => {
    engine.createPlan("Add login", plan);
    const result = engine.handoff({});
    assert.deepEqual(result.handed.map((s) => s.id), ["step-1"]);
    assert.equal(engine.currentStep()?.status, "handed_off");
  });

  it("tracks progress counts", () => {
    engine.createPlan("Add login", plan);
    engine.approveStep();
    const status = engine.status();
    assert.equal(status.done, 1);
    assert.equal(status.total, 2);
    assert.equal(status.current?.id, "step-2");
    assert.equal(status.goal, "Add login");
  });

  it("persists across engine instances (disk is the source of truth)", () => {
    engine.createPlan("Add login", plan);
    engine.approveStep();
    const reopened = new Engine(root);
    assert.equal(reopened.currentStep()?.id, "step-2");
    assert.equal(reopened.status().done, 1);
  });

  it("reviews a diff of what the developer added when the file pre-existed", () => {
    engine.createPlan("Add login", plan);
    writeFileSync(join(root, "auth.js"), "export const a = 1;\n");
    engine.prepareFile("auth.js");
    writeFileSync(join(root, "auth.js"), "export const a = 1;\nexport const b = 2;\n");
    const review = engine.submitForReview();
    assert.ok(review.diff, "expected a diff");
    assert.match(review.diff!, /\+export const b = 2;/);
    assert.match(review.rubric, /diff vs the file before/);
  });

  it("escalates the hint in the rubric as attempts grow", () => {
    engine.createPlan("Add login", plan);
    engine.prepareFile("auth.js");
    writeFileSync(join(root, "auth.js"), "x\n");
    assert.match(engine.submitForReview().rubric, /first attempt/);
    engine.requestChanges("try again");
    assert.match(engine.submitForReview().rubric, /revised once/);
    engine.requestChanges("again");
    assert.match(engine.submitForReview().rubric, /stuck/);
  });

  it("adds steps to a running plan with unique ids", () => {
    engine.createPlan("Add login", plan);
    const result = engine.addSteps([
      { title: "Hash password", instruction: "Write the hash fn", section: "backend" },
    ]);
    assert.equal(result.added.length, 1);
    assert.equal(engine.status().total, 3);
    const ids = engine.status().steps.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("inserts steps after a given step", () => {
    engine.createPlan("Add login", plan); // step-1, step-2
    engine.addSteps([{ title: "Middle", instruction: "in between" }], { afterStepId: "step-1" });
    assert.deepEqual(engine.status().steps.map((s) => s.title), ["Validate email", "Middle", "Login form"]);
  });

  it("re-activates a completed plan when new steps are added", () => {
    engine.createPlan("Tiny", [{ title: "Only", instruction: "do it" }]);
    engine.approveStep();
    assert.equal(engine.currentStep(), null);
    const result = engine.addSteps([{ title: "More", instruction: "keep going" }]);
    assert.equal(result.current?.title, "More");
  });

  it("revises a not-done step and refuses a done one", () => {
    engine.createPlan("Add login", plan);
    const { step } = engine.reviseStep("step-1", { instruction: "rewritten" });
    assert.equal(step.instruction, "rewritten");
    engine.approveStep();
    assert.throws(() => engine.reviseStep("step-1", { title: "x" }), /completed/);
  });

  it("skips the current step and advances", () => {
    engine.createPlan("Add login", plan);
    const result = engine.skipStep(undefined, "already covered");
    assert.equal(result.skipped.status, "skipped");
    assert.equal(result.next?.id, "step-2");
    assert.equal(engine.currentStep()?.id, "step-2");
  });

  it("resets and archives the session", () => {
    engine.createPlan("Add login", plan);
    const { archived } = engine.resetSession();
    assert.ok(existsSync(archived));
    assert.throws(() => engine.currentStep(), /No active session/);
  });
});
