/**
 * Shared, conservative answer-key validation.
 *
 * Missing or placeholder answer keys are ungradable, never automatically correct.
 */
export function hasGradableAnswer(answer: string | null | undefined): boolean {
  const normalized = answer?.trim();
  return Boolean(normalized && normalized.toUpperCase() !== "TBD");
}

export function gradeAnswer(
  answer: string | null | undefined,
  correctAnswer: string | null | undefined,
): { isGradable: boolean; isCorrect: boolean } {
  if (!hasGradableAnswer(correctAnswer)) {
    return { isGradable: false, isCorrect: false };
  }

  const submitted = answer?.trim();
  if (!submitted) {
    return { isGradable: true, isCorrect: false };
  }

  return {
    isGradable: true,
    isCorrect: submitted.toUpperCase() === correctAnswer!.trim().toUpperCase(),
  };
}

/**
 * An objective answer key is gradable only when it points to an option that
 * actually exists on the question. This prevents placeholder text such as
 * "no listed option" from making every student's selection count as wrong.
 */
export function hasGradableObjectiveAnswer(
  correctAnswer: string | null | undefined,
  options: ReadonlyArray<{ label: string }> | null | undefined,
): boolean {
  if (!hasGradableAnswer(correctAnswer) || !options || ![4, 5].includes(options.length)) {
    return false;
  }

  const labels = options.map((option) =>
    typeof option?.label === "string" ? option.label.trim().toUpperCase() : ""
  );
  if (labels.some((label) => !/^[A-E]$/.test(label))) return false;
  if (new Set(labels).size !== labels.length) return false;

  // A four-option paper must expose A–D; a five-option paper must expose A–E.
  const expectedLabels = labels.length === 4 ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];
  if (expectedLabels.some((label) => !labels.includes(label))) return false;

  return labels.includes(correctAnswer!.trim().toUpperCase());
}

export function gradeObjectiveAnswer(
  answer: string | null | undefined,
  correctAnswer: string | null | undefined,
  options: ReadonlyArray<{ label: string }> | null | undefined,
): { isGradable: boolean; isCorrect: boolean } {
  if (!hasGradableObjectiveAnswer(correctAnswer, options)) {
    return { isGradable: false, isCorrect: false };
  }
  return gradeAnswer(answer, correctAnswer);
}

export function percentageScore(
  results: Array<{ isGradable?: boolean; isCorrect: boolean }>,
): number | null {
  const gradable = results.filter((result) => result.isGradable !== false);
  if (gradable.length === 0) return null;
  return Math.round(
    (gradable.filter((result) => result.isCorrect).length / gradable.length) * 100,
  );
}
