type OrderedStudyQuestion = {
  sortOrder?: number | null;
};

/**
 * Resolve human-facing numbers from stored sort orders.
 *
 * The question bank contains one-based source numbers, zero-based sequences,
 * all-zero legacy groups, and partially numbered groups where 0 means
 * "not assigned". Explicit positive numbers are preserved. In mixed groups,
 * missing/default rows are assigned the lowest unused positive numbers so
 * they cannot collide with a valid source number.
 */
export function getStudyQuestionDisplayNumbers<T extends OrderedStudyQuestion>(
  questions: readonly T[],
): number[] {
  const orders = questions
    .map((question) => question.sortOrder)
    .filter((order): order is number => typeof order === "number");
  const orderCounts = new Map<number, number>();

  for (const order of orders) {
    orderCounts.set(order, (orderCounts.get(order) ?? 0) + 1);
  }

  const isUniqueZeroBasedSequence =
    orders.length === questions.length &&
    orders.length > 0 &&
    orders.includes(0) &&
    new Set(orders).size === orders.length &&
    Math.min(...orders) === 0 &&
    Math.max(...orders) === orders.length - 1;

  const displayNumbers: Array<number | undefined> = new Array(questions.length);
  const usedNumbers = new Set<number>();

  if (isUniqueZeroBasedSequence) {
    questions.forEach((question, index) => {
      const order = question.sortOrder;
      if (typeof order === "number") {
        const displayNumber = order + 1;
        displayNumbers[index] = displayNumber;
        usedNumbers.add(displayNumber);
      }
    });
  } else {
    // Keep every unambiguous positive, one-based source number as an anchor.
    questions.forEach((question, index) => {
      const order = question.sortOrder;
      if (typeof order === "number" && order > 0 && orderCounts.get(order) === 1) {
        displayNumbers[index] = order;
        usedNumbers.add(order);
      }
    });
  }

  // Default-zero, missing, or ambiguous duplicate orders take the lowest
  // unused positive number. This also handles groups with mixed conventions.
  for (let index = 0; index < questions.length; index += 1) {
    if (displayNumbers[index] !== undefined) continue;

    let candidate = 1;
    while (usedNumbers.has(candidate)) candidate += 1;

    displayNumbers[index] = candidate;
    usedNumbers.add(candidate);
  }

  return displayNumbers as number[];
}

export function getStudyQuestionDisplayNumber<T extends OrderedStudyQuestion>(
  questions: readonly T[],
  index: number,
): number {
  return getStudyQuestionDisplayNumbers(questions)[index] ?? index + 1;
}

/**
 * Sorts question records by their resolved human-facing paper number.
 * Original array order breaks ties in the unlikely event of a remaining
 * equal number.
 */
export function sortStudyQuestionsByDisplayNumber<T extends OrderedStudyQuestion>(
  questions: readonly T[],
): T[] {
  const displayNumbers = getStudyQuestionDisplayNumbers(questions);

  return questions
    .map((question, index) => ({
      question,
      index,
      displayNumber: displayNumbers[index],
    }))
    .sort((a, b) => a.displayNumber - b.displayNumber || a.index - b.index)
    .map(({ question }) => question);
}
