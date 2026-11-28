import { describe, expect, it, vi } from "vitest";

// This module's public projection is pure; keep the Supabase network client out
// of the unit test so the privacy contract is tested without backend access.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { compareJambQuestionOrder, isJambCbtQuestionCandidate, toSafeJambQuestionPayload, type JambQuestion } from "./jamb-question-service";

describe("compareJambQuestionOrder", () => {
  const question = (
    id: string,
    year: number,
    sourceQuestionNumber: string,
    sortOrder = 0,
  ): JambQuestion => ({
    id,
    subject: "physics",
    year,
    category: "objective",
    question: "Which option is correct?",
    options: [],
    sortOrder,
    imageUrls: [],
    sourceQuestionNumber,
  });

  it("sorts by year descending and printed question number numerically", () => {
    const ordered = [
      question("q10", 2024, "10"),
      question("q2", 2024, "2"),
      question("q1-old", 2023, "1"),
      question("q1-new", 2024, "1"),
    ].sort(compareJambQuestionOrder);

    expect(ordered.map((item) => item.id)).toEqual(["q1-new", "q2", "q10", "q1-old"]);
  });

  it("keeps repeated printed question numbers and lettered variants adjacent", () => {
    const ordered = [
      question("q29b", 2024, "Q29b"),
      question("q30", 2024, "30"),
      question("q29", 2024, "29"),
      question("q29a", 2024, "29a"),
    ].sort(compareJambQuestionOrder);

    expect(ordered.map((item) => item.id)).toEqual(["q29", "q29a", "q29b", "q30"]);
  });

  it("preserves explicit positive admin sort order", () => {
    const ordered = [
      question("source-q3", 2024, "3", 4),
      question("source-q9", 2024, "9", 2),
      question("legacy-q2", 2024, "2", 0),
    ].sort(compareJambQuestionOrder);

    expect(ordered.map((item) => item.id)).toEqual(["source-q9", "legacy-q2", "source-q3"]);
  });
});

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

  it("accepts five-option A-E historical questions, including Use of English", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Choose the word nearest in meaning to the underlined word.",
      options: [...options, { label: "E", text: "Fifth" }],
    })).toBe(true);
  });

  it("accepts the JSON string representation of five-option questions", () => {
    expect(isJambCbtQuestionCandidate({
      question: "Choose the word nearest in meaning to the underlined word.",
      options: JSON.stringify([...options, { label: "E", text: "Fifth" }]),
    })).toBe(true);
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
