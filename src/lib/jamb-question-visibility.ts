export const JAMB_STUDENT_QUESTION_VISIBILITY = {
  hidden: false,
  review_status: "published",
} as const;

export function isJambQuestionVisibleToStudents(question: {
  hidden?: boolean | null;
  review_status?: string | null;
}): boolean {
  return question.hidden === JAMB_STUDENT_QUESTION_VISIBILITY.hidden &&
    question.review_status === JAMB_STUDENT_QUESTION_VISIBILITY.review_status;
}
