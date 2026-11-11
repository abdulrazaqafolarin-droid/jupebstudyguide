import { describe, expect, it } from "vitest";
import {
  createInlineImagePosition,
  getInlineImageOffset,
  getInlineImageOffsets,
  getQuestionPositionTokens,
  getSafeQuestionImageOffset,
  isInlineImagePosition,
  splitQuestionAtImageOffset,
} from "./question-image-position";

describe("question image text anchors", () => {
  it("stores a stable non-negative character offset", () => {
    expect(createInlineImagePosition(12)).toBe("image-inline:12");
    expect(createInlineImagePosition(-2)).toBe("image-inline:0");
    expect(createInlineImagePosition(Number.NaN)).toBe("image-inline:0");
    expect(createInlineImagePosition([4, 18, 32])).toBe("image-inline:4,18,32");
  });

  it("recognizes inline positions without changing legacy layouts", () => {
    expect(isInlineImagePosition("image-inline:12")).toBe(true);
    expect(isInlineImagePosition("image-inline:12,28,44")).toBe(true);
    expect(isInlineImagePosition("image-inline")).toBe(true);
    expect(isInlineImagePosition("image-above")).toBe(false);
    expect(isInlineImagePosition("image-beside")).toBe(false);
  });

  it("clamps saved anchors when a question is edited", () => {
    expect(getInlineImageOffset("image-inline:8", "short")).toBe(5);
    expect(getInlineImageOffset("image-inline:2", "short")).toBe(2);
    expect(getInlineImageOffset("image-above", "short")).toBe(0);
    expect(getInlineImageOffset("image-inline:4", "")).toBe(0);
    expect(getInlineImageOffsets("image-inline:2,8,99", "short", 3)).toEqual([2, 5, 5]);
    expect(getInlineImageOffsets("image-inline:7", "long text", 3)).toEqual([7, 9, 9]);
  });

  it("keeps anchors outside inline and display maths", () => {
    const content = "Before $x^2$ then $$y=2$$ after";
    expect(getSafeQuestionImageOffset(content, 9)).toBe(7);
    expect(getSafeQuestionImageOffset(content, 22)).toBeGreaterThan(22);
    expect(splitQuestionAtImageOffset("Before $x^2$ after", 9)).toEqual([
      "Before ",
      "$x^2$ after",
    ]);
  });

  it("keeps QuestionMath \\( ... \\) and \\[ ... \\] delimiters intact", () => {
    const inline = "Before \\(x + y\\) after";
    const display = "Before \\[x + y\\] after";
    expect(getSafeQuestionImageOffset(inline, 10)).toBe(7);
    expect(getSafeQuestionImageOffset(display, 10)).toBe(7);
  });

  it("keeps markdown emphasis spans intact", () => {
    const content = "A **bold phrase** remains";
    expect(getSafeQuestionImageOffset(content, 6)).toBe(2);
  });

  it("returns word and formula boundaries for visual line measurement", () => {
    const content = "A simple $x^2$ term **bold phrase** remains";
    const starts = getQuestionPositionTokens(content).map((token) => token.start);
    expect(starts[0]).toBe(0);
    expect(starts).toContain(content.indexOf("$x^2$"));
    expect(starts).toContain(content.indexOf("remains"));
    expect(starts).not.toContain(content.indexOf("phrase"));
  });
});
