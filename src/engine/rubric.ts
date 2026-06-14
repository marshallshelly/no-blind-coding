/**
 * Framing for code review. The engine doesn't judge the code — it hands the
 * host LLM a consistent rubric so every evaluation is specific, kind, and
 * oriented toward the developer's growth rather than just correctness.
 */

import type { Step } from "./types.js";

/** Escalate the hint based on how many times the developer has tried. */
function hintGuidance(attempts: number): string {
  if (attempts <= 1) {
    return "This is their first attempt. If it needs work, start with a gentle nudge — a question that points at the issue, not the fix.";
  }
  if (attempts === 2) {
    return "They've already revised once. Be more concrete: name the specific concept or line that's wrong and why, but still let them write the fix.";
  }
  return "They're stuck (multiple attempts). Show a small worked example of just the tricky part — never the whole solution — and explain the underlying idea.";
}

export function buildReviewRubric(step: Step, content: string, diff?: string): string {
  const previous = step.reviewNotes.length
    ? `\nPrevious feedback on this step (the developer has now revised):\n- ${step.reviewNotes.join(
        "\n- ",
      )}\n`
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
    previous,
    `Review it against, in order:`,
    `1. Correctness — does it do what the step asked? Any bugs, missed edge cases, or wrong assumptions?`,
    `2. Clarity — naming, readability, structure.`,
    `3. Idiom — does it match the conventions of the language/framework and the surrounding code?`,
    `4. Growth — name one concept the developer should understand more deeply from this step.`,
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
}
