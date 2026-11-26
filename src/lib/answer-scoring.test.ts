import { describe, expect, it } from "vitest";
import { gradeAnswer, gradeObjectiveAnswer, hasGradableAnswer, percentageScore } from "./answer-scoring";

describe("answer scoring", () => {
  it("treats missing and placeholder keys as ungradable", () => {
    expect(hasGradableAnswer(undefined)).toBe(false);
    expect(hasGradableAnswer("")).toBe(false);
    expect(hasGradableAnswer(" TBD ")).toBe(false);
    expect(hasGradableAnswer(" tBd ")).toBe(false);
    expect(gradeAnswer("A", null)).toEqual({ isGradable: false, isCorrect: false });
    expect(gradeAnswer("A", " tBd ")).toEqual({ isGradable: false, isCorrect: false });
  });

  it("compares answers after trimming and normalizing case", () => {
    expect(gradeAnswer(" b ", "B")).toEqual({ isGradable: true, isCorrect: true });
    expect(gradeAnswer("A", "B")).toEqual({ isGradable: true, isCorrect: false });
  });

  it("does not count a blank answer as correct", () => {
    expect(gradeAnswer("", "C")).toEqual({ isGradable: true, isCorrect: false });
  });

  it("grades objective answers only when the key matches a listed option", () => {
    const options = [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }];

    expect(gradeObjectiveAnswer("c", "C", options)).toEqual({
      isGradable: true,
      isCorrect: true,
    });
    expect(gradeObjectiveAnswer("A", "0.0630 min (no listed option)", options)).toEqual({
      isGradable: false,
      isCorrect: false,
    });
    expect(gradeObjectiveAnswer("A", null, options)).toEqual({
      isGradable: false,
      isCorrect: false,
    });
    expect(gradeObjectiveAnswer("A", "E", options)).toEqual({
      isGradable: false,
      isCorrect: false,
    });
    expect(gradeObjectiveAnswer("A", "A", [
      { label: "A" }, { label: "B" }, { label: "TEXT" }, { label: "D" },
    ])).toEqual({
      isGradable: false,
      isCorrect: false,
    });
    expect(gradeObjectiveAnswer("A", "A", [
      { label: "A" }, { label: "B" }, { label: "B" }, { label: "D" },
    ])).toEqual({
      isGradable: false,
      isCorrect: false,
    });
    // Original option order may vary; label identity, not display position, controls grading.
    expect(gradeObjectiveAnswer("D", "D", [
      { label: "A" }, { label: "C" }, { label: "D" }, { label: "B" },
    ])).toEqual({
      isGradable: true,
      isCorrect: true,
    });
    expect(gradeObjectiveAnswer("A", "A", undefined)).toEqual({
      isGradable: false,
      isCorrect: false,
    });
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
