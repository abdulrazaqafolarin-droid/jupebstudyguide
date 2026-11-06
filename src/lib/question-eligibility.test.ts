import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import { filterObjectiveQuestions, isObjectiveQuestion } from "./question-eligibility";

const base = { id: "q", subject: "physics", year: 2025, question: "Q?", correctAnswer: "A", explanation: "" } as const;

describe("question eligibility for quizzes", () => {
  it("accepts objective MCQs with options", () => {
    expect(isObjectiveQuestion({ type: "mcq", options: [{ label: "A", text: "one" }, { label: "B", text: "two" }] })).toBe(true);
  });

  it.each([
    ["theory", { type: "essay" as const, options: undefined }],
    ["practical", { type: "practical" as const, options: [{ label: "A", text: "one" }, { label: "B", text: "two" }] }],
    ["malformed MCQ", { type: "mcq" as const, options: [{ label: "A", text: "one" }] }],
    ["missing options", { type: "mcq" as const, options: undefined }],
  ])("excludes %s", (_label, candidate) => {
    expect(isObjectiveQuestion(candidate)).toBe(false);
  });

  it("filters theory and practical questions without changing valid MCQs", () => {
    const questions = [
      { ...base, id: "objective", type: "mcq" as const, options: [{ label: "A", text: "one" }, { label: "B", text: "two" }] },
      { ...base, id: "theory", type: "essay" as const },
      { ...base, id: "practical", type: "practical" as const },
    ] satisfies Question[];
    expect(filterObjectiveQuestions(questions).map((question) => question.id)).toEqual(["objective"]);
  });
});
