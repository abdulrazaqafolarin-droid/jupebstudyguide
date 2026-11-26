export type JambAnswerConfidence = "unrated" | "low" | "medium" | "high";

export interface JambAnswerDraftInput {
  correctAnswer: unknown;
  explanation: unknown;
  confidenceLevel: unknown;
  confidenceNote: unknown;
  evidenceReference: unknown;
  options: unknown;
}

/** Validate an answer-only revision without changing question visibility or approval. */
export function getJambAnswerDraftError(input: JambAnswerDraftInput): string | null {
  const answer = typeof input.correctAnswer === "string"
    ? input.correctAnswer.trim().toUpperCase()
    : "";
  const explanation = typeof input.explanation === "string" ? input.explanation.trim() : "";
  const confidenceLevel = typeof input.confidenceLevel === "string"
    ? input.confidenceLevel.trim().toLowerCase()
    : "";
  const confidenceNote = typeof input.confidenceNote === "string" ? input.confidenceNote.trim() : "";
  const evidenceReference = typeof input.evidenceReference === "string"
    ? input.evidenceReference.trim()
    : "";

  if (!["A", "B", "C", "D", "E"].includes(answer)) {
    return "Choose a valid correct-answer option label.";
  }
  if (explanation.length < 12) {
    return "A meaningful explanation of at least 12 characters is required.";
  }
  if (!["low", "medium", "high"].includes(confidenceLevel)) {
    return "Choose low, medium or high confidence before saving a draft.";
  }
  if (confidenceNote.length < 12) {
    return "Explain the confidence rating in at least 12 characters.";
  }
  if (evidenceReference.length > 2000) {
    return "The evidence reference must not exceed 2,000 characters.";
  }

  let options = input.options;
  if (typeof options === "string") {
    try { options = JSON.parse(options); } catch { return "The saved option list is invalid."; }
  }
  if (!Array.isArray(options)) return "The question must contain an option list.";
  const normalized = options.flatMap((entry): Array<{ label: string; text: string }> => {
    if (!entry || typeof entry !== "object") return [];
    const option = entry as Record<string, unknown>;
    const label = typeof option.label === "string" ? option.label.trim().toUpperCase() : "";
    const text = typeof option.text === "string" ? option.text.trim() : "";
    return /^[A-E]$/.test(label) && text ? [{ label, text }] : [];
  });
  const expected = normalized.length === 4 ? "A,B,C,D" : normalized.length === 5 ? "A,B,C,D,E" : "";
  if (!expected || normalized.map((option) => option.label).join(",") !== expected) {
    return "The question must have four or five ordered, non-empty options.";
  }
  if (!normalized.some((option) => option.label === answer)) {
    return "The selected answer must match one of the saved option labels.";
  }
  return null;
}
