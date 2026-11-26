import { describe, expect, it } from "vitest";
import {
  isJambQuestionVisibleToStudents,
  JAMB_STUDENT_QUESTION_VISIBILITY,
} from "./jamb-question-visibility";

describe("JAMB learner question visibility", () => {
  it("uses hidden=false and published as the only learner visibility state", () => {
    expect(JAMB_STUDENT_QUESTION_VISIBILITY).toEqual({
      hidden: false,
      review_status: "published",
    });
  });

  it("allows only non-hidden published questions", () => {
    expect(isJambQuestionVisibleToStudents({
      hidden: false,
      review_status: "published",
    })).toBe(true);
  });

  it.each([
    { hidden: true, review_status: "needs_review" },
    { hidden: false, review_status: "needs_review" },
    { hidden: true, review_status: "published" },
    { hidden: false, review_status: "approved_ungraded" },
    { hidden: false, review_status: "rejected" },
    { hidden: null, review_status: "published" },
    { hidden: false, review_status: null },
    {},
  ])("rejects non-published or hidden questions: %o", (question) => {
    expect(isJambQuestionVisibleToStudents(question)).toBe(false);
  });
});
