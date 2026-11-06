import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MissionReview } from "./MissionReview";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";
import type { Question } from "@/types/question";

vi.mock("@/components/QuestionMath", () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const question: Question = {
  id: "question-1",
  subject: "physics",
  year: 2020,
  type: "mcq",
  question: "What does the diagram show?",
  options: [{ label: "A", text: "Series" }, { label: "B", text: "Parallel" }],
  correctAnswer: "B",
  explanation: "Both branches share the same nodes.",
  imageUrl: "https://cdn.example.org/questions/circuit.png",
};

const mission: DailyMissionRecord = {
  id: "mission-1",
  localDate: "2026-11-06",
  sessionId: "session-1",
  syllabusDay: 1,
  subject: "physics",
  topicId: "phy-current",
  topicName: "Electric circuits",
  lessonTitle: "Circuit basics",
  lessonText: "A short lesson.",
  stage: "completed",
  attemptNumber: 1,
  currentQuestionIds: [question.id],
  currentAnswers: [{ questionId: question.id, selectedAnswer: "A", isCorrect: false }],
  attempts: [{
    questionIds: [question.id],
    answers: [{ questionId: question.id, selectedAnswer: "A", isCorrect: false }],
    accuracy: 0,
    completedAt: "2026-11-06T10:00:00.000Z",
  }],
  bestAccuracy: 0,
  mistakeQuestionIds: [question.id],
  difficulty: "medium",
  createdAt: "2026-11-06T09:00:00.000Z",
  updatedAt: "2026-11-06T10:00:00.000Z",
};

describe("MissionReview question images", () => {
  it("shows question illustrations in the saved mission review", () => {
    render(<MissionReview mission={mission} questions={[question]} onBack={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Illustration for question 1" }))
      .toHaveAttribute("src", question.imageUrl);
  });
});
