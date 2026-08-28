/**
 * Framing for code review. The engine doesn't judge the code — it hands the
 * host LLM a consistent rubric so every evaluation is specific, kind, and
 * oriented toward the developer's growth rather than just correctness.
 */

import type { LearningRecord, Mission, Step } from "./types.js";

export interface RubricContext {
  mission: Mission | undefined;
  /** Live (non-superseded) learning records — the developer's current level. */
  learningRecords: LearningRecord[];
}

/** Escalate the hint based on how many times the developer has tried. */
const hintGuidance = (attempts: number): string => {
  if (attempts <= 1) {
    return "This is their first attempt. If it needs work, start with a gentle nudge — a question that points at the issue, not the fix.";
  }
  if (attempts === 2) {
    return "They've already revised once. Be more concrete: name the specific concept or line that's wrong and why, but still let them write the fix.";
  }
  return "They're stuck (multiple attempts). Show a small worked example of just the tricky part — never the whole solution — and explain the underlying idea.";
};

export const buildReviewRubric = (
  step: Step,
  content: string,
  diff?: string,
  ctx: RubricContext = { mission: undefined, learningRecords: [] },
): string => {
  const previous = step.reviewNotes.length
    ? `\nPrevious feedback on this step (the developer has now revised):\n- ${step.reviewNotes.join(
        "\n- ",
      )}\n`
    : "";

  const mission = ctx.mission
    ? `\nWhy the developer is here (is this step moving them toward it?):\n${ctx.mission.why}${
        ctx.mission.successCriteria.length
          ? `\nSuccess looks like:\n- ${ctx.mission.successCriteria.join("\n- ")}`
          : ""
      }\n`
    : "";

  const learning = ctx.learningRecords.length
    ? `\nWhat the developer has already established (calibrate difficulty to this — don't re-explain what they know, and hold them to it):\n- ${ctx.learningRecords
        .map((r) => `[${r.kind}] ${r.note}`)
        .join("\n- ")}\n`
    : "";

  const codeSection =
    diff && diff.length
      ? [
          `--- what the developer wrote for this step (diff vs the file before) ---`,
          `Lines: " " unchanged, "+" added by them, "-" removed by them. Focus your review on the + lines.`,
          ``,
          diff,
        ].join("\n")
      : [`--- developer's code (${step.targetFile ?? "unknown file"}), attempt ${step.attempts} ---`, content].join(
          "\n",
        );

  return [
    `Evaluate the developer's code for step "${step.title}".`,
    ``,
    `What this step asked for:`,
    step.instruction,
    mission,
    learning,
    previous,
    `Review it against, in order:`,
    `1. Correctness — does it do what the step asked? Any bugs, missed edge cases, or wrong assumptions?`,
    `2. Clarity — naming, readability, structure.`,
    `3. Idiom — does it match the conventions of the language/framework and the surrounding code?`,
    `4. Growth — name one concept the developer should understand more deeply from this step. Aim for storage strength, not just fluency: if it correctly builds on something they wrote earlier, say so (spacing + interleaving reinforce retention). When they clear a non-trivial concept, call record_learning so the next step is pitched to their real level.`,
    ``,
    `Apply this project's conventions and any rules/skills active in your editor (semantic HTML over divs, framework idioms, established patterns) — match how this codebase already works.`,
    `Non-negotiables — flag these even on a first pass, never "good enough": accessibility, semantic correctness, security, and trust-boundary validation.`,
    ``,
    `How much to give away: ${hintGuidance(step.attempts)}`,
    ``,
    `Rules for your feedback:`,
    `- Be specific and kind. Point to concrete lines.`,
    `- Do NOT rewrite their whole solution.`,
    `- If it is correct, say so plainly and call approve_step.`,
    `- If it needs work, explain what and why and call request_changes.`,
    ``,
    codeSection,
  ].join("\n");
};
