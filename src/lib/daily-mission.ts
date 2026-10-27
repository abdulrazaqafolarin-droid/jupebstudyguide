import { Subject } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";

export const CORE_SUBJECTS: Subject[] = ["physics", "chemistry"];
export const ELECTIVE_SUBJECTS: Subject[] = ["biology", "math"];

/**
 * Pick the session the Daily Mission widget should surface:
 * the most recently created session with status 'active'.
 * `sessions` from useStudySessions is already sorted newest-first.
 */
export function getActiveDailySession(
  sessions: StudySessionData[]
): StudySessionData | null {
  return sessions.find((s) => s.status === "active") ?? null;
}

/** The task the user should work on today (current day, not yet completed). */
export function getTodayTask(session: StudySessionData): DailyTask | null {
  const task =
    session.progress.dailyTasks.find(
      (t) => t.day === session.progress.currentDay
    ) ?? null;
  if (!task || task.isCompleted) return null;
  return task;
}

/** Whether every day in the session is done. */
export function isSessionComplete(session: StudySessionData): boolean {
  return (
    session.progress.dailyTasks.length > 0 &&
    session.progress.dailyTasks.every((t) => t.isCompleted)
  );
}

/** Consecutive completed days ending at the current day (mission streak). */
export function missionStreak(session: StudySessionData): number {
  let streak = 0;
  const byDay = new Map(session.progress.dailyTasks.map((t) => [t.day, t]));
  for (let day = session.progress.currentDay - 1; day >= 1; day--) {
    if (byDay.get(day)?.isCompleted) streak++;
    else break;
  }
  return streak;
}

/**
 * Streak built from actual mission records: consecutive localDates where a
 * mission reached 'completed', counting back from today. If today's mission
 * isn't finished yet, the streak still counts through yesterday (grace day),
 * so completing yesterday never shows a broken streak the moment midnight
 * passes.
 */
export function missionRecordStreak(records: DailyMissionRecord[]): number {
  const completed = new Set(
    records.filter((mission) => mission.stage === "completed").map((mission) => mission.localDate),
  );
  if (completed.size === 0) return 0;
  const cursor = new Date();
  if (!completed.has(todayDateString(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (completed.has(todayDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Suggest which electives to pre-tick when starting a mission,
 * based on subjects the student has already studied.
 */
export function suggestElectives(studied: Set<Subject>): {
  biology: boolean;
  math: boolean;
} {
  if (studied.size === 0) return { biology: true, math: true };
  return { biology: studied.has("biology"), math: studied.has("math") };
}

export function subjectsFromElectives(electives: {
  biology: boolean;
  math: boolean;
}): Subject[] {
  const subjects: Subject[] = [...CORE_SUBJECTS];
  if (electives.biology) subjects.push("biology");
  if (electives.math) subjects.push("math");
  return subjects;
}

export function buildSessionName(subjects: Subject[]): string {
  return `${subjects
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" + ")} Plan`;
}

export function todayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
