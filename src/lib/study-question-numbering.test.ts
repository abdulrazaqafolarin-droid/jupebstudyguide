import { describe, expect, it } from "vitest";
import { getStudyQuestionDisplayNumber } from "./study-question-numbering";

describe("getStudyQuestionDisplayNumber", () => {
  it("preserves one-based source numbering and gaps left by withheld questions", () => {
    const questions = [{ sortOrder: 1 }, { sortOrder: 3 }, { sortOrder: 6 }];

    expect(questions.map((_, index) => getStudyQuestionDisplayNumber(questions, index)))
      .toEqual([1, 3, 6]);
  });

  it("converts zero-based sort orders to human-facing question numbers", () => {
    const questions = [{ sortOrder: 0 }, { sortOrder: 2 }, { sortOrder: 4 }];

    expect(questions.map((_, index) => getStudyQuestionDisplayNumber(questions, index)))
      .toEqual([1, 3, 5]);
  });

  it("uses the array position when legacy rows all have the default zero order", () => {
    const questions: Array<{ sortOrder?: number | null }> = [{ sortOrder: 0 }, { sortOrder: 0 }, {}];

    expect(questions.map((_, index) => getStudyQuestionDisplayNumber(questions, index)))
      .toEqual([1, 2, 3]);
  });

  it("falls back to the array position when an order is missing", () => {
    const questions: Array<{ sortOrder?: number }> = [{ sortOrder: 1 }, {}, { sortOrder: 3 }];

    expect(questions.map((_, index) => getStudyQuestionDisplayNumber(questions, index)))
      .toEqual([1, 2, 3]);
  });

  it("handles an out-of-range index safely", () => {
    expect(getStudyQuestionDisplayNumber([{ sortOrder: 1 }], 4)).toBe(5);
  });
});
