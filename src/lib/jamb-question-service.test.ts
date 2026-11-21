import { describe, expect, it, vi } from "vitest";

// This module's public projection is pure; keep the Supabase network client out
// of the unit test so the privacy contract is tested without backend access.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isJambCbtQuestionCandidate, toSafeJambQuestionPayload, type JambQuestion } from "./jamb-question-service";

describe("toSafeJambQuestionPayload", () => {
  it("exposes learner-facing question content but never answer-key material", () => {
    const question = {
      id: "jamb-physics-2024-1",
      subject: "physics",
      year: 2024,
      category: "objective",
      question: "Which instrument is used to measure electric current?",
      options: [
        { label: "A", text: "Voltmeter" },
        { label: "B", text: "Ammeter" },
        { label: "C", text: "Barometer" },
        { label: "D", text: "Thermometer" },
      ],
      topic: "Measurements and units",
      sortOrder: 1,
      imageUrl: null,
      imageUrls: [],
      imagePosition: null,
      sourceReference: "Physics source · 2024 · Question 1",
      sourcePage: 1,
      sourceQuestionNumber: "1",

      // Deliberately inject fields from private/admin projections. The public
      // payload must remain an allow-list, not a spread of the source object.
      correct_answer: "B",
      correctAnswer: "B",
      explanation: "An ammeter measures electric current.",
      answer_key_verified: true,
      score: 100,
    } as unknown as JambQuestion;

    const payload = toSafeJambQuestionPayload(question);

    expect(payload).toEqual({
      id: "jamb-physics-2024-1",
      subject: "physics",
      year: 2024,
      category: "objective",
      question: "Which instrument is used to measure electric current?",
      options: [
        { label: "A", text: "Voltmeter" },
        { label: "B", text: "Ammeter" },
        { label: "C", text: "Barometer" },
        { label: "D", text: "Thermometer" },
      ],
      topic: "Measurements and units",
      imageUrl: null,
      imageUrls: [],
      imagePosition: null,
      sourceReference: "Physics source · 2024 · Question 1",
    });

    expect(payload).not.toHaveProperty("correct_answer");
    expect(payload).not.toHaveProperty("correctAnswer");
    expect(payload).not.toHaveProperty("explanation");
    expect(payload).not.toHaveProperty("answer_key_verified");
    expect(payload).not.toHaveProperty("score");
  });
});

describe("isJambCbtQuestionCandidate", () => {
  const options = [
    { label: "A", text: "First" },
    { label: "B", text: "Second" },
    { label: "C", text: "Third" },
    { label: "D", text: "Fourth" },
  ];

  it("accepts a readable four-option A-D JAMB question", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Which quantity is measured in amperes?",
      options,
    })).toBe(true);
  });

  it("accepts the JSON string representation used by stored options", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Which quantity is measured in amperes?",
      options: JSON.stringify(options),
    })).toBe(true);
  });

  it("rejects five-option historical questions", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Which quantity is measured in amperes?",
      options: [...options, { label: "E", text: "Fifth" }],
    })).toBe(false);
  });

  it("rejects malformed labels, blank options and short stems", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Which quantity is measured in amperes?",
      options: [...options.slice(0, 2), { label: "E", text: "Third" }, options[3]],
    })).toBe(false);
    expect(isJambCbtQuestionCandidate({
      question: "Which quantity is measured in amperes?",
      options: [...options.slice(0, 3), { label: "D", text: " " }],
    })).toBe(false);
    expect(isJambCbtQuestionCandidate({ question: "Short?", options })).toBe(false);
  });
});
