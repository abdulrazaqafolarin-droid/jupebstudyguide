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
  if (!hasGradableAnswer(correctAnswer) || !options?.length) return false;
  const expected = correctAnswer!.trim().toUpperCase();
  return options.some((option) =>
    typeof option?.label === "string" && option.label.trim().toUpperCase() === expected
  );
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
