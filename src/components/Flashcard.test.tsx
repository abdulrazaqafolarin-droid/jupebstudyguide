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

  it("still flips theory cards when the data adapter supplies an empty options array", () => {
    const theoryWithEmptyOptions: Question = {
      ...baseQuestion,
      id: "theory-empty-options",
      options: [],
    };

    render(<Flashcard question={theoryWithEmptyOptions} onAnswer={() => {}} showControls={false} />);

    const card = document.querySelector(".flashcard");
    fireEvent.click(screen.getByLabelText("Scrollable question"));

    expect(card).toHaveClass("flipped");
    expect(screen.getByLabelText("Scrollable AI model answer")).toBeInTheDocument();
  });

  it("shows all saved images on home subject cards, including inline image anchors", () => {
    const objective: Question = {
      ...baseQuestion,
      id: "objective-with-images",
      type: "mcq",
      options: [{ label: "A", text: "Option A" }, { label: "B", text: "Option B" }],
      correctAnswer: "A",
      imageUrl: "https://example.com/first.png",
      imageUrls: ["https://example.com/first.png", "https://example.com/second.png"],
      imagePosition: "image-above",
    };

    const { rerender } = render(
      <Flashcard question={objective} onAnswer={() => {}} showControls={false} />,
    );

    expect(screen.getByRole("img", { name: "Question illustration 1" })).toHaveAttribute("src", "https://example.com/first.png");
    expect(screen.getByRole("img", { name: "Question illustration 2" })).toHaveAttribute("src", "https://example.com/second.png");

    const inlineQuestion: Question = {
      ...objective,
      id: "objective-inline-images",
      imagePosition: "image-inline:3,24",
    };
    rerender(<Flashcard question={inlineQuestion} onAnswer={() => {}} showControls={false} />);
    expect(screen.getByAltText("Question illustration 1")).toBeInTheDocument();
    expect(screen.getByAltText("Question illustration 2")).toBeInTheDocument();
    expect(screen.getAllByTestId("inline-question-image-group")).toHaveLength(2);
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
