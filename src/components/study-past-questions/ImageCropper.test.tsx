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

  it("resizes a corner freely without locking the crop aspect ratio", () => {
    render(
      <ImageCropper
        image="data:image/jpeg;base64,ZmFrZQ=="
        fileName="question.jpg"
        onCropComplete={() => {}}
        onSkip={() => {}}
        onCancel={() => {}}
      />,
    );

    const image = screen.getByRole("img", { name: "Original image with adjustable crop area" });
    const container = image.parentElement as HTMLDivElement;
    Object.defineProperty(container, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 600 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 400 });
    fireEvent.load(image);

    const crop = screen.getByRole("group", { name: "Free crop selection" });
    const start = {
      left: Number.parseFloat(crop.getAttribute("style")?.match(/left:\\s*([\\d.]+)px/)?.[1] || "0"),
      top: Number.parseFloat(crop.getAttribute("style")?.match(/top:\\s*([\\d.]+)px/)?.[1] || "0"),
      width: Number.parseFloat(crop.getAttribute("style")?.match(/width:\\s*([\\d.]+)px/)?.[1] || "0"),
      height: Number.parseFloat(crop.getAttribute("style")?.match(/height:\\s*([\\d.]+)px/)?.[1] || "0"),
    };
    const handle = screen.getByRole("button", { name: "Resize crop nw" });

    const dispatchPointer = (target: Element | Window, type: string, values: Record<string, string | number>) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.entries(values).forEach(([key, value]) => {
        Object.defineProperty(event, key, { configurable: true, value });
      });
      target.dispatchEvent(event);
    };

    dispatchPointer(handle, "pointerdown", {
      pointerId: 7,
      pointerType: "touch",
      button: 0,
      clientX: start.left,
      clientY: start.top,
    });
    dispatchPointer(window, "pointermove", {
      pointerId: 7,
      pointerType: "touch",
      clientX: start.left + 21,
      clientY: start.top + 9,
    });
    dispatchPointer(window, "pointerup", { pointerId: 7, pointerType: "touch" });

    const updatedStyle = crop.getAttribute("style") || "";
    const read = (property: string) =>
      Number.parseFloat(updatedStyle.match(new RegExp(property + ":\\\\s*([\\\\d.]+)px"))?.[1] || "0");

    expect(read("left")).toBeCloseTo(start.left + 21);
    expect(read("top")).toBeCloseTo(start.top + 9);
    expect(read("width")).toBeCloseTo(start.width - 21);
    expect(read("height")).toBeCloseTo(start.height - 9);
    expect((start.width - read("width"))).not.toBe((start.height - read("height")));
  });

});
