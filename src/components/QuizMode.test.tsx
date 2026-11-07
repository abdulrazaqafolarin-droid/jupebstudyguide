import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizMode, type QuizResult } from "./QuizMode";
import type { Question } from "@/types/question";

const question: Question = {
  id: "PHY-2024-001",
  subject: "physics",
  year: 2024,
  type: "mcq",
  topic: "Motion",
  question: "Which option is correct?",
  options: [
    { label: "A", text: "Option A" },
    { label: "B", text: "Option B" },
  ],
  correctAnswer: "B",
  explanation: "Option B is correct.",
};

describe("QuizMode submitted-answer payload", () => {
  it("includes the actual selected option in quiz completion results", () => {
    const onComplete = vi.fn<(result: QuizResult) => void>();

    render(
      <QuizMode
        questions={[question]}
        onComplete={onComplete}
        onExit={vi.fn()}
        subject="physics"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "No timer" }));
    fireEvent.click(screen.getByRole("button", { name: /Option B/ }));
    fireEvent.click(screen.getByRole("button", { name: "See Results" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].answeredQuestions).toEqual([
      expect.objectContaining({
        questionId: "PHY-2024-001",
        answer: "B",
        isCorrect: true,
        isGradable: true,
      }),
    ]);
  });
});
