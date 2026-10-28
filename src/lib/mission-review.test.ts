import { describe, it, expect } from "vitest";
import { buildMissionReview } from "@/lib/mission-review";
import type { DailyMissionRecord, DailyMissionAnswer, DailyMissionAttempt } from "@/lib/daily-mission-engine";
import type { Question } from "@/types/question";

const makeQuestion = (id: string, correctAnswer = "B"): Question => ({
  id,
  subject: "physics",
  year: 2019,
  type: "mcq",
  question: `Question ${id}`,
  options: [
    { label: "A", text: `Option A of ${id}` },
    { label: "B", text: `Option B of ${id}` },
    { label: "C", text: `Option C of ${id}` },
  ],
  correctAnswer,
  explanation: `Explanation for ${id}`,
});

const answer = (questionId: string, selectedAnswer: string, isCorrect: boolean): DailyMissionAnswer =>
  ({ questionId, selectedAnswer, isCorrect });

const attempt = (questionIds: string[], answers: DailyMissionAnswer[], accuracy: number): DailyMissionAttempt => ({
  questionIds,
  answers,
  accuracy,
  completedAt: "2026-10-20T10:00:00.000Z",
});

const makeMission = (overrides: Partial<DailyMissionRecord> = {}): DailyMissionRecord => ({
  id: "mission-1",
  localDate: "2026-10-20",
  sessionId: "session-1",
  syllabusDay: 3,
  subject: "physics",
  topicId: "phy-dynamics",
  topicName: "Dynamics",
  lessonTitle: "Newton's laws",
  lessonText: "Lesson body",
  stage: "completed",
  attemptNumber: 2,
  currentQuestionIds: ["q1", "q2"],
  currentAnswers: [answer("q1", "A", false)],
  attempts: [],
  bestAccuracy: null,
  mistakeQuestionIds: [],
  difficulty: "medium",
  createdAt: "2026-10-20T08:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
  ...overrides,
});

describe("buildMissionReview", () => {
  it("uses the best attempt's question set and answers", () => {
    const mission = makeMission({
      attempts: [
        attempt(["q1"], [answer("q1", "A", false)], 0),
        attempt(["q2", "q3"], [answer("q2", "B", true), answer("q3", "A", false)], 50),
      ],
      bestAccuracy: 50,
      // Recovery/current set differs from the scored attempt on purpose.
      currentQuestionIds: ["q1"],
      currentAnswers: [answer("q1", "A", false)],
    });
    const questions = [makeQuestion("q1"), makeQuestion("q2"), makeQuestion("q3")];

    const review = buildMissionReview(mission, questions);

    expect(review.source).toBe("best-attempt");
    expect(review.attemptNumber).toBe(2);
    expect(review.accuracy).toBe(50);
    expect(review.items.map((item) => item.question.id)).toEqual(["q2", "q3"]);
    expect(review.items[0].isCorrect).toBe(true);
    expect(review.items[1].selectedAnswer).toBe("A");
    expect(review.items[1].isCorrect).toBe(false);
  });

  it("falls back to the saved set when nothing was ever submitted", () => {
    const mission = makeMission({
      stage: "quiz",
      currentQuestionIds: ["q1", "q2"],
      currentAnswers: [answer("q1", "B", false)],
    });
    const questions = [makeQuestion("q1"), makeQuestion("q2")];

    const review = buildMissionReview(mission, questions);

    expect(review.source).toBe("saved");
    expect(review.attemptNumber).toBeNull();
    expect(review.accuracy).toBeNull();
    expect(review.items).toHaveLength(2);
  });

  it("marks unanswered questions as unanswered and incorrect", () => {
    const mission = makeMission({ currentQuestionIds: ["q1"], currentAnswers: [] });
    const review = buildMissionReview(mission, [makeQuestion("q1")]);

    expect(review.items[0].selectedAnswer).toBeNull();
    expect(review.items[0].isCorrect).toBe(false);
  });

  it("derives correctness from correctAnswer when the stored flag is false", () => {
    const mission = makeMission({
      currentQuestionIds: ["q1"],
      currentAnswers: [answer("q1", "b", false)], // lower-case, engine flag not yet graded
    });
    const review = buildMissionReview(mission, [makeQuestion("q1", "B")]);

    expect(review.items[0].isCorrect).toBe(true);
  });

  it("counts questions missing from the bank without failing the review", () => {
    const mission = makeMission({
      currentQuestionIds: ["q1", "gone-1", "gone-2"],
      currentAnswers: [],
    });
    const review = buildMissionReview(mission, [makeQuestion("q1")]);

    expect(review.items).toHaveLength(1);
    expect(review.missingCount).toBe(2);
  });

  it("keeps the first attempt when accuracies tie", () => {
    const mission = makeMission({
      attempts: [
        attempt(["q1"], [answer("q1", "A", false)], 50),
        attempt(["q2"], [answer("q2", "B", true)], 50),
      ],
    });
    const review = buildMissionReview(mission, [makeQuestion("q1"), makeQuestion("q2")]);

    expect(review.attemptNumber).toBe(1);
    expect(review.items.map((item) => item.question.id)).toEqual(["q1"]);
  });

  it("never trusts an empty stored selection as an answer", () => {
    const mission = makeMission({
      currentQuestionIds: ["q1"],
      currentAnswers: [answer("q1", "   ", false)],
    });
    const review = buildMissionReview(mission, [makeQuestion("q1")]);

    expect(review.items[0].selectedAnswer).toBeNull();
    expect(review.items[0].isCorrect).toBe(false);
  });
});
