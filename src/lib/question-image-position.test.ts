import { describe, expect, it } from "vitest";
import {
  createInlineImagePosition,
  getInlineImageIndex,
  isInlineImagePosition,
  splitQuestionIntoPositionableLines,
} from "./question-image-position";

describe("question image line positioning", () => {
  it("splits ordinary question text at authored line breaks", () => {
    expect(splitQuestionIntoPositionableLines("First line\nSecond line\n\nFourth line")).toEqual([
      "First line",
      "Second line",
      "",
      "Fourth line",
    ]);
  });

  it("keeps multiline display math together as one positionable unit", () => {
    expect(splitQuestionIntoPositionableLines("Before\n$\nx + y\n= z\n$\nAfter")).toEqual([
      "Before",
      "$\nx + y\n= z\n$",
      "After",
    ]);
  });

  it("normalizes Windows line endings without splitting display math", () => {
    expect(splitQuestionIntoPositionableLines("First\r\nSecond\r\n$\r\nx = 2\r\n$\r\nLast")).toEqual([
      "First",
      "Second",
      "$\r\nx = 2\r\n$",
      "Last",
    ]);
  });

  it("clamps saved positions when question text changes", () => {
    expect(getInlineImageIndex("image-inline:8", 3)).toBe(3);
    expect(getInlineImageIndex("image-inline:2", 3)).toBe(2);
    expect(getInlineImageIndex("image-above", 3)).toBe(0);
    expect(getInlineImageIndex("image-inline:4", 0)).toBe(0);
  });

  it("creates stable non-negative inline position values", () => {
    expect(createInlineImagePosition(3)).toBe("image-inline:3");
    expect(createInlineImagePosition(-2)).toBe("image-inline:0");
    expect(createInlineImagePosition(Number.NaN)).toBe("image-inline:0");
  });

  it("recognizes inline layouts without changing legacy layouts", () => {
    expect(isInlineImagePosition("image-inline:2")).toBe(true);
    expect(isInlineImagePosition("image-inline")).toBe(true);
    expect(isInlineImagePosition("image-above")).toBe(false);
    expect(isInlineImagePosition("image-beside")).toBe(false);
  });
});
