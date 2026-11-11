import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Question } from "@/types/question";
import { Flashcard } from "./Flashcard";

vi.mock("./AITutor", () => ({
  AITutor: () => null,
}));

vi.mock("@/lib/ai-service", () => ({
  streamChat: vi.fn(),
}));

const baseQuestion: Question = {
  id: "scroll-test",
  subject: "chemistry",
  year: 2025,
  type: "essay",
  topic: "Chemical equilibrium",
  question: "Explain chemical equilibrium and describe the factors that affect its position. ".repeat(12),
  correctAnswer: "",
  explanation: "A reversible reaction is at equilibrium when the forward and reverse reaction rates are equal. ".repeat(12),
};

describe("Flashcard independent scrolling", () => {
  it("keeps objective question text and answer options independently scrollable without a reserved spacer", () => {
    const objective: Question = {
      ...baseQuestion,
      id: "objective-scroll-test",
      type: "mcq",
      options: [
        { label: "A", text: "First option ".repeat(18) },
        { label: "B", text: "Second option ".repeat(18) },
        { label: "C", text: "Third option ".repeat(18) },
        { label: "D", text: "Fourth option ".repeat(18) },
      ],
      correctAnswer: "A",
    };

    render(<Flashcard question={objective} onAnswer={() => {}} showControls={false} />);

    const questionPane = screen.getByLabelText("Scrollable question");
    const optionsPane = screen.getByLabelText("Scrollable answer options");

    expect(questionPane).toHaveAttribute("data-flashcard-scroll-region", "question");
    expect(optionsPane).toHaveAttribute("data-flashcard-scroll-region", "options");
    expect(questionPane).toHaveClass("h-auto", "max-h-[min(28dvh,240px)]", "overflow-y-auto", "touch-pan-y");
    expect(optionsPane).toHaveClass("max-h-[min(32dvh,280px)]", "overflow-y-auto", "touch-pan-y");
    expect(questionPane).not.toHaveClass("flex-1", "min-h-[140px]");
    expect(optionsPane).not.toHaveClass("flex-1", "min-h-[120px]");
    expect(questionPane).not.toBe(optionsPane);
  });

  it("keeps long theory questions scrollable and restores the two-sided card flip", () => {
    render(<Flashcard question={baseQuestion} onAnswer={() => {}} showControls={false} />);

    const card = document.querySelector(".flashcard");
    const questionPane = screen.getByLabelText("Scrollable question");
    expect(questionPane).toHaveClass("h-auto", "max-h-[min(52dvh,480px)]", "overflow-y-auto", "touch-pan-y");
    expect(questionPane).not.toHaveClass("flex-1", "min-h-0");

    fireEvent.click(questionPane);
    expect(card).toHaveClass("flipped");

    const aiAnswerPane = screen.getByLabelText("Scrollable AI model answer");
    expect(aiAnswerPane).toBeInTheDocument();
    expect(screen.queryByLabelText("Scrollable written explanation")).not.toBeInTheDocument();

    fireEvent.click(aiAnswerPane);
    expect(card).not.toHaveClass("flipped");
    expect(screen.getByText(/Tap the card to reveal the answer/)).toBeInTheDocument();
  });

  it("shows only the independent AI model answer scroll card on the theory back face", () => {
    render(<Flashcard question={baseQuestion} onAnswer={() => {}} showControls={false} />);

    fireEvent.click(screen.getByText(/Tap the card to reveal the answer/));

    const aiAnswerPane = screen.getByLabelText("Scrollable AI model answer");
    expect(aiAnswerPane).toHaveAttribute("data-flashcard-scroll-region", "ai-answer");
    expect(aiAnswerPane).toHaveClass("overflow-y-auto", "touch-pan-y");
    expect(aiAnswerPane.closest("section")).toBeInTheDocument();
    expect(screen.queryByLabelText("Scrollable written explanation")).not.toBeInTheDocument();
    expect(screen.queryByText(/No written explanation is available/)).not.toBeInTheDocument();
  });
});
