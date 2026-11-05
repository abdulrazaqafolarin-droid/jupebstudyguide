import { describe, expect, it } from 'vitest';
import type { StoredStudySession } from '@/types/syllabus';
import {
  createUserDataBackup,
  parseUserDataBackup,
  restoreUserDataBackup,
} from './local-data-backup';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(String(key), String(value)); },
  } as Storage;
}

function storedSession(
  id: string,
  updatedAt: string,
  name: string,
  completedDays: number[],
): StoredStudySession {
  const dailyTasks = [1, 2].map(day => ({
    day,
    subject: day === 1 ? 'physics' as const : 'chemistry' as const,
    topics: [],
    learningObjectives: [],
    checkpointQuestions: [],
    isCompleted: completedDays.includes(day),
    completedAt: completedDays.includes(day) ? updatedAt : undefined,
    masteryScore: completedDays.includes(day) ? 80 + day : undefined,
  }));
  return {
    id,
    name,
    subjects: ['physics', 'chemistry'],
    status: 'active',
    startDate: '2026-11-01',
    dailyGoalMinutes: 30,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt,
    progress: {
      combination: { core: ['physics'], elective: ['chemistry'] },
      currentDay: Math.max(1, ...completedDays) + 1,
      dailyTasks,
      startedAt: '2026-11-01T00:00:00.000Z',
      lastStudiedAt: updatedAt,
      overallProgress: (completedDays.length / 2) * 100,
      subjectProgress: { physics: 50, chemistry: 50, biology: 0, math: 0 },
    },
  };
}

describe('user data backup', () => {
  it('exports only the current account namespace and retains legacy bookmarks separately', () => {
    const storage = memoryStorage({
      'u:user-a:study-progress': '{"q1":{"lastReviewed":"2026-11-04T00:00:00.000Z"}}',
      'u:user-b:study-progress': '{"q2":{}}',
      jupeb_study_bookmarks: '[{"questionId":"q1","createdAt":1}]',
      jupeb_syllabus_progress: '{"currentDay":4}',
      'jupeb-hidden-msgs-user-a': '["message-1"]',
      'sb-project-auth-token': 'must-not-export',
    });

    const backup = createUserDataBackup('user-a', storage);
    expect(Object.keys(backup.entries)).toEqual(['u:user-a:study-progress']);
    expect(backup.deviceShared.legacyBookmarks).toContain('q1');
    expect(backup.deviceShared.legacyEntries.jupeb_syllabus_progress).toContain('currentDay');
    expect(backup.deviceShared.legacyEntries['jupeb-hidden-msgs-user-a']).toContain('message-1');
    expect(JSON.stringify(backup)).not.toContain('must-not-export');
  });

  it('rejects a backup for a different signed-in account', () => {
    const source = memoryStorage({ 'u:user-a:study-progress': '{"q1":{}}' });
    const backup = parseUserDataBackup(JSON.stringify(createUserDataBackup('user-a', source)));
    const target = memoryStorage();

    expect(() => restoreUserDataBackup(backup, 'user-b', false, target))
      .toThrow(/different account/i);
    expect(target.length).toBe(0);
  });

  it('merges spaced-repetition progress by the most recent review per question', () => {
    const storage = memoryStorage({
      'u:user-a:study-progress': JSON.stringify({
        q1: { questionId: 'q1', lastReviewed: '2026-11-03T00:00:00.000Z', repetitions: 1 },
        q2: { questionId: 'q2', lastReviewed: '2026-11-04T00:00:00.000Z', repetitions: 2 },
      }),
    });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: {
        'u:user-a:study-progress': JSON.stringify({
          q1: { questionId: 'q1', lastReviewed: '2026-11-05T00:00:00.000Z', repetitions: 3 },
          q2: { questionId: 'q2', lastReviewed: '2026-11-02T00:00:00.000Z', repetitions: 1 },
          q3: { questionId: 'q3', lastReviewed: '2026-11-02T00:00:00.000Z', repetitions: 1 },
        }),
      },
      deviceShared: { legacyBookmarks: null },
    }));

    const result = restoreUserDataBackup(backup, 'user-a', false, storage);
    const restored = JSON.parse(storage.getItem('u:user-a:study-progress') || '{}');
    expect(restored.q1.repetitions).toBe(3);
    expect(restored.q2.repetitions).toBe(2);
    expect(restored.q3.repetitions).toBe(1);
    expect(result.merged).toBe(1);
  });

  it('merges duplicate session progress day-by-day and restores sessions absent locally', () => {
    const storage = memoryStorage({
      'u:user-a:study-sessions': JSON.stringify([
        storedSession('existing', '2026-11-04T00:00:00Z', 'Current', [1]),
      ]),
    });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: {
        'u:user-a:study-sessions': JSON.stringify([
          storedSession('existing', '2026-11-03T00:00:00Z', 'Older metadata', [2]),
          storedSession('backup-only', '2026-11-05T00:00:00Z', 'Recovered', [1]),
        ]),
      },
      deviceShared: { legacyBookmarks: null, legacyEntries: {} },
    }));

    restoreUserDataBackup(backup, 'user-a', false, storage);
    const restored = JSON.parse(storage.getItem('u:user-a:study-sessions') || '[]') as StoredStudySession[];
    const existing = restored.find(item => item.id === 'existing');
    expect(existing?.name).toBe('Current');
    expect(existing?.progress.dailyTasks.filter(task => task.isCompleted).map(task => task.day)).toEqual([1, 2]);
    expect(existing?.progress.overallProgress).toBe(100);
    expect(restored.find(item => item.id === 'backup-only')?.name).toBe('Recovered');
  });

  it('does not replace current sessions with a malformed backup session', () => {
    const existing = storedSession('existing', '2026-11-04T00:00:00Z', 'Current', [1]);
    const storage = memoryStorage({
      'u:user-a:study-sessions': JSON.stringify([existing]),
    });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: {
        'u:user-a:study-sessions': JSON.stringify([
          { id: 'existing', name: 'Malformed backup', progress: { dailyTasks: 'not-an-array' } },
        ]),
      },
      deviceShared: { legacyBookmarks: null, legacyEntries: {} },
    }));

    const result = restoreUserDataBackup(backup, 'user-a', false, storage);
    const restored = JSON.parse(storage.getItem('u:user-a:study-sessions') || '[]');
    expect(restored[0].name).toBe('Current');
    expect(result.skipped).toBe(1);
  });

  it('rejects a session with an incomplete daily task instead of hydrating it', () => {
    const current = storedSession('existing', '2026-11-04T00:00:00Z', 'Current', [1]);
    const malformed = storedSession('existing', '2026-11-05T00:00:00Z', 'Malformed', [2]);
    (malformed.progress.dailyTasks[0] as unknown as Record<string, unknown>).topics = 'not-an-array';
    const storage = memoryStorage({
      'u:user-a:study-sessions': JSON.stringify([current]),
    });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: { 'u:user-a:study-sessions': JSON.stringify([malformed]) },
      deviceShared: { legacyBookmarks: null, legacyEntries: {} },
    }));

    const result = restoreUserDataBackup(backup, 'user-a', false, storage);
    const restored = JSON.parse(storage.getItem('u:user-a:study-sessions') || '[]');
    expect(restored[0].name).toBe('Current');
    expect(result.skipped).toBe(1);
  });

  it('does not overwrite unknown existing account preferences or settings', () => {
    const storage = memoryStorage({ 'u:user-a:theme': 'dark' });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: { 'u:user-a:theme': 'light' },
      deviceShared: { legacyBookmarks: null },
    }));

    const result = restoreUserDataBackup(backup, 'user-a', false, storage);
    expect(storage.getItem('u:user-a:theme')).toBe('dark');
    expect(result.skipped).toBe(1);
  });

  it('restores legacy bookmarks only when explicitly requested', () => {
    const source = memoryStorage({ jupeb_study_bookmarks: '[{"questionId":"q1","createdAt":1}]' });
    const backup = parseUserDataBackup(JSON.stringify(createUserDataBackup('user-a', source)));
    const target = memoryStorage();

    restoreUserDataBackup(backup, 'user-a', false, target);
    expect(target.getItem('jupeb_study_bookmarks')).toBeNull();
    restoreUserDataBackup(backup, 'user-a', true, target);
    expect(JSON.parse(target.getItem('u:user-a:study-bookmarks') || '[]')).toHaveLength(1);
    expect(target.getItem('jupeb_study_bookmarks')).toBeNull();
  });

  it('merges hidden-message choices without overwriting the current device list', () => {
    const source = memoryStorage({
      'jupeb-hidden-msgs-user-a': '["old-hidden"]',
    });
    const backup = parseUserDataBackup(JSON.stringify(createUserDataBackup('user-a', source)));
    const target = memoryStorage({
      'jupeb-hidden-msgs-user-a': '["new-hidden"]',
    });

    restoreUserDataBackup(backup, 'user-a', true, target);
    expect(JSON.parse(target.getItem('jupeb-hidden-msgs-user-a') || '[]').sort())
      .toEqual(['new-hidden', 'old-hidden']);
  });

  it('restores legacy learning keys into the selected account namespace only', () => {
    const source = memoryStorage({
      jupeb_syllabus_progress: '{"currentDay":7}',
      jupeb_achievements_unlocked: '["first-study"]',
      jupeb_streak_data: '{"currentStreak":4,"longestStreak":4,"totalDaysStudied":5,"totalQuestionsAnswered":20,"lastStudyDate":"2026-11-05"}',
      'jupeb-chat-hub': '{"threads":["old"]}',
    });
    const backup = parseUserDataBackup(JSON.stringify(createUserDataBackup('user-a', source)));
    const target = memoryStorage({
      jupeb_syllabus_progress: '{"currentDay":9}',
    });

    restoreUserDataBackup(backup, 'user-a', false, target);
    expect(target.getItem('u:user-a:syllabus-progress')).toBeNull();

    restoreUserDataBackup(backup, 'user-a', true, target);
    expect(target.getItem('u:user-a:syllabus-progress')).toContain('"currentDay":7');
    expect(JSON.parse(target.getItem('u:user-a:achievements-unlocked') || '[]')).toEqual(['first-study']);
    expect(JSON.parse(target.getItem('u:user-a:streak') || '{}').currentStreak).toBe(4);
    expect(target.getItem('u:user-a:legacy-device-data:jupeb-chat-hub')).toContain('threads');
    expect(target.getItem('jupeb_syllabus_progress')).toBe('{"currentDay":9}');
    expect(target.getItem('jupeb_achievements_unlocked')).toBeNull();
    expect(target.getItem('jupeb_streak_data')).toBeNull();
    expect(target.getItem('jupeb-chat-hub')).toBeNull();
    expect(target.getItem('u:user-a:study-sessions-legacy-migrated-v1')).toBe('0');
  });

  it('does not expose restored legacy records to a different account on the same device', () => {
    const source = memoryStorage({
      jupeb_achievements_unlocked: '["private-achievement"]',
    });
    const backup = parseUserDataBackup(JSON.stringify(createUserDataBackup('user-a', source)));
    const target = memoryStorage();

    restoreUserDataBackup(backup, 'user-a', true, target);

    expect(target.getItem('u:user-a:achievements-unlocked')).toBe('["private-achievement"]');
    expect(target.getItem('u:user-b:achievements-unlocked')).toBeNull();
    expect(target.getItem('jupeb_achievements_unlocked')).toBeNull();
  });

  it('rejects credential-like storage keys instead of restoring them', () => {
    const raw = JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: { 'u:user-a:api-key': 'must-not-restore' },
      deviceShared: { legacyBookmarks: null, legacyEntries: {} },
    });

    expect(() => parseUserDataBackup(raw)).toThrow(/sensitive/i);
  });

  it('preserves existing local data if a storage write fails', () => {
    const values = new Map<string, string>([['u:user-a:theme', 'dark']]);
    const storage = {
      get length() { return values.size; },
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === 'u:user-a:study-progress') throw new Error('quota');
        values.set(key, value);
      },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    } as Storage;
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: { 'u:user-a:study-progress': '{"q1":{}}' },
      deviceShared: { legacyBookmarks: null },
    }));

    expect(() => restoreUserDataBackup(backup, 'user-a', false, storage)).toThrow(/could not finish/i);
    expect(storage.getItem('u:user-a:theme')).toBe('dark');
    expect(storage.getItem('u:user-a:study-progress')).toBeNull();
  });
});
