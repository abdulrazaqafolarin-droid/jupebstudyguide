export interface LocalUserStatsForSync {
  streakDays: number;
  syllabusCompletedDays: number;
  achievementsCount: number;
  masteryAverage: number;
}

export interface CloudUserStatsForSync {
  streak_days?: number | null;
  syllabus_completed_days?: number | null;
  achievements_count?: number | null;
  mastery_avg?: number | string | null;
}

export interface UserStatsSyncPayload {
  streak_days: number;
  syllabus_completed_days: number;
  achievements_count: number;
  mastery_avg: number;
}

function finiteNonNegative(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Preserve cloud aggregates when a newly installed device has an empty or
 * incomplete local store. This is intentionally monotonic until the app has
 * a canonical cloud source for every aggregate and its reset semantics.
 */
export function mergeUserStatsForSync(
  local: LocalUserStatsForSync,
  cloud: CloudUserStatsForSync | null,
): UserStatsSyncPayload {
  return {
    streak_days: Math.max(finiteNonNegative(local.streakDays), finiteNonNegative(cloud?.streak_days)),
    syllabus_completed_days: Math.max(
      finiteNonNegative(local.syllabusCompletedDays),
      finiteNonNegative(cloud?.syllabus_completed_days),
    ),
    achievements_count: Math.max(
      finiteNonNegative(local.achievementsCount),
      finiteNonNegative(cloud?.achievements_count),
    ),
    mastery_avg: Math.max(finiteNonNegative(local.masteryAverage), finiteNonNegative(cloud?.mastery_avg)),
  };
}
