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
  it("gives objective question text and options separate native scroll regions", () => {
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
    expect(questionPane).toHaveClass("overflow-y-auto", "touch-pan-y");
    expect(optionsPane).toHaveClass("overflow-y-auto", "touch-pan-y");
    expect(questionPane).not.toBe(optionsPane);
  });

  it("lets a tap on the theory question reveal the answer and a tap on the answer return to the question", () => {
    render(<Flashcard question={baseQuestion} onAnswer={() => {}} showControls={false} />);

    const questionPane = screen.getByLabelText("Scrollable question");
    expect(questionPane).toHaveClass("flex-1", "min-h-0");
    fireEvent.click(questionPane);

    const explanationPane = screen.getByLabelText("Scrollable written explanation");
    const aiAnswerPane = screen.getByLabelText("Scrollable AI model answer");
    expect(explanationPane).toBeInTheDocument();
    expect(aiAnswerPane).toBeInTheDocument();

    fireEvent.click(explanationPane);
    expect(screen.getByLabelText("Scrollable question")).toBeInTheDocument();
    expect(screen.getByText(/Tap the card to reveal the answer/)).toBeInTheDocument();
  });

  it("shows the written explanation and AI model answer in separate scroll cards after reveal", () => {
    render(<Flashcard question={baseQuestion} onAnswer={() => {}} showControls={false} />);

    fireEvent.click(screen.getByText(/Tap the card to reveal the answer/));

    const explanationPane = screen.getByLabelText("Scrollable written explanation");
    const aiAnswerPane = screen.getByLabelText("Scrollable AI model answer");

    expect(explanationPane).toHaveAttribute("data-flashcard-scroll-region", "written-explanation");
    expect(aiAnswerPane).toHaveAttribute("data-flashcard-scroll-region", "ai-answer");
    expect(explanationPane).toHaveClass("overflow-y-auto", "touch-pan-y");
    expect(aiAnswerPane).toHaveClass("overflow-y-auto", "touch-pan-y");
    expect(aiAnswerPane.closest("section")).toBeInTheDocument();
    expect(explanationPane).not.toBe(aiAnswerPane);
  });
});
