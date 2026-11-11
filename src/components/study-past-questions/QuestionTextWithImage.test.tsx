import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionTextWithImage } from "./QuestionTextWithImage";

describe("student inline question images", () => {
  it("renders each saved image anchor independently after loading the question", () => {
    const content = "Opening line\nThe diagram belongs here\nFinal line";
    const secondAnchor = content.indexOf("Final");

    render(
      <QuestionTextWithImage
        content={content}
        images={[
          { id: "first", src: "/first.png", alt: "First saved diagram" },
          { id: "second", src: "/second.png", alt: "Second saved diagram" },
        ]}
        imagePosition={"image-inline:0," + secondAnchor}
      />,
    );

    const groups = screen.getAllByTestId("inline-question-image-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute("data-image-position", "0");
    expect(groups[1]).toHaveAttribute("data-image-position", String(secondAnchor));
    expect(screen.getByAltText("First saved diagram")).toBeInTheDocument();
    expect(screen.getByAltText("Second saved diagram")).toBeInTheDocument();
  });

  it("stacks images that share an anchor so neither one covers the other", () => {
    render(
      <QuestionTextWithImage
        content="Question text"
        images={[
          { id: "first", src: "/first.png" },
          { id: "second", src: "/second.png" },
        ]}
        imagePosition="image-inline:0,0"
      />,
    );

    const group = screen.getByTestId("inline-question-image-group");
    expect(group).toHaveClass("flex-col");
    expect(group.querySelectorAll("[data-testid=inline-question-image-item]")).toHaveLength(2);
    expect(group.querySelectorAll("img")).toHaveLength(2);
    expect(group.querySelector("figure")).toHaveClass("w-full");
  });
});
