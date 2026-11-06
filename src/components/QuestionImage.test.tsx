import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionImage } from "./QuestionImage";

describe("QuestionImage", () => {
  it("renders an image when a question has an image URL", () => {
    render(<QuestionImage imageUrl="https://example.com/diagram.png" alt="Circuit diagram" />);
    expect(screen.getByRole("img", { name: "Circuit diagram" })).toHaveAttribute("src", "https://example.com/diagram.png");
  });

  it("omits missing or failed images without hiding the question text", () => {
    const { rerender } = render(<QuestionImage />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<QuestionImage imageUrl="https://example.com/broken.png" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
