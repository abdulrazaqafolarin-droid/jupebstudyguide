export interface JambSavedAnswerActivity {
  selected: string;
  savedAt: number;
}

export interface JambActivityStats {
  answerCount: number;
  totalDaysStudied: number;
  currentStreak: number;
  longestStreak: number;
  hasStudiedToday: boolean;
  lastActivityAt: number | null;
}

export interface JambAchievementMetrics extends JambActivityStats {
  bookmarkCount: number;
}

export const JAMB_ANSWER_MILESTONES = [
  { id: "first", label: "First answer", target: 1, description: "Save your first practice answer" },
  { id: "ten", label: "Getting started", target: 10, description: "Save 10 practice answers" },
  { id: "fifty", label: "Consistent learner", target: 50, description: "Save 50 practice answers" },
  { id: "hundred", label: "Question explorer", target: 100, description: "Save 100 practice answers" },
  { id: "five-hundred", label: "JAMB champion", target: 500, description: "Save 500 practice answers" },
] as const;

export type JambAchievementMetric = "answers" | "longestStreak" | "bookmarks";

export interface JambAchievementDefinition {
  id: string;
  label: string;
  description: string;
  target: number;
  metric: JambAchievementMetric;
  category: "Practice" | "Consistency" | "Organisation";
}

export const JAMB_ACHIEVEMENTS: readonly JambAchievementDefinition[] = [
  ...JAMB_ANSWER_MILESTONES.map((milestone): JambAchievementDefinition => ({
    ...milestone,
    metric: "answers",
    category: "Practice",
  })),
  { id: "three-day-streak", label: "Three-day rhythm", description: "Study on three consecutive days", target: 3, metric: "longestStreak", category: "Consistency" },
  { id: "seven-day-streak", label: "A full week", description: "Study on seven consecutive days", target: 7, metric: "longestStreak", category: "Consistency" },
  { id: "ten-bookmarks", label: "Save for later", description: "Bookmark 10 JAMB questions", target: 10, metric: "bookmarks", category: "Organisation" },
  { id: "twenty-five-bookmarks", label: "Personal question library", description: "Bookmark 25 JAMB questions", target: 25, metric: "bookmarks", category: "Organisation" },
];

function localDateKey(date: Date): string {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

export function getJambActivityStats(
  savedAnswers: Record<string, JambSavedAnswerActivity>,
  now = new Date(),
): JambActivityStats {
  const validAnswers = Object.values(savedAnswers).filter(
    (answer) => Number.isFinite(answer.savedAt) && answer.savedAt > 0,
  );
  const activeDays = new Set(validAnswers.map((answer) => localDateKey(new Date(answer.savedAt))));
  const todayKey = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  let currentStreak = 0;
  if (activeDays.has(todayKey) || activeDays.has(yesterdayKey)) {
    const cursor = new Date(activeDays.has(todayKey) ? now : yesterday);
    while (activeDays.has(localDateKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const sortedDays = [...activeDays].sort();
  let run = 0;
  let longestStreak = 0;
  let previousDay: number | null = null;
  for (const key of sortedDays) {
    const parts = key.split("-").map(Number);
    const currentDay = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    run = previousDay !== null && currentDay - previousDay === 86400000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previousDay = currentDay;
  }

  return {
    answerCount: validAnswers.length,
    totalDaysStudied: activeDays.size,
    currentStreak,
    longestStreak,
    hasStudiedToday: activeDays.has(todayKey),
    lastActivityAt: validAnswers.length > 0
      ? Math.max(...validAnswers.map((answer) => answer.savedAt))
      : null,
  };
}

export interface JambDailyActivity {
  date: string;
  label: string;
  count: number;
}

export function getJambRecentDailyActivity(
  savedAnswers: Record<string, JambSavedAnswerActivity>,
  now = new Date(),
  dayCount = 7,
): JambDailyActivity[] {
  const counts = new Map<string, number>();
  for (const answer of Object.values(savedAnswers)) {
    if (!Number.isFinite(answer.savedAt) || answer.savedAt <= 0) continue;
    const key = localDateKey(new Date(answer.savedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: Math.max(0, dayCount) }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - index - 1));
    const key = localDateKey(date);
    return {
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      count: counts.get(key) ?? 0,
    };
  });
}

export function getJambAchievementProgress(metrics: JambAchievementMetrics) {
  return JAMB_ACHIEVEMENTS.map((achievement) => {
    const value = achievement.metric === "answers"
      ? metrics.answerCount
      : achievement.metric === "longestStreak"
        ? metrics.longestStreak
        : metrics.bookmarkCount;
    return {
      ...achievement,
      current: Math.min(value, achievement.target),
      unlocked: value >= achievement.target,
      percent: Math.min(100, Math.round((value / achievement.target) * 100)),
    };
  });
}
