import { describe, expect, it } from "vitest";
import {
  JAMB_SYLLABUS,
  JAMB_SYLLABUS_SUBJECTS,
  JAMB_SYLLABUS_VERIFIED,
  getJambSyllabusTopic,
  getJambSyllabusTopicCount,
} from "@/lib/jamb-syllabus";
import {
  getJambTopicState,
  setJambTopicState,
  summarizeJambSyllabusProgress,
  reconcileJambSyllabusProgress,
} from "@/lib/jamb-syllabus-progress";

describe("JAMB syllabus catalogue", () => {
  it("contains all five uploaded subject documents, including compulsory English", () => {
    expect(JAMB_SYLLABUS_SUBJECTS).toEqual([
      "use_of_english", "mathematics", "physics", "chemistry", "biology",
    ]);
    expect(JAMB_SYLLABUS.use_of_english.compulsory).toBe(true);
    expect(JAMB_SYLLABUS.math.questionBankAvailable).toBe(false);
    expect(JAMB_SYLLABUS.use_of_english.questionBankAvailable).toBe(false);
  });

  it("keeps syllabus source review separate from question-bank availability", () => {
    expect(JAMB_SYLLABUS_VERIFIED).toBe(false);
    expect(JAMB_SYLLABUS.physics.questionBankAvailable).toBe(false);
    expect(JAMB_SYLLABUS.physics.questionSourcePackAvailable).toBe(true);
    expect(JAMB_SYLLABUS.use_of_english.reviewState).toBe("needs_current_source_review");
  });

  it("uses stable unique topic identifiers across all subjects", () => {
    const ids = Object.values(JAMB_SYLLABUS).flatMap((subject) =>
      subject.sections.flatMap((section) => section.topics.map((item) => item.id)),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(getJambSyllabusTopic("physics", "phy-01-measurements")?.title).toBe("Measurements and Units");
    expect(getJambSyllabusTopic("not-a-subject", "phy-01-measurements")).toBeUndefined();
    expect(getJambSyllabusTopic("physics", "unknown-topic")).toBeUndefined();
    expect(getJambSyllabusTopicCount()).toBe(108);
  });
});

describe("JAMB topic progress", () => {
  it("defaults topics to not started and updates immutably", () => {
    const original = {};
    const started = setJambTopicState(original, "phy-01-measurements", "in_progress", 100);
    expect(getJambTopicState(original, "phy-01-measurements")).toBe("not_started");
    expect(getJambTopicState(started, "phy-01-measurements")).toBe("in_progress");
    expect(started["phy-01-measurements"].updatedAt).toBe(100);
  });

  it("summarizes unique topic IDs and calculates completion percentage", () => {
    const progress = setJambTopicState({}, "a", "completed", 1);
    const next = setJambTopicState(progress, "b", "in_progress", 2);
    expect(summarizeJambSyllabusProgress(["a", "a", "b", "c"], next)).toEqual({
      total: 3, completed: 1, inProgress: 1, notStarted: 1, percentage: 33,
    });
  });

  it("does not create a progress record for a blank topic ID", () => {
    const original = { a: { state: "completed" as const, updatedAt: 1 } };
    expect(setJambTopicState(original, "  ", "in_progress", 2)).toBe(original);
  });

  it("keeps the newest local state and queues only local rows that need upload", () => {
    const local = {
      newer: { state: "completed" as const, updatedAt: 20 },
      missing: { state: "in_progress" as const, updatedAt: 15 },
      older: { state: "not_started" as const, updatedAt: 5 },
    };
    const remote = {
      newer: { state: "in_progress" as const, updatedAt: 10 },
      missingRemote: { state: "completed" as const, updatedAt: 12 },
      older: { state: "completed" as const, updatedAt: 8 },
    };
    const result = reconcileJambSyllabusProgress(local, remote);
    expect(result.merged).toEqual({
      newer: { state: "completed", updatedAt: 20 },
      missing: { state: "in_progress", updatedAt: 15 },
      missingRemote: { state: "completed", updatedAt: 12 },
      older: { state: "completed", updatedAt: 8 },
    });
    expect(result.pendingUpserts).toEqual([
      ["newer", { state: "completed", updatedAt: 20 }],
      ["missing", { state: "in_progress", updatedAt: 15 }],
    ]);
  });

});
