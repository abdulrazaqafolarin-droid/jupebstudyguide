/**
 * Visibility policy shared by the JAMB learner query and the admin question
 * manager. Draft answer-key fields are stored separately and never affect
 * whether a learner may retrieve a question.
 */
export const JAMB_STUDENT_QUESTION_REVIEW_STATUS = "published" as const;

export const JAMB_ADMIN_REVIEW_QUEUE_STATUSES = [
  "needs_review",
  "approved_ungraded",
  "approved",
] as const;

export interface JambQuestionManagerVisibility {
  includeHidden: boolean;
  reviewStatuses: readonly string[];
}

/** Default to the learner-safe published-only policy unless admin opts in. */
export function getJambQuestionManagerVisibility(
  includeReviewQueue: boolean,
): JambQuestionManagerVisibility {
  if (includeReviewQueue) {
    return {
      includeHidden: true,
      reviewStatuses: JAMB_ADMIN_REVIEW_QUEUE_STATUSES,
    };
  }

  return {
    includeHidden: false,
    reviewStatuses: [JAMB_STUDENT_QUESTION_REVIEW_STATUS],
  };
}

/** Defence-in-depth predicate for any JAMB question before learner display. */
export function isJambQuestionVisibleToStudents(question: {
  hidden?: boolean | null;
  review_status?: string | null;
}): boolean {
  return question.hidden === false &&
    question.review_status === JAMB_STUDENT_QUESTION_REVIEW_STATUS;
}
