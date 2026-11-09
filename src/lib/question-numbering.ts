/** Display numbers follow the visible paper order, never database sort_order. */
export function getQuestionDisplayNumber(index: number): number {
  return index + 1;
}
