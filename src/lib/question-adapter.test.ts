import { describe, expect, it } from "vitest";
import { toQuestion } from "./question-adapter";
import type { StudyQuestion } from "@/types/study-questions";

const base = {
  id: "study-q",
  subject: "physics" as const,
  year: 2025,
  topic: "Mechanics",
  question: "What is shown?",
  difficulty: "medium" as const,
};

describe("toQuestion", () => {
  it("preserves the objective category and accompanying image", () => {
    const converted = toQuestion({
      ...base,
      category: "objective",
      options: [{ label: "A", text: "One" }, { label: "B", text: "Two" }],
      correctAnswer: "A",
      imageUrl: "https://example.com/question.png",
      imagePosition: "image-above",
    } satisfies StudyQuestion);
    expect(converted.type).toBe("mcq");
    expect(converted.imageUrl).toBe("https://example.com/question.png");
    expect(converted.imagePosition).toBe("image-above");
  });

  it("preserves theory and practical categories so quiz filters can exclude them", () => {
    const theory = toQuestion({ ...base, category: "theory", answerGuide: "A guide" } satisfies StudyQuestion);
    const practical = toQuestion({ ...base, category: "practical", title: "Lab", objective: "Test a sample", procedure: "Observe" } satisfies StudyQuestion);
    expect(theory.type).toBe("essay");
    expect(practical.type).toBe("practical");
  });
});
