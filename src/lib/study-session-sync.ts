import type { DailyTask, StudySessionData } from '@/types/syllabus';

function timestamp(value: unknown): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sessionTimestamp(session: StudySessionData): number {
  return timestamp(session.updatedAt || session.createdAt);
}

function mergeTask(local: DailyTask, cloud: DailyTask, preferLocal: boolean): DailyTask {
  const preferred = preferLocal ? local : cloud;
  if (local.isCompleted !== cloud.isCompleted) {
    const completed = local.isCompleted ? local : cloud;
    return {
      ...preferred,
      ...completed,
      isCompleted: true,
      completedAt: timestamp(local.completedAt) >= timestamp(cloud.completedAt)
        ? local.completedAt
        : cloud.completedAt,
      masteryScore: Math.max(local.masteryScore ?? 0, cloud.masteryScore ?? 0) || undefined,
    };
  }

  if (!local.isCompleted) return { ...preferred };

  return {
    ...preferred,
    isCompleted: true,
    completedAt: timestamp(local.completedAt) >= timestamp(cloud.completedAt)
      ? local.completedAt
      : cloud.completedAt,
    masteryScore: Math.max(local.masteryScore ?? 0, cloud.masteryScore ?? 0) || undefined,
  };
}

function mergeStudySession(
  local: StudySessionData,
  cloud: StudySessionData,
): StudySessionData {
  const localIsNewer = sessionTimestamp(local) >= sessionTimestamp(cloud);
  const preferred = localIsNewer ? local : cloud;
  const older = localIsNewer ? cloud : local;

  const tasksByDay = new Map<number, DailyTask>();
  for (const task of older.progress.dailyTasks) tasksByDay.set(task.day, task);
  for (const task of preferred.progress.dailyTasks) {
    const previous = tasksByDay.get(task.day);
    tasksByDay.set(
      task.day,
      previous ? mergeTask(task, previous, localIsNewer) : task,
    );
  }

  const dailyTasks = [...tasksByDay.values()].sort((a, b) => a.day - b.day);
  const completedCount = dailyTasks.filter(task => task.isCompleted).length;
  const taskCount = dailyTasks.length;
  const currentDay = Math.max(
    Number(local.progress.currentDay) || 1,
    Number(cloud.progress.currentDay) || 1,
  );
  const subjectProgress = { ...local.progress.subjectProgress };
  for (const [subject, value] of Object.entries(cloud.progress.subjectProgress)) {
    const current = subjectProgress[subject as keyof typeof subjectProgress] ?? 0;
    if (Number.isFinite(value)) {
      subjectProgress[subject as keyof typeof subjectProgress] = Math.max(current, value);
    }
  }

  const combination = {
    core: [...new Set([...local.progress.combination.core, ...cloud.progress.combination.core])],
    elective: [...new Set([...local.progress.combination.elective, ...cloud.progress.combination.elective])],
  };
  const startedAt = timestamp(local.progress.startedAt) <= timestamp(cloud.progress.startedAt)
    ? local.progress.startedAt
    : cloud.progress.startedAt;
  const lastStudiedAt = timestamp(local.progress.lastStudiedAt) >= timestamp(cloud.progress.lastStudiedAt)
    ? local.progress.lastStudiedAt
    : cloud.progress.lastStudiedAt;

  return {
    ...older,
    ...preferred,
    id: local.id,
    subjects: [...new Set([...local.subjects, ...cloud.subjects])],
    status: taskCount > 0 && completedCount >= taskCount ? 'completed' : preferred.status,
    createdAt: timestamp(local.createdAt) <= timestamp(cloud.createdAt) ? local.createdAt : cloud.createdAt,
    updatedAt: sessionTimestamp(local) >= sessionTimestamp(cloud) ? local.updatedAt : cloud.updatedAt,
    progress: {
      ...older.progress,
      ...preferred.progress,
      combination,
      currentDay,
      dailyTasks,
      startedAt,
      lastStudiedAt,
      overallProgress: taskCount > 0 ? (completedCount / taskCount) * 100 : 0,
      subjectProgress,
    },
  };
}

/**
 * Merge local and cloud sessions without dropping sessions found on either
 * side. Sessions with the same ID get a task-level merge so offline work from
 * both devices survives even when one device's session timestamp is newer.
 * Session metadata prefers the newest update; completed syllabus days survive
 * on either side.
 */
export function mergeStudySessions(
  localSessions: StudySessionData[],
  cloudSessions: StudySessionData[],
): StudySessionData[] {
  const byId = new Map<string, StudySessionData>();

  for (const session of cloudSessions) {
    if (session?.id) byId.set(session.id, session);
  }

  for (const session of localSessions) {
    if (!session?.id) continue;
    const cloud = byId.get(session.id);
    byId.set(
      session.id,
      cloud ? mergeStudySession(session, cloud) : session,
    );
  }

  return [...byId.values()];
}
