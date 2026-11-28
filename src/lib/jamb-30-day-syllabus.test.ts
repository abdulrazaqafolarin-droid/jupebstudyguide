import { describe, expect, it } from "vitest";
import { JAMB_SYLLABUS_SUBJECTS } from "@/lib/jamb-syllabus";
import {
  advanceJambPlanCurrentDay,
  generateJamb30DayTasks,
  isJambStudySession,
  getJambPlanTopicPool,
  getJambStudySessionProgress,
  mergeJambStudySessions,
  normalizeJambPlanSubjects,
  reorderJambStudySessionSubjects,
  type JambStudySession,
} from "@/lib/jamb-30-day-syllabus";

describe("JAMB 30-day syllabus plan", () => {
  it("keeps Use of English compulsory and normalizes subjects without duplicates", () => {
    expect(normalizeJambPlanSubjects(["physics", "chemistry", "biology"])).toEqual([
      "use_of_english", "physics", "chemistry", "biology",
    ]);
    expect(normalizeJambPlanSubjects(["use_of_english", "physics", "physics", "math"])).toEqual([
      "use_of_english", "math", "physics",
    ]);
  });

  it("builds exactly 30 days from the selected JAMB subjects", () => {
    const subjects = ["use_of_english", "physics", "chemistry", "biology"] as const;
    const tasks = generateJamb30DayTasks(subjects);
    const expectedTopics = getJambPlanTopicPool(subjects);

    expect(tasks).toHaveLength(30);
    expect(tasks.map((task) => task.day)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(tasks.every((task) => !task.isCompleted)).toBe(true);
    expect(tasks.flatMap((task) => task.topics).map((topic) => topic.id)).toEqual(
      expectedTopics.map((topic) => topic.id),
    );
  });

  it("does not silently accept more than three optional subjects", () => {
    expect(() => generateJamb30DayTasks(JAMB_SYLLABUS_SUBJECTS)).toThrow(
      "A JAMB study plan must contain Use of English and exactly three other subjects.",
    );
  });

  it("rejects an invalid plan length", () => {
    expect(() => generateJamb30DayTasks(["physics", "chemistry", "biology"], 0)).toThrow(
      "Study plan length must be between 1 and 120 days.",
    );
  });

  it("reports completed-day progress accurately", () => {
    const tasks = generateJamb30DayTasks(["physics", "chemistry", "biology"]);
    expect(getJambStudySessionProgress(tasks)).toEqual({
      completedDays: 0, totalDays: 30, percentage: 0,
    });
    const partiallyComplete = tasks.map((task) => task.day <= 3 ? { ...task, isCompleted: true } : task);
    expect(getJambStudySessionProgress(partiallyComplete)).toEqual({
      completedDays: 3, totalDays: 30, percentage: 10,
    });
  });

  it("never moves the current day backwards when an earlier day is revisited", () => {
    expect(advanceJambPlanCurrentDay(1, 1)).toBe(2);
    expect(advanceJambPlanCurrentDay(5, 2)).toBe(5);
    expect(advanceJambPlanCurrentDay(30, 30)).toBe(30);
  });

  it("merges completed days from local and cloud without duplicating sessions", () => {
    const tasks = generateJamb30DayTasks(["physics", "chemistry", "biology"]);
    const base: JambStudySession = {
      id: "session-1",
      name: "My JAMB plan",
      subjects: ["use_of_english", "physics", "chemistry", "biology"],
      status: "active",
      startDate: "2026-11-28",
      dailyGoalMinutes: 30,
      createdAt: "2026-11-28T08:00:00.000Z",
      updatedAt: "2026-11-28T08:00:00.000Z",
      progress: {
        subjects: ["use_of_english", "physics", "chemistry", "biology"],
        currentDay: 1,
        dailyTasks: tasks,
        startedAt: "2026-11-28T08:00:00.000Z",
        overallProgress: 0,
        subjectProgress: {
          use_of_english: 0, math: 0, physics: 0, chemistry: 0, biology: 0,
        },
      },
    };
    const local = {
      ...base,
      updatedAt: "2026-11-28T09:00:00.000Z",
      progress: {
        ...base.progress,
        dailyTasks: base.progress.dailyTasks.map((task) => task.day === 1
          ? { ...task, isCompleted: true, masteryScore: 100, completedAt: "2026-11-28T09:00:00.000Z" }
          : task),
      },
    };
    const cloud = { ...base, updatedAt: "2026-11-28T08:30:00.000Z" };

    const merged = mergeJambStudySessions([local], [cloud]);
    expect(merged).toHaveLength(1);
    expect(merged[0].progress.dailyTasks[0].isCompleted).toBe(true);
    expect(merged[0].progress.overallProgress).toBeCloseTo(100 / 30);
  });

  it("reorders only remaining days and preserves completed day content", () => {
    const subjects = ["use_of_english", "physics", "chemistry", "biology"] as const;
    const tasks = generateJamb30DayTasks(subjects);
    const firstDay = {
      ...tasks[0],
      isCompleted: true,
      completedAt: "2026-11-28T09:00:00.000Z",
      masteryScore: 100,
    };
    const session: JambStudySession = {
      id: "priority-plan",
      name: "Priority plan",
      subjects: [...subjects],
      status: "active",
      startDate: "2026-11-28",
      dailyGoalMinutes: 45,
      createdAt: "2026-11-28T08:00:00.000Z",
      updatedAt: "2026-11-28T09:00:00.000Z",
      progress: {
        subjects: [...subjects],
        currentDay: 2,
        dailyTasks: [firstDay, ...tasks.slice(1)],
        startedAt: "2026-11-28T08:00:00.000Z",
        overallProgress: 100 / 30,
        subjectProgress: {
          use_of_english: 0, math: 0, physics: 0, chemistry: 0, biology: 0,
        },
      },
    };

    const reordered = reorderJambStudySessionSubjects(
      session,
      ["biology", "chemistry", "physics", "use_of_english"],
    );

    expect(reordered.subjects).toEqual(["biology", "chemistry", "physics", "use_of_english"]);
    expect(reordered.progress.dailyTasks[0]).toEqual(firstDay);
    expect(reordered.progress.dailyTasks[1].topics[0].subject).toBe("biology");
    expect(reordered.progress.dailyTasks).toHaveLength(30);
    const originalTopicIds = tasks.flatMap((task) => task.topics.map((topic) => topic.id)).sort();
    const reorderedTopicIds = reordered.progress.dailyTasks.flatMap((task) => task.topics.map((topic) => topic.id)).sort();
    expect(reorderedTopicIds).toEqual(originalTopicIds);
  });

  it("accepts a complete valid JAMB session and rejects malformed remote records", () => {
    const subjects = ["use_of_english", "physics", "chemistry", "biology"] as const;
    const tasks = generateJamb30DayTasks(subjects);
    const session: JambStudySession = {
      id: "validated-plan",
      name: "Validated plan",
      subjects: [...subjects],
      status: "active",
      startDate: "2026-11-28",
      dailyGoalMinutes: 60,
      createdAt: "2026-11-28T08:00:00.000Z",
      updatedAt: "2026-11-28T08:00:00.000Z",
      progress: {
        subjects: [...subjects],
        currentDay: 1,
        dailyTasks: tasks,
        startedAt: "2026-11-28T08:00:00.000Z",
        overallProgress: 0,
        subjectProgress: {
          use_of_english: 0, math: 0, physics: 0, chemistry: 0, biology: 0,
        },
      },
    };
    expect(isJambStudySession(session)).toBe(true);
    expect(isJambStudySession({ ...session, subjects: ["physics"] })).toBe(false);
    expect(isJambStudySession({ ...session, progress: { ...session.progress, dailyTasks: [] } })).toBe(false);
  });
});
