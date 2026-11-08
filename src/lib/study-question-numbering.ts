type OrderedStudyQuestion = {
  sortOrder?: number | null;
};

/**
 * Resolve the human-facing question number from the stored sort order.
 *
 * Historical question-bank rows use several conventions:
 * - positive one-based source numbers (including gaps for withheld questions);
 * - zero-based sequences;
 * - legacy rows where sortOrder was left at the default value 0;
 * - partially numbered legacy groups mixing default-zero and explicit values.
 *
 * Preserve positive source numbers. Only interpret a group as zero-based when
 * its numeric orders are unique and form a zero-starting sequence. This avoids
 * shifting positive one-based paper numbers merely because another legacy row
 * in the same group has the default sortOrder of 0.
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
  const distinctOrders = new Set(orders);
  const allOrdersDefaultToZero =
    orders.length > 0 && orders.every((order) => order === 0);
  const isUniqueZeroBasedSequence =
    orders.length > 0 &&
    orders.length === distinctOrders.size &&
    distinctOrders.has(0) &&
    Math.min(...orders) === 0 &&
    Math.max(...orders) === orders.length - 1;

  if (question.sortOrder == null || allOrdersDefaultToZero) {
    return index + 1;
  }

  if (isUniqueZeroBasedSequence) {
    return question.sortOrder + 1;
  }

  // A zero in a mixed/partially numbered legacy group is a missing/default
  // order, not evidence that the positive source numbers are zero-based.
  return question.sortOrder > 0 ? question.sortOrder : index + 1;
}
