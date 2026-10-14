import { describe, expect, it } from "vitest";
import type { StudySessionData } from "@/types/syllabus";
import {
  buildSessionName,
  getActiveDailySession,
  getTodayTask,
  isSessionComplete,
  missionStreak,
  subjectsFromElectives,
  suggestElectives,
  todayDateString,
} from "./daily-mission";

function makeSession(
  overrides: Partial<StudySessionData> & { tasks?: { day: number; completed: boolean }[] } = {}
): StudySessionData {
  const tasks = (overrides.tasks ?? [
    { day: 1, completed: true },
    { day: 2, completed: true },
    { day: 3, completed: false },
  ]).map((t) => ({
    day: t.day,
    topics: [],
    subject: "physics" as const,
    learningObjectives: ["Understand the key concepts of X"],
    checkpointQuestions: ["Can you explain X in your own words?"],
    isCompleted: t.completed,
    completedAt: t.completed ? new Date("2026-01-0" + t.day) : undefined,
  }));
  const { tasks: _ignored, ...rest } = overrides;
  return {
    id: "s1",
    name: "Physics + Chemistry Plan",
    subjects: ["physics", "chemistry"],
    status: "active",
    progress: {
      combination: { core: ["physics", "chemistry"], elective: [] },
      currentDay: 3,
      dailyTasks: tasks,
      startedAt: new Date("2026-01-01"),
      overallProgress: 66,
      subjectProgress: { physics: 10, chemistry: 5, biology: 0, math: 0 },
    },
    startDate: "2026-01-01",
    dailyGoalMinutes: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    ...rest,
  };
}

describe("getActiveDailySession", () => {
  it("returns the first active session", () => {
    const paused = makeSession({ id: "old", status: "paused" });
    const active = makeSession({ id: "new", status: "active" });
    expect(getActiveDailySession([paused, active])).toBe(active);
  });

  it("returns null when nothing is active", () => {
    expect(getActiveDailySession([makeSession({ status: "paused" })])).toBeNull();
    expect(getActiveDailySession([])).toBeNull();
  });
});

describe("getTodayTask", () => {
  it("returns the current-day task when pending", () => {
    const task = getTodayTask(makeSession());
    expect(task?.day).toBe(3);
  });

  it("returns null when the current day is already done", () => {
    const s = makeSession({
      tasks: [
        { day: 1, completed: true },
        { day: 2, completed: true },
      ],
    });
    expect(getTodayTask(s)).toBeNull();
  });
});

describe("isSessionComplete", () => {
  it("detects a fully completed session", () => {
    const s = makeSession({
      tasks: [
        { day: 1, completed: true },
        { day: 2, completed: true },
      ],
    });
    expect(isSessionComplete(s)).toBe(true);
    expect(isSessionComplete(makeSession())).toBe(false);
  });
});

describe("missionStreak", () => {
  it("counts consecutive completed days before today", () => {
    expect(missionStreak(makeSession())).toBe(2);
  });

  it("breaks the streak on a gap", () => {
    const s = makeSession({
      tasks: [
        { day: 1, completed: true },
        { day: 2, completed: false },
        { day: 3, completed: false },
      ],
    });
    expect(missionStreak(s)).toBe(0);
  });
});

describe("suggestElectives / subjectsFromElectives", () => {
  it("defaults to both electives for a fresh student", () => {
    expect(suggestElectives(new Set())).toEqual({ biology: true, math: true });
  });

  it("mirrors the subjects the student has studied", () => {
    expect(suggestElectives(new Set(["physics", "biology"]))).toEqual({
      biology: true,
      math: false,
    });
  });

  it("always keeps physics + chemistry as core", () => {
    expect(subjectsFromElectives({ biology: false, math: true })).toEqual([
      "physics",
      "chemistry",
      "math",
    ]);
  });
});

describe("buildSessionName", () => {
  it("joins capitalised subject names", () => {
    expect(buildSessionName(["physics", "chemistry", "math"])).toBe(
      "Physics + Chemistry + Math Plan"
    );
  });
});


describe("todayDateString", () => {
  it("formats the learner's local calendar date rather than converting to UTC", () => {
    const lateLocalEvening = new Date(2026, 9, 14, 23, 59, 0);
    expect(todayDateString(lateLocalEvening)).toBe("2026-10-14");
  });

  it("zero-pads month and day", () => {
    expect(todayDateString(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
  });
});
