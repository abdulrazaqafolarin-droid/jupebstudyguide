import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailyMissionExperience } from "./DailyMissionExperience";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";
import type { Question } from "@/types/question";

vi.mock("@/components/MistakeExplanation", () => ({
  default: () => <div data-testid="mistake-explanation" />,
}));

vi.mock("@/components/QuestionMath", () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const question: Question = {
  id: "question-1",
  subject: "physics",
  year: 2020,
  type: "mcq",
  topic: "Electricity",
  question: "What does the diagram show?",
  options: [
    { label: "A", text: "A series circuit" },
    { label: "B", text: "A parallel circuit" },
  ],
  correctAnswer: "B",
  explanation: "The branches share the same two nodes.",
  imageUrl: "https://cdn.example.org/questions/circuit.png",
};

function makeMission(stage: DailyMissionRecord["stage"]): DailyMissionRecord {
  return {
    id: "mission-1",
    localDate: "2026-11-06",
    sessionId: "session-1",
    syllabusDay: 1,
    subject: "physics",
    topicId: "phy-current",
    topicName: "Electric circuits",
    lessonTitle: "Circuit basics",
    lessonText: "A short lesson.",
    stage,
    attemptNumber: 1,
    currentQuestionIds: [question.id],
    currentAnswers: [{ questionId: question.id, selectedAnswer: "A", isCorrect: false }],
    attempts: stage === "recovery"
      ? [{
          questionIds: [question.id],
          answers: [{ questionId: question.id, selectedAnswer: "A", isCorrect: false }],
          accuracy: 0,
          completedAt: "2026-11-06T10:00:00.000Z",
        }]
      : [],
    bestAccuracy: stage === "recovery" ? 0 : null,
    mistakeQuestionIds: [question.id],
    difficulty: "medium",
    createdAt: "2026-11-06T09:00:00.000Z",
    updatedAt: "2026-11-06T10:00:00.000Z",
  };
}

const commonProps = {
  questions: [question],
  history: [],
  onBack: vi.fn(),
  onUpdate: vi.fn(),
  onAttemptComplete: vi.fn(),
  onComplete: vi.fn(),
};

describe("DailyMissionExperience question images", () => {
  it("shows the question image while the student is answering the mission quiz", () => {
    render(
      <DailyMissionExperience
        {...commonProps}
        mission={makeMission("quiz")}
      />,
    );

    expect(screen.getByRole("img", { name: "Illustration for question 1" }))
      .toHaveAttribute("src", question.imageUrl);
  });

  it("shows the same question image beside the mistake recovery explanation", () => {
    render(
      <DailyMissionExperience
        {...commonProps}
        mission={makeMission("recovery")}
      />,
    );

    expect(screen.getByRole("img", { name: "Illustration for question 1" }))
      .toHaveAttribute("src", question.imageUrl);
    expect(screen.getByTestId("mistake-explanation")).toBeInTheDocument();
  });
});
