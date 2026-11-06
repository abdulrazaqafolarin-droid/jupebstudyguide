import type { Question } from "@/types/question";

/** Only real multiple-choice questions belong in quiz and quick-action pools. */
export function isObjectiveQuestion(question: Pick<Question, "type" | "options">): boolean {
  return question.type === "mcq" && Array.isArray(question.options) && question.options.length >= 2;
}

export function filterObjectiveQuestions<T extends Pick<Question, "type" | "options">>(questions: T[]): T[] {
  return questions.filter(isObjectiveQuestion);
}
