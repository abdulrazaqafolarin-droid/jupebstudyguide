import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import { filterObjectiveQuizQuestions, isObjectiveQuizQuestion } from "./quiz-question-filter";

const base: Question = {
  id: "q1",
  subject: "physics",
  year: 2025,
  type: "mcq",
  question: "What is force?",
  options: [
    { label: "A", text: "A push or pull" },
    { label: "B", text: "A colour" },
  ],
  correctAnswer: "A",
  explanation: "",
};

describe("objective quiz question filter", () => {
  it("keeps objective multiple-choice questions", () => {
    expect(isObjectiveQuizQuestion(base)).toBe(true);
    expect(filterObjectiveQuizQuestions([base])).toEqual([base]);
  });

  it("excludes theory/essay questions", () => {
    const theory = { ...base, id: "theory", type: "essay" as const };
    expect(isObjectiveQuizQuestion(theory)).toBe(false);
  });

  it("excludes questions without at least two usable options", () => {
    expect(filterObjectiveQuizQuestions([
      { ...base, id: "none", options: undefined },
      { ...base, id: "one", options: [{ label: "A", text: "Only one" }] },
      { ...base, id: "blank", options: [{ label: "", text: "A" }, { label: "B", text: "B" }] },
    ])).toEqual([]);
  });

  it("preserves image-backed objective questions", () => {
    const imageQuestion = { ...base, id: "image", imageUrl: "https://example.com/q.png" };
    expect(filterObjectiveQuizQuestions([imageQuestion])).toEqual([imageQuestion]);
  });
});
