import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageCropper } from "./ImageCropper";

describe("Admin free cropper", () => {
  afterEach(() => vi.restoreAllMocks());

  it("offers rectangular Free Crop and Freehand modes while preserving the eight rectangle handles", () => {
    render(
      <ImageCropper
        image="data:image/jpeg;base64,ZmFrZQ=="
        fileName="question.jpg"
        onCropComplete={() => {}}
        onSkip={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Rectangle" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Freehand" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Drag inside the crop box to move it/)).toBeInTheDocument();

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
      left: Number.parseFloat(crop.style.left),
      top: Number.parseFloat(crop.style.top),
      width: Number.parseFloat(crop.style.width),
      height: Number.parseFloat(crop.style.height),
    };
    const handle = screen.getByRole("button", { name: "Resize crop nw" });

    const dispatchPointer = (target: Element | Window, type: string, values: Record<string, string | number>) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.entries(values).forEach(([key, value]) => {
        Object.defineProperty(event, key, { configurable: true, value });
      });
      target.dispatchEvent(event);
    };

    act(() => {
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
    });

    const read = (property: string) =>
      Number.parseFloat(crop.style.getPropertyValue(property) || "0");

    expect(read("left")).toBeCloseTo(start.left + 21);
    expect(read("top")).toBeCloseTo(start.top + 9);
    expect(read("width")).toBeCloseTo(start.width - 21);
    expect(read("height")).toBeCloseTo(start.height - 9);
    expect((start.width - read("width"))).not.toBe((start.height - read("height")));
  });

  it("allows tracing a freehand polygon and enables Apply Crop after three points", () => {
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => context as unknown as CanvasRenderingContext2D,
    );

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

    fireEvent.click(screen.getByRole("button", { name: "Freehand" }));
    const canvas = screen.getByTestId("freehand-crop-canvas");
    expect(screen.queryByRole("group", { name: "Free crop selection" })).not.toBeInTheDocument();

    Object.defineProperty(canvas, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
    });

    const dispatchPointer = (target: Element, type: string, values: Record<string, string | number>) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.entries(values).forEach(([key, value]) => {
        Object.defineProperty(event, key, { configurable: true, value });
      });
      target.dispatchEvent(event);
    };

    act(() => {
      dispatchPointer(canvas, "pointerdown", { pointerId: 31, pointerType: "touch", clientX: 40, clientY: 30 });
    });
    act(() => {
      dispatchPointer(canvas, "pointermove", { pointerId: 31, pointerType: "touch", clientX: 120, clientY: 40 });
    });
    act(() => {
      dispatchPointer(canvas, "pointermove", { pointerId: 31, pointerType: "touch", clientX: 90, clientY: 150 });
    });
    act(() => {
      dispatchPointer(canvas, "pointerup", { pointerId: 31, pointerType: "touch" });
    });

    expect(screen.getByRole("button", { name: "Freehand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Apply Crop" })).toBeEnabled();
  });

});