import type { Question } from "@/types/question";

/**
 * Quick Quiz is deliberately MCQ-only. Theory and practical material remains
 * available in the full subject study flow, but must never enter scored quizzes.
 */
export function isObjectiveQuizQuestion(question: Question): boolean {
  return question.type === "mcq" &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every((option) =>
      typeof option.label === "string" &&
      option.label.trim().length > 0 &&
      typeof option.text === "string" &&
      option.text.trim().length > 0
    );
}

export function filterObjectiveQuizQuestions(questions: Question[]): Question[] {
  return questions.filter(isObjectiveQuizQuestion);
}
