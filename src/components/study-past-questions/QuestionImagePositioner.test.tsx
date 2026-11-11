import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionImagePositioner } from "./QuestionImagePositioner";

const dispatchPointer = (
  target: Element | Window,
  type: string,
  values: Record<string, string | number>,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries(values).forEach(([key, value]) => {
    Object.defineProperty(event, key, { configurable: true, value });
  });
  target.dispatchEvent(event);
};

describe("multiple inline question image positioning", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets each image be selected and dragged to a different text line independently", () => {
    const content = "First line\nSecond line\nThird line";
    const onPositionChange = vi.fn();
    const originalRangeRect = Object.getOwnPropertyDescriptor(
      Range.prototype,
      "getBoundingClientRect",
    );

    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value(this: Range) {
        const prefix = this.startContainer.textContent?.slice(0, this.startOffset) || "";
        const visualLine = (prefix.match(/\n/g) || []).length;
        return { top: visualLine * 40, height: 12 } as DOMRect;
      },
    });

    vi.useFakeTimers();

    try {
      const { container } = render(
        <QuestionImagePositioner
          content={content}
          images={[
            { id: "image-one", url: "https://example.test/one.png" },
            { id: "image-two", url: "https://example.test/two.png" },
          ]}
          imagePosition={"image-inline:0," + content.indexOf("Third")}
          onPositionChange={onPositionChange}
        />,
      );

      const dragHandles = screen.getAllByTestId("draggable-question-image");
      expect(dragHandles).toHaveLength(2);
      expect(dragHandles[0]).toHaveAttribute("aria-pressed", "true");
      expect(dragHandles[1]).toHaveAttribute("aria-pressed", "false");

      const selectSecond = screen.getByRole("button", { name: "Select image 2 to position" });
      selectSecond.click();
      expect(selectSecond).toHaveAttribute("aria-pressed", "true");
      expect(dragHandles[1]).toHaveAttribute("aria-pressed", "true");
      expect(dragHandles[0]).toHaveAttribute("aria-pressed", "false");

      const slots = [...container.querySelectorAll<HTMLButtonElement>("[data-image-drop-slot]")];
      expect(slots.length).toBeGreaterThanOrEqual(4);
      slots.forEach((slot, index) => {
        Object.defineProperty(slot, "getBoundingClientRect", {
          configurable: true,
          value: () => ({
            top: index * 40,
            bottom: index * 40 + 20,
            left: 0,
            right: 200,
            width: 200,
            height: 20,
            x: 0,
            y: index * 40,
            toJSON: () => ({}),
          }) as DOMRect,
        });
      });

      // Move only Image 2 from the third line to the first line.
      act(() => {
        dispatchPointer(dragHandles[1], "pointerdown", {
          pointerId: 21,
          pointerType: "touch",
          button: 0,
          clientX: 40,
          clientY: 90,
        });
        vi.advanceTimersByTime(300);
        dispatchPointer(window, "pointermove", {
          pointerId: 21,
          pointerType: "touch",
          clientX: 40,
          clientY: 10,
        });
        dispatchPointer(window, "pointerup", {
          pointerId: 21,
          pointerType: "touch",
        });
      });

      expect(onPositionChange).toHaveBeenLastCalledWith("image-inline:0,0");

      // Then move only Image 1 to the third line; Image 2 must stay on line 1.
      act(() => {
        dispatchPointer(dragHandles[0], "pointerdown", {
          pointerId: 22,
          pointerType: "touch",
          button: 0,
          clientX: 40,
          clientY: 10,
        });
        vi.advanceTimersByTime(300);
        dispatchPointer(window, "pointermove", {
          pointerId: 22,
          pointerType: "touch",
          clientX: 40,
          clientY: 90,
        });
        dispatchPointer(window, "pointerup", {
          pointerId: 22,
          pointerType: "touch",
        });
      });

      expect(onPositionChange).toHaveBeenLastCalledWith(
        "image-inline:" + content.indexOf("Third") + ",0",
      );
    } finally {
      if (originalRangeRect) {
        Object.defineProperty(Range.prototype, "getBoundingClientRect", originalRangeRect);
      } else {
        delete (Range.prototype as Range & { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect;
      }
    }
  });
  it("stacks images dropped on the same text line without obscuring either image", () => {
    const content = "First line\nSecond line";
    const { container } = render(
      <QuestionImagePositioner
        content={content}
        images={[
          { id: "same-line-one", url: "https://example.test/one.png" },
          { id: "same-line-two", url: "https://example.test/two.png" },
        ]}
        imagePosition="image-inline:0,0"
        onPositionChange={() => {}}
      />,
    );

    const firstLineGroup = [...container.querySelectorAll<HTMLElement>("[data-testid=inline-image-placement-group]")]
      .find((group) => group.dataset.imagePlacementOffset === "0");
    expect(firstLineGroup).toBeTruthy();
    expect(firstLineGroup).toHaveClass("flex-col");
    expect(firstLineGroup?.querySelectorAll("[data-testid=draggable-question-image]")).toHaveLength(2);
    expect(firstLineGroup?.querySelectorAll("img")).toHaveLength(2);
  });
});
