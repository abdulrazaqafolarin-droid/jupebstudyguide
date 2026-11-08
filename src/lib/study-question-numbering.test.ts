import { describe, expect, it } from "vitest";
import {
  getStudyQuestionDisplayNumber,
  getStudyQuestionDisplayNumbers,
  sortStudyQuestionsByDisplayNumber,
} from "./study-question-numbering";

describe("study question numbering", () => {
  it("preserves one-based source numbering and gaps left by withheld questions", () => {
    const questions = [{ sortOrder: 1 }, { sortOrder: 3 }, { sortOrder: 6 }];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 3, 6]);
  });

  it("converts a complete zero-based sequence to human-facing numbers", () => {
    const questions = [{ sortOrder: 0 }, { sortOrder: 1 }, { sortOrder: 2 }];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 2, 3]);
  });

  it("preserves gaps in a zero-based sequence", () => {
    const questions = [{ sortOrder: 0 }, { sortOrder: 2 }, { sortOrder: 3 }];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 3, 4]);
  });

  it("uses sequential numbers when legacy rows all have the default zero order", () => {
    const questions: Array<{ sortOrder?: number | null }> = [
      { sortOrder: 0 },
      { sortOrder: 0 },
      {},
    ];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 2, 3]);
  });

  it("preserves positive source numbers in partially numbered legacy groups", () => {
    const questions = [
      { sortOrder: 0 },
      { sortOrder: 0 },
      { sortOrder: 3 },
      { sortOrder: 4 },
    ];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 2, 3, 4]);
  });

  it("avoids collisions when default-zero rows precede an explicit Q1", () => {
    const questions = [
      { id: "legacy-a", sortOrder: 0 },
      { id: "legacy-b", sortOrder: 0 },
      { id: "source-q1", sortOrder: 1 },
    ];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([2, 3, 1]);
    expect(sortStudyQuestionsByDisplayNumber(questions).map((q) => q.id))
      .toEqual(["source-q1", "legacy-a", "legacy-b"]);
  });

  it("fills missing order values without shifting explicit one-based numbers", () => {
    const questions: Array<{ sortOrder?: number | null }> = [
      { sortOrder: 1 },
      {},
      { sortOrder: 3 },
    ];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 2, 3]);
  });

  it("falls back to sequential numbering when all orders are missing", () => {
    const questions = [{}, {}, {}];

    expect(getStudyQuestionDisplayNumbers(questions)).toEqual([1, 2, 3]);
  });

  it("handles an out-of-range index safely", () => {
    expect(getStudyQuestionDisplayNumber([{ sortOrder: 1 }], 4)).toBe(5);
  });
});
