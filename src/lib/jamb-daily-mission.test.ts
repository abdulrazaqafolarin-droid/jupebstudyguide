import { describe, expect, it } from "vitest";
import {
  applyJambMissionAnswerCheck,
  createJambDailyMission,
  getJambMissionQuestionOffset,
  getJambMissionSummary,
  mergeJambMissionHistory,
  selectJambMissionAnswer,
} from "./jamb-daily-mission";

const fixedNow = new Date("2026-11-18T10:00:00.000Z");

describe("JAMB daily mission records", () => {
  it("creates a distinct subject/day record with unique questions", () => {
    const mission = createJambDailyMission(
      "2026-11-18",
      "physics",
      ["q1", "q2", "q2", "", "q3"],
      fixedNow,
    );
    expect(mission?.id).toBe("jamb-daily-2026-11-18-physics");
    expect(mission?.questionIds).toEqual(["q1", "q2", "q3"]);
    expect(mission?.status).toBe("in_progress");
    expect(createJambDailyMission("2026-11-18", "biology", ["q1", "q2"], fixedNow)).toBeNull();
  });

  it("does not allow answers for questions outside the saved mission or invalid options", () => {
    const mission = createJambDailyMission("2026-11-18", "chemistry", ["q1", "q2", "q3"], fixedNow)!;
    expect(selectJambMissionAnswer(mission, "other", "A", fixedNow)).toBe(mission);
    expect(selectJambMissionAnswer(mission, "q1", "Z", fixedNow)).toBe(mission);
  });

  it("completes only when every saved question has a server answer-check result", () => {
    let mission = createJambDailyMission("2026-11-18", "physics", ["q1", "q2", "q3"], fixedNow)!;
    mission = selectJambMissionAnswer(mission, "q1", "A", fixedNow);
    mission = applyJambMissionAnswerCheck(mission, "q1", { gradable: true, isCorrect: true }, fixedNow);
    mission = selectJambMissionAnswer(mission, "q2", "B", fixedNow);
    mission = applyJambMissionAnswerCheck(mission, "q2", { gradable: false }, fixedNow);
    expect(mission.status).toBe("in_progress");
    mission = selectJambMissionAnswer(mission, "q3", "C", fixedNow);
    mission = applyJambMissionAnswerCheck(mission, "q3", { gradable: true, isCorrect: false }, fixedNow);
    expect(mission.status).toBe("completed");
    expect(mission.completedAt).toBe(fixedNow.toISOString());
  });

  it("does not count ungraded selections in the accuracy denominator", () => {
    let mission = createJambDailyMission("2026-11-18", "biology", ["q1", "q2", "q3"], fixedNow)!;
    mission = selectJambMissionAnswer(mission, "q1", "A", fixedNow);
    mission = applyJambMissionAnswerCheck(mission, "q1", { gradable: true, isCorrect: true }, fixedNow);
    mission = selectJambMissionAnswer(mission, "q2", "B", fixedNow);
    mission = applyJambMissionAnswerCheck(mission, "q2", { gradable: false }, fixedNow);
    const summary = getJambMissionSummary(mission);
    expect(summary.accuracy).toBe(100);
    expect(summary.gradableQuestions).toBe(1);
    expect(summary.ungradedQuestions).toBe(1);
    expect(summary.accuracy).not.toBe(67);
  });

  it("returns no accuracy when no answer keys are available", () => {
    let mission = createJambDailyMission("2026-11-18", "physics", ["q1", "q2", "q3"], fixedNow)!;
    for (const [index, id] of mission.questionIds.entries()) {
      mission = selectJambMissionAnswer(mission, id, ["A", "B", "C"][index], fixedNow);
      mission = applyJambMissionAnswerCheck(mission, id, { gradable: false }, fixedNow);
    }
    expect(getJambMissionSummary(mission).accuracy).toBeNull();
  });

  it("merges cloud and local records by latest update without combining accounts or subjects", () => {
    const older = createJambDailyMission("2026-11-17", "physics", ["q1", "q2", "q3"], fixedNow)!;
    const newer = { ...older, updatedAt: "2026-11-18T11:00:00.000Z" };
    const anotherSubject = createJambDailyMission("2026-11-17", "biology", ["b1", "b2", "b3"], fixedNow)!;
    const merged = mergeJambMissionHistory([newer, anotherSubject], [older]);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.subject === "physics")?.updatedAt).toBe(newer.updatedAt);
  });

  it("keeps daily question batches inside the available range and stable for a date", () => {
    const first = getJambMissionQuestionOffset("2026-11-18", "physics", 35, 10);
    expect(first).toBe(getJambMissionQuestionOffset("2026-11-18", "physics", 35, 10));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first + 10).toBeLessThanOrEqual(35);
    expect(getJambMissionQuestionOffset("2026-11-18", "biology", 4, 10)).toBe(0);
    expect(getJambMissionQuestionOffset("2026-11-18", "physics", 0, 10)).toBe(0);
  });
});
