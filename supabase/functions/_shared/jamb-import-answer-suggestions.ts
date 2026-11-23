export interface JambSourceAnswerSuggestions {
  source_answer_candidate: string | null;
  source_explanation_candidate: string | null;
}

/**
 * Preserve source-provided answer material for private administrator review.
 * These values are suggestions only and must never populate verified fields.
 */
export function extractJambSourceAnswerSuggestions(
  item: Record<string, unknown>,
): JambSourceAnswerSuggestions {
  const answer = typeof item.correct_answer === "string"
    ? item.correct_answer.trim().toUpperCase()
    : "";
  const explanation = typeof item.explanation === "string"
    ? item.explanation.trim()
    : "";

  return {
    source_answer_candidate: /^[A-E]$/.test(answer) ? answer : null,
    source_explanation_candidate: explanation || null,
  };
}
