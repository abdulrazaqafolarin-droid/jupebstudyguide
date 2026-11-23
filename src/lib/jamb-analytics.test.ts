import { describe, expect, it } from "vitest";
import {
  getJambAchievementProgress,
  getJambActivityStats,
  getJambRecentDailyActivity,
} from "./jamb-analytics";

function localDay(day: number, hour = 12) {
  return new Date(2026, 0, day, hour).getTime();
}

describe("JAMB activity analytics", () => {
  it("counts active days and computes current and longest streaks", () => {
    const stats = getJambActivityStats({
      q1: { selected: "A", savedAt: localDay(1) },
      q2: { selected: "B", savedAt: localDay(2) },
      q3: { selected: "C", savedAt: localDay(3) },
      q4: { selected: "D", savedAt: localDay(5) },
    }, new Date(2026, 0, 5, 18));

    expect(stats.answerCount).toBe(4);
    expect(stats.totalDaysStudied).toBe(4);
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(3);
    expect(stats.hasStudiedToday).toBe(true);
  });

  it("keeps a streak alive through yesterday and resets after two missed days", () => {
    const active = getJambActivityStats({
      q1: { selected: "A", savedAt: localDay(3) },
      q2: { selected: "B", savedAt: localDay(4) },
    }, new Date(2026, 0, 5, 18));
    const broken = getJambActivityStats({
      q1: { selected: "A", savedAt: localDay(2) },
      q2: { selected: "B", savedAt: localDay(3) },
    }, new Date(2026, 0, 5, 18));

    expect(active.currentStreak).toBe(2);
    expect(active.hasStudiedToday).toBe(false);
    expect(broken.currentStreak).toBe(0);
  });

  it("ignores invalid timestamps and provides a seven-day activity series", () => {
    const saved = {
      q1: { selected: "A", savedAt: localDay(3) },
      q2: { selected: "B", savedAt: localDay(3, 14) },
      q3: { selected: "C", savedAt: Number.NaN },
    };
    const stats = getJambActivityStats(saved, new Date(2026, 0, 5));
    const daily = getJambRecentDailyActivity(saved, new Date(2026, 0, 5), 7);

    expect(stats.answerCount).toBe(2);
    expect(daily).toHaveLength(7);
    expect(daily.find((day) => day.date === "2026-01-03")?.count).toBe(2);
    expect(daily[6].date).toBe("2026-01-05");
  });

  it("unlocks milestones only when JAMB activity thresholds are met", () => {
    const achievements = getJambAchievementProgress({
      answerCount: 10,
      totalDaysStudied: 3,
      currentStreak: 2,
      longestStreak: 3,
      hasStudiedToday: true,
      lastActivityAt: localDay(3),
      bookmarkCount: 10,
      completedMissionCount: 5,
    });

    expect(achievements.find((item) => item.id === "first")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "ten")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "fifty")?.unlocked).toBe(false);
    expect(achievements.find((item) => item.id === "three-day-streak")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "seven-day-streak")?.unlocked).toBe(false);
    expect(achievements.find((item) => item.id === "ten-bookmarks")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "first-daily-mission")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "five-daily-missions")?.unlocked).toBe(true);
    expect(achievements.find((item) => item.id === "twenty-daily-missions")?.unlocked).toBe(false);
  });
});
