import { describe, expect, it } from "vitest";
import { getQuestionDisplayNumber } from "./question-numbering";

describe("getQuestionDisplayNumber", () => {
  it("numbers visible questions progressively from one", () => {
    expect([0, 1, 2, 3, 49].map(getQuestionDisplayNumber)).toEqual([1, 2, 3, 4, 50]);
  });

  it("does not inherit gaps from database sort order", () => {
    const visibleQuestions = [{ sortOrder: 1 }, { sortOrder: 4 }, { sortOrder: 9 }];
    expect(visibleQuestions.map((_, index) => getQuestionDisplayNumber(index))).toEqual([1, 2, 3]);
  });
});
