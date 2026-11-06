import { describe, expect, it } from "vitest";
import { normalizeQuestionRefs } from "./question-references";

describe("normalizeQuestionRefs", () => {
  it("keeps valid retrieved question citations", () => {
    expect(normalizeQuestionRefs([
      { question_id: "physics-2021-007", subject: "physics", year: 2021, category: "objective", similarity: 0.92 },
    ])).toEqual([
      { question_id: "physics-2021-007", subject: "physics", year: 2021, category: "objective" },
    ]);
  });

  it("drops malformed citations and caps the rendered set", () => {
    const refs = Array.from({ length: 15 }, (_, i) => ({
      question_id: `chem-${i}`, subject: "chemistry", year: 2024, category: "theory",
    }));
    expect(normalizeQuestionRefs([null, {}, ...refs])).toHaveLength(12);
  });

  it("returns an empty array for malformed payloads", () => {
    expect(normalizeQuestionRefs(null)).toEqual([]);
    expect(normalizeQuestionRefs("not an array")).toEqual([]);
  });
});
