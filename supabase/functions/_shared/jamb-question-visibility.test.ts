import {
  getJambQuestionManagerVisibility,
  isJambQuestionVisibleToStudents,
  JAMB_STUDENT_QUESTION_REVIEW_STATUS,
} from "./jamb-question-visibility.ts";

Deno.test("JAMB question manager defaults to the published-only learner policy", () => {
  const policy = getJambQuestionManagerVisibility(false);
  if (policy.includeHidden !== false ||
      policy.reviewStatuses.length !== 1 ||
      policy.reviewStatuses[0] !== JAMB_STUDENT_QUESTION_REVIEW_STATUS) {
    throw new Error("The default JAMB question list must remain published-only and exclude hidden rows.");
  }
});

Deno.test("JAMB admin review queue includes hidden review candidates without changing learner visibility", () => {
  const policy = getJambQuestionManagerVisibility(true);
  const expected = ["needs_review", "approved_ungraded", "approved"];
  if (policy.includeHidden !== true ||
      expected.some((status) => !policy.reviewStatuses.includes(status)) ||
      policy.reviewStatuses.includes(JAMB_STUDENT_QUESTION_REVIEW_STATUS)) {
    throw new Error("The admin queue must include review candidates but must not treat them as published.");
  }
});

Deno.test("JAMB learners cannot see pending, hidden, rejected, or ungraded questions", () => {
  const cases = [
    { hidden: true, review_status: "needs_review" },
    { hidden: false, review_status: "needs_review" },
    { hidden: true, review_status: "published" },
    { hidden: false, review_status: "approved_ungraded" },
    { hidden: false, review_status: "rejected" },
    { hidden: null, review_status: "published" },
    { hidden: false, review_status: null },
  ];

  for (const question of cases) {
    if (isJambQuestionVisibleToStudents(question)) {
      throw new Error("An unapproved or hidden JAMB question passed learner visibility.");
    }
  }

  if (!isJambQuestionVisibleToStudents({ hidden: false, review_status: "published" })) {
    throw new Error("A visible published JAMB question should pass learner visibility.");
  }
});
