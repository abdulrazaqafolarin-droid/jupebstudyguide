import { describe, expect, it } from 'vitest';
import { mergeUserStatsForSync } from './user-stats-sync';

describe('mergeUserStatsForSync', () => {
  it('preserves cloud values when a fresh install has empty local values', () => {
    expect(mergeUserStatsForSync(
      { streakDays: 0, syllabusCompletedDays: 0, achievementsCount: 0, masteryAverage: 0 },
      { streak_days: 8, syllabus_completed_days: 12, achievements_count: 5, mastery_avg: 86.5 },
    )).toEqual({
      streak_days: 8,
      syllabus_completed_days: 12,
      achievements_count: 5,
      mastery_avg: 86.5,
    });
  });

  it('accepts larger values after local and cloud state have been merged', () => {
    expect(mergeUserStatsForSync(
      { streakDays: 9, syllabusCompletedDays: 15, achievementsCount: 6, masteryAverage: 91 },
      { streak_days: 8, syllabus_completed_days: 12, achievements_count: 5, mastery_avg: 86.5 },
    )).toEqual({
      streak_days: 9,
      syllabus_completed_days: 15,
      achievements_count: 6,
      mastery_avg: 91,
    });
  });

  it('treats a missing cloud row as an empty baseline', () => {
    expect(mergeUserStatsForSync(
      { streakDays: 2, syllabusCompletedDays: 3, achievementsCount: 1, masteryAverage: 75 },
      null,
    )).toEqual({
      streak_days: 2,
      syllabus_completed_days: 3,
      achievements_count: 1,
      mastery_avg: 75,
    });
  });

  it('ignores malformed or negative cloud values instead of propagating them', () => {
    expect(mergeUserStatsForSync(
      { streakDays: 1, syllabusCompletedDays: 2, achievementsCount: 1, masteryAverage: 70 },
      { streak_days: -1, syllabus_completed_days: Number.NaN, achievements_count: null, mastery_avg: 'invalid' },
    )).toEqual({
      streak_days: 1,
      syllabus_completed_days: 2,
      achievements_count: 1,
      mastery_avg: 70,
    });
  });
});
