import { describe, expect, it } from "vitest";
import {
  DEFAULT_JAMB_STUDY_PREFERENCES,
  normalizeJambStudyPreferences,
  orderJambSubjectsByPreference,
} from "./jamb-study-preferences";

describe("JAMB study preferences", () => {
  it("normalizes the subject focus, exam target and allowed daily goals", () => {
    expect(normalizeJambStudyPreferences({
      subjects: ["biology", "physics", "physics", "math", 4],
      examTarget: "early",
      dailyGoalMinutes: 60,
    })).toEqual({
      subjects: ["biology", "physics"],
      examTarget: "early",
      dailyGoalMinutes: 60,
    });
  });

  it("keeps compulsory Use of English out of optional science preferences", () => {
    expect(normalizeJambStudyPreferences({
      subjects: ["use_of_english", "physics", "biology"],
    })).toEqual({
      subjects: ["physics", "biology"],
      examTarget: "this-session",
      dailyGoalMinutes: 30,
    });
  });

  it("falls back safely for malformed preferences", () => {
    expect(normalizeJambStudyPreferences(null)).toEqual(DEFAULT_JAMB_STUDY_PREFERENCES);
    expect(normalizeJambStudyPreferences({ subjects: "physics", examTarget: "invalid", dailyGoalMinutes: 45 }))
      .toEqual(DEFAULT_JAMB_STUDY_PREFERENCES);
  });

  it("places preferred subjects first without hiding other available subjects", () => {
    expect(orderJambSubjectsByPreference(
      ["physics", "chemistry", "biology"],
      { subjects: ["biology", "physics"], examTarget: "this-session", dailyGoalMinutes: 30 },
    )).toEqual(["biology", "physics", "chemistry"]);
  });
});
