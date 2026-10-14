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

export function percentageScore(
  results: Array<{ isGradable?: boolean; isCorrect: boolean }>,
): number | null {
  const gradable = results.filter((result) => result.isGradable !== false);
  if (gradable.length === 0) return null;
  return Math.round(
    (gradable.filter((result) => result.isCorrect).length / gradable.length) * 100,
  );
}
