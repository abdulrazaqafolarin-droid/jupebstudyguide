import { describe, expect, it } from "vitest";
import { STUDY_YEARS } from "./study-questions";

describe("STUDY_YEARS", () => {
  it("includes 2026 as the latest past-question year", () => {
    expect(STUDY_YEARS).toContain(2026);
    expect(STUDY_YEARS.at(-1)).toBe(2026);
  });

  it("contains every year from 2014 through 2026 in order", () => {
    expect(STUDY_YEARS).toEqual(
      Array.from({ length: 13 }, (_, index) => 2014 + index)
    );
  });
});
