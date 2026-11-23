import { describe, expect, it } from "vitest";
import { JAMB_SUBJECTS, JAMB_QUESTION_BANK_SUBJECTS, JAMB_SUBJECT_INFO } from "./jamb-config";

describe("JAMB subject catalogue", () => {
  it("keeps optional science preferences separate from the complete question bank", () => {
    expect(JAMB_SUBJECTS).toEqual(["physics", "chemistry", "biology"]);
    expect(JAMB_QUESTION_BANK_SUBJECTS).toEqual([
      "physics", "chemistry", "biology", "use_of_english",
    ]);
    expect(JAMB_SUBJECT_INFO.use_of_english.label).toBe("Use of English");
  });
});
