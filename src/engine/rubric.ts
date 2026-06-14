/**
 * Framing for code review. The engine doesn't judge the code — it hands the
 * host LLM a consistent rubric so every evaluation is specific, kind, and
 * oriented toward the developer's growth rather than just correctness.
 */

import type { Step } from "./types.js";

export function buildReviewRubric(step: Step, content: string): string {
  const previous = step.reviewNotes.length
    ? `\nPrevious feedback on this step (the developer has now revised):\n- ${step.reviewNotes.join(
        "\n- ",
      )}\n`
    : "";

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
    `Rules for your feedback:`,
    `- Be specific and kind. Point to concrete lines.`,
    `- Do NOT rewrite their whole solution. At most, show a small corrected snippet for one issue.`,
    `- If it is correct, say so plainly and call approve_step.`,
    `- If it needs work, explain what and why (not the full answer) and call request_changes.`,
    ``,
    `--- developer's code (${step.targetFile ?? "unknown file"}), attempt ${step.attempts} ---`,
    content,
  ].join("\n");
}
