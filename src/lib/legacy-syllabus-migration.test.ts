import { describe, expect, it } from 'vitest';
import { areLegacyProgressEquivalent, createLegacyStudySession } from './legacy-syllabus-migration';

const now = '2026-11-05T18:00:00.000Z';

describe('createLegacyStudySession', () => {
  it('converts a valid previous syllabus plan without changing its progress data', () => {
    const legacy = {
      combination: { core: ['physics', 'chemistry'], elective: ['biology'] },
      currentDay: 12,
      dailyTasks: [{ day: 1, isCompleted: true, completedAt: '2026-11-01T00:00:00.000Z' }],
      startedAt: '2026-10-25T10:00:00.000Z',
      overallProgress: 10,
      subjectProgress: { physics: 12, chemistry: 8, biology: 5, math: 0 },
    };
    const before = JSON.stringify(legacy);

    const session = createLegacyStudySession(legacy, 'legacy-session-1', now);

    expect(session).not.toBeNull();
    expect(session?.id).toBe('legacy-session-1');
    expect(session?.name).toBe('Physics + Chemistry + Biology Plan');
    expect(session?.subjects).toEqual(['physics', 'chemistry', 'biology']);
    expect(session?.progress.dailyTasks).toEqual(legacy.dailyTasks);
    expect(session?.createdAt).toBe(legacy.startedAt);
    expect(session?.startDate).toBe('2026-10-25');
    expect(JSON.stringify(legacy)).toBe(before);
  });

  it('filters invalid and duplicate subjects but retains all valid learning data', () => {
    const session = createLegacyStudySession({
      combination: { core: ['physics', 'physics', 'unknown'], elective: ['math', 4] },
      currentDay: 31,
      dailyTasks: [],
      startedAt: now,
    }, 'legacy-session-2', now);

    expect(session?.subjects).toEqual(['physics', 'math']);
    expect(session?.status).toBe('completed');
  });

  it('returns null for malformed or subject-less legacy data', () => {
    expect(createLegacyStudySession(null, 'id', now)).toBeNull();
    expect(createLegacyStudySession({ dailyTasks: [], combination: {} }, 'id', now)).toBeNull();
    expect(createLegacyStudySession({ dailyTasks: [], combination: { core: ['bad'] } }, 'id', now)).toBeNull();
  });

  it('uses a safe current timestamp when the old start date is invalid', () => {
    const session = createLegacyStudySession({
      combination: { core: ['physics'], elective: [] },
      currentDay: 1,
      dailyTasks: [],
      startedAt: 'not-a-date',
    }, 'legacy-session-3', now);

    expect(session?.createdAt).toBe(now);
    expect(session?.startDate).toBe('2026-11-05');
  });
});

describe('areLegacyProgressEquivalent', () => {
  it('treats the same legacy progress as equal when object key order differs', () => {
    const first = {
      combination: { core: ['physics'], elective: [] },
      currentDay: 4,
      dailyTasks: [{ day: 1, isCompleted: true }],
      startedAt: now,
      overallProgress: 3.33,
    };
    const reordered = {
      overallProgress: 3.33,
      startedAt: now,
      dailyTasks: [{ isCompleted: true, day: 1 }],
      currentDay: 4,
      combination: { elective: [], core: ['physics'] },
    };

    expect(areLegacyProgressEquivalent(first, reordered)).toBe(true);
    expect(areLegacyProgressEquivalent(first, { ...reordered, currentDay: 5 })).toBe(false);
  });
});
