import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import { QuestionPrompt } from "./QuestionPrompt";

const baseQuestion: Question = {
  id: "physics-q1",
  subject: "physics",
  year: 2024,
  type: "mcq",
  question: "A question with a diagram.",
  options: [],
  correctAnswer: "",
  explanation: "",
};

describe("QuestionPrompt", () => {
  it("renders every image from imageUrls and avoids duplicating the legacy first image", () => {
    const first = "https://example.com/first.png";
    const second = "https://example.com/second.png";
    render(
      <QuestionPrompt
        question={{ ...baseQuestion, imageUrl: first, imageUrls: [first, second] }}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Question illustration 1" })).toHaveAttribute("src", first);
    expect(screen.getByRole("img", { name: "Question illustration 2" })).toHaveAttribute("src", second);
  });

  it("falls back to the legacy imageUrl when imageUrls is absent", () => {
    const url = "https://example.com/legacy.png";
    render(<QuestionPrompt question={{ ...baseQuestion, imageUrl: url }} />);
    expect(screen.getByRole("img", { name: "Question illustration" })).toHaveAttribute("src", url);
  });

  it("places all images at their saved inline text anchors", () => {
    const first = "https://example.com/first.png";
    const second = "https://example.com/second.png";
    render(
      <QuestionPrompt
        question={{
          ...baseQuestion,
          imageUrls: [first, second],
          imagePosition: "image-inline:5,18",
        }}
      />,
    );

    const groups = screen.getAllByTestId("inline-question-image-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute("data-image-position", "5");
    expect(groups[1]).toHaveAttribute("data-image-position", "18");
    expect(screen.getAllByTestId("inline-question-image-item")).toHaveLength(2);
  });

  it("removes embedded whitespace from base64 image data URLs", () => {
    render(
      <QuestionPrompt
        question={{
          ...baseQuestion,
          imageUrl: "data:image/svg+xml;base64,PHN2\nZy8+",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Question illustration" }))
      .toHaveAttribute("src", "data:image/svg+xml;base64,PHN2Zy8+");
  });

  it("keeps remaining images at their original inline anchors when an image fails", () => {
    const first = "https://example.com/broken-first.png";
    const second = "https://example.com/second.png";
    render(
      <QuestionPrompt
        question={{
          ...baseQuestion,
          imageUrls: [first, second],
          imagePosition: "image-inline:5,18",
        }}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Question illustration 1" }));

    const groups = screen.getAllByTestId("inline-question-image-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute("data-image-position", "5");
    expect(groups[1]).toHaveAttribute("data-image-position", "18");
    expect(screen.getByRole("img", { name: "Question illustration 2" })).toHaveAttribute("src", second);
  });

  it("does not display attachments when the saved position is text-only", () => {
    render(
      <QuestionPrompt
        question={{
          ...baseQuestion,
          imageUrl: "https://example.com/hidden.png",
          imagePosition: "text-only",
        }}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A question with a diagram.")).toBeInTheDocument();
  });
});
