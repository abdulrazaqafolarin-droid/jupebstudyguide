type OrderedStudyQuestion = {
  sortOrder?: number | null;
};

/**
 * Resolve the human-facing question number from the stored sort order.
 *
 * Historical question-bank rows use three conventions:
 * - positive one-based sort orders (including source-number gaps);
 * - zero-based sort orders;
 * - legacy rows whose sortOrder is 0 for every question.
 *
 * Do not compact explicit one-based values: a hidden source question must
 * leave its original number gap rather than renumber later questions.
 */
export function getStudyQuestionDisplayNumber<T extends OrderedStudyQuestion>(
  questions: readonly T[],
  index: number,
): number {
  const question = questions[index];
  if (!question) return index + 1;

  const orders = questions
    .map((item) => item.sortOrder)
    .filter((order): order is number => typeof order === "number");

  const allOrdersDefaultToZero =
    orders.length > 0 && orders.every((order) => order === 0);

  if (question.sortOrder == null || allOrdersDefaultToZero) {
    return index + 1;
  }

  const usesZeroBasedOrdering = orders.includes(0);
  return usesZeroBasedOrdering ? question.sortOrder + 1 : question.sortOrder;
}
