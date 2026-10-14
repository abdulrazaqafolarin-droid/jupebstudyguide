import { describe, expect, it } from "vitest";
import { gradeAnswer, hasGradableAnswer, percentageScore } from "./answer-scoring";

describe("answer scoring", () => {
  it("treats missing and placeholder keys as ungradable", () => {
    expect(hasGradableAnswer(undefined)).toBe(false);
    expect(hasGradableAnswer("")).toBe(false);
    expect(hasGradableAnswer(" TBD ")).toBe(false);
    expect(gradeAnswer("A", null)).toEqual({ isGradable: false, isCorrect: false });
  });

  it("compares answers after trimming and normalizing case", () => {
    expect(gradeAnswer(" b ", "B")).toEqual({ isGradable: true, isCorrect: true });
    expect(gradeAnswer("A", "B")).toEqual({ isGradable: true, isCorrect: false });
  });

  it("does not count a blank answer as correct", () => {
    expect(gradeAnswer("", "C")).toEqual({ isGradable: true, isCorrect: false });
  });

  it("calculates the percentage from gradable questions only", () => {
    expect(
      percentageScore([
        { isGradable: true, isCorrect: true },
        { isGradable: true, isCorrect: true },
        { isGradable: true, isCorrect: false },
        { isGradable: false, isCorrect: false },
      ]),
    ).toBe(67);
  });

  it("returns null when every question is ungradable", () => {
    expect(percentageScore([{ isGradable: false, isCorrect: false }])).toBeNull();
  });
});
