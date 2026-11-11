import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageCropper } from "./ImageCropper";

describe("Admin free cropper", () => {
  it("offers a single rectangular Free Crop mode with all eight resize handles", () => {
    render(
      <ImageCropper
        image="data:image/jpeg;base64,ZmFrZQ=="
        fileName="question.jpg"
        onCropComplete={() => {}}
        onSkip={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText("Free Crop")).toBeInTheDocument();
    expect(screen.getByText(/Freely drag the edges and corners/)).toBeInTheDocument();
    expect(screen.queryByText(/Freehand/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Freehand/i })).not.toBeInTheDocument();

    const image = screen.getByRole("img", { name: "Original image with adjustable crop area" });
    const container = image.parentElement as HTMLDivElement;
    Object.defineProperty(container, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 600 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 400 });
    fireEvent.load(image);

    const handles = container.querySelectorAll("[data-crop-handle]");
    expect(handles).toHaveLength(8);
    expect([...handles].map((handle) => handle.getAttribute("data-crop-handle")).sort()).toEqual([
      "e", "n", "ne", "nw", "s", "se", "sw", "w",
    ]);
    expect(screen.getByRole("group", { name: "Free crop selection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resize crop nw" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resize crop se" })).toBeInTheDocument();
  });
});
