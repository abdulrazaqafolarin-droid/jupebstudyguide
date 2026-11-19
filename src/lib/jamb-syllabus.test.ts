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
  migrateJambLegacyTopicProgress,
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

  it("follows the current five-section JAMB IBASS Biology structure", () => {
    const biology = JAMB_SYLLABUS.biology;
    expect(biology.sections.map((section) => section.topics.length)).toEqual([3, 9, 7, 2, 2]);
    expect(biology.sections.map((section) => section.title)).toEqual([
      "A. Variety of Organisms",
      "B. Form and Functions",
      "C. Ecology",
      "D. Heredity and Variations",
      "E. Evolution",
    ]);
    const topics = biology.sections.flatMap((section) => section.topics);
    expect(topics).toHaveLength(23);
    expect(topics.some((item) => item.id === "bio-d-03-biotechnology")).toBe(false);
    const heredity = topics.find((item) => item.id === "bio-d-02-heredity");
    expect(heredity?.outline.join(" ")).toContain("Biotechnology applications");
    expect(heredity?.objectives?.join(" ")).toContain("recombinant DNA");
    expect(biology.officialSourceUrl).toBe("https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf");
  });

  it("uses the current 39-topic JAMB IBASS Physics structure", () => {
    const physics = JAMB_SYLLABUS.physics;
    const topics = physics.sections.flatMap((section) => section.topics);
    expect(topics).toHaveLength(39);
    expect(physics.officialSourceUrl).toBe("https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf");
    expect(topics[5].title).toBe("Work, Energy and Power");
    expect(topics[6].title).toBe("Friction");
    expect(topics[36].title).toBe("Conduction of Electricity Through Liquids and Gases");
    expect(topics[38].title).toBe("Introductory Electronics");
    expect(topics.some((item) => item.title === "Introduction to Fibre Optics and Lasers")).toBe(false);
    expect(topics[24].outline.join(" ")).toContain("optical fibres");
  });

  it("uses the JAMB-hosted Use of English syllabus where the supplied copy differs", () => {
    const english = JAMB_SYLLABUS.use_of_english;
    const comprehension = english.sections[0].topics[0];
    const lexis = english.sections[1].topics[0];
    const oral = english.sections[2].topics[0];

    expect(english.officialSourceUrl).toBe("https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf");
    expect(comprehension.outline).toContain("Two passages of about 200 words each, one of which is a cloze test, reflecting various disciplines.");
    expect(comprehension.outline).toContain("The prescribed reading text: The Lekki Headmaster by Kabir Alabi Garba.");
    expect(lexis.outline).toContain("Synonyms, antonyms and homonyms.");
    expect(oral.outline).toContain("Vowels: monothongs and diphthongs.");
    expect(english.examinationStructure?.join(" ")).toContain("Total: 60 Use of English questions.");
    expect(comprehension.objectives).toHaveLength(4);
    expect(english.sourceComparisonNote).toContain("separate five-question summary passage");
  });

  it("records the exact source-file checksums from the extraction manifest", () => {
    const expected: Record<string, string> = {
      physics: "62f5ac84592735cd5829296cb52da5bc8b582ee0f2227999cca73b58dcabfee5",
      chemistry: "a3c15bfee3bece0f4106a32b0091e2a2c51eaec8baa62fafa44afcad72193738",
      biology: "8afb9aa5c3bece851d6a7ec9b6ce85909aa94f1657d0d01b76d96a5d904467f5",
      math: "aff7a7c2cc46036902dda38db1d1567d10982de709305cfbfc90dc437329754f",
      use_of_english: "f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18",
    };
    for (const [subject, checksum] of Object.entries(expected)) {
      expect(JAMB_SYLLABUS[subject as keyof typeof JAMB_SYLLABUS].sourceSha256).toBe(checksum);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("maps source learning objectives to all 106 syllabus topics", () => {
    const expected = {
      physics: 39,
      chemistry: 18,
      biology: 23,
      math: 23,
      use_of_english: 3,
    } as const;
    let total = 0;
    let objectiveStatements = 0;
    for (const [subjectId, expectedCount] of Object.entries(expected)) {
      const subject = JAMB_SYLLABUS[subjectId as keyof typeof JAMB_SYLLABUS];
      const topics = subject.sections.flatMap((section) => section.topics);
      expect(topics).toHaveLength(expectedCount);
      expect(topics.every((item) => (item.objectives?.length ?? 0) > 0)).toBe(true);
      total += topics.length;
      objectiveStatements += topics.reduce((sum, item) => sum + (item.objectives?.length ?? 0), 0);
    }
    expect(total).toBe(106);
    expect(objectiveStatements).toBe(426);
  });

  it("uses stable unique topic identifiers across all subjects", () => {
    const ids = Object.values(JAMB_SYLLABUS).flatMap((subject) =>
      subject.sections.flatMap((section) => section.topics.map((item) => item.id)),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(getJambSyllabusTopic("physics", "phy-01-measurements")?.title).toBe("Measurements and Units");
    expect(getJambSyllabusTopic("not-a-subject", "phy-01-measurements")).toBeUndefined();
    expect(getJambSyllabusTopic("physics", "unknown-topic")).toBeUndefined();
    expect(getJambSyllabusTopicCount()).toBe(106);
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

  it("makes repeated local updates strictly increasing even within one millisecond", () => {
    const first = setJambTopicState({}, "a", "in_progress", 100);
    const second = setJambTopicState(first, "a", "completed", 100);
    expect(second.a.updatedAt).toBe(101);
  });

  it("does not create a progress record for a blank topic ID", () => {
    const original = { a: { state: "completed" as const, updatedAt: 1 } };
    expect(setJambTopicState(original, "  ", "in_progress", 2)).toBe(original);
  });

  it("migrates retired Biology Biotechnology progress into Heredity", () => {
    const migrated = migrateJambLegacyTopicProgress({
      "bio-d-03-biotechnology": { state: "completed", updatedAt: 20 },
      "bio-d-02-heredity": { state: "in_progress", updatedAt: 10 },
      "unrelated-topic": { state: "not_started", updatedAt: 5 },
    });
    expect(migrated.progress).toEqual({
      "bio-d-02-heredity": { state: "completed", updatedAt: 20 },
      "unrelated-topic": { state: "not_started", updatedAt: 5 },
    });
    expect(migrated.migratedIds).toEqual(["bio-d-03-biotechnology"]);
  });

  it("queues canonical cloud rows before deleting retired topic IDs", () => {
    const result = reconcileJambSyllabusProgress(
      {},
      { "bio-d-03-biotechnology": { state: "completed", updatedAt: 20 } },
    );
    expect(result.merged["bio-d-02-heredity"]).toEqual({ state: "completed", updatedAt: 20 });
    expect(result.pendingUpserts).toEqual([
      ["bio-d-02-heredity", { state: "completed", updatedAt: 20 }],
    ]);
    expect(result.pendingDeletes).toEqual(["bio-d-03-biotechnology"]);
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

  it("resolves equal-timestamp conflicts deterministically without favouring one device", () => {
    const result = reconcileJambSyllabusProgress(
      { topic: { state: "not_started", updatedAt: 30 } },
      { topic: { state: "completed", updatedAt: 30 } },
    );
    expect(result.merged.topic.state).toBe("completed");
    expect(result.pendingUpserts).toHaveLength(0);
  });

});
