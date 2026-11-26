import { describe, expect, it } from "vitest";
import {
  createInlineImagePosition,
  getInlineImageOffset,
  getQuestionPositionTokens,
  getSafeQuestionImageOffset,
  isInlineImagePosition,
  reorderQuestionImages,
  splitQuestionAtImageOffset,
} from "./question-image-position";

describe("question image text anchors", () => {
  it("stores a stable non-negative character offset", () => {
    expect(createInlineImagePosition(12)).toBe("image-inline:12");
    expect(createInlineImagePosition(-2)).toBe("image-inline:0");
    expect(createInlineImagePosition(Number.NaN)).toBe("image-inline:0");
  });

  it("recognizes inline positions without changing legacy layouts", () => {
    expect(isInlineImagePosition("image-inline:12")).toBe(true);
    expect(isInlineImagePosition("image-inline")).toBe(true);
    expect(isInlineImagePosition("image-above")).toBe(false);
    expect(isInlineImagePosition("image-beside")).toBe(false);
  });

  it("clamps saved anchors when a question is edited", () => {
    expect(getInlineImageOffset("image-inline:8", "short")).toBe(5);
    expect(getInlineImageOffset("image-inline:2", "short")).toBe(2);
    expect(getInlineImageOffset("image-above", "short")).toBe(0);
    expect(getInlineImageOffset("image-inline:4", "")).toBe(0);
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
  it("keeps inline anchors attached to their images when thumbnails are reordered", () => {
    const images = [{ id: "first" }, { id: "second" }, { id: "third" }];
    const content = "0123456789abcdefghijklmnopqrstuvwxyz";
    const result = reorderQuestionImages(images, "image-inline:4,18,32", content, 0, 2);

    expect(result.images.map((image) => image.id)).toEqual(["second", "third", "first"]);
    expect(result.imagePosition).toBe("image-inline:18,32,4");
    expect(getInlineImageOffsets(result.imagePosition, content, 3)).toEqual([18, 32, 4]);
    expect(images.map((image) => image.id)).toEqual(["first", "second", "third"]);
  });

  it("preserves non-inline layouts and ignores invalid thumbnail moves", () => {
    const images = [{ id: "first" }, { id: "second" }];
    expect(reorderQuestionImages(images, "image-beside", "Question", 0, 1)).toEqual({
      images: [{ id: "second" }, { id: "first" }],
      imagePosition: "image-beside",
    });
    expect(reorderQuestionImages(images, "image-inline:2,8", "Question text", 0, 8)).toEqual({
      images,
      imagePosition: "image-inline:2,8",
    });
  });

});
