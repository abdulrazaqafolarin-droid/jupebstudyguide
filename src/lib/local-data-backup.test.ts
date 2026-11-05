import { describe, expect, it } from 'vitest';
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

describe('user data backup', () => {
  it('exports only the current account namespace and retains legacy bookmarks separately', () => {
    const storage = memoryStorage({
      'u:user-a:study-progress': '{"q1":{"lastReviewed":"2026-11-04T00:00:00.000Z"}}',
      'u:user-b:study-progress': '{"q2":{}}',
      jupeb_study_bookmarks: '[{"questionId":"q1","createdAt":1}]',
      'sb-project-auth-token': 'must-not-export',
    });

    const backup = createUserDataBackup('user-a', storage);
    expect(Object.keys(backup.entries)).toEqual(['u:user-a:study-progress']);
    expect(backup.deviceShared.legacyBookmarks).toContain('q1');
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

  it('restores missing sessions but merges duplicate sessions by updatedAt', () => {
    const storage = memoryStorage({
      'u:user-a:study-sessions': JSON.stringify([
        { id: 'existing', updatedAt: '2026-11-04T00:00:00Z', name: 'Current' },
      ]),
    });
    const backup = parseUserDataBackup(JSON.stringify({
      format: 'jupeb-master-user-backup',
      version: 1,
      userId: 'user-a',
      exportedAt: '2026-11-05T00:00:00.000Z',
      entries: {
        'u:user-a:study-sessions': JSON.stringify([
          { id: 'existing', updatedAt: '2026-11-03T00:00:00Z', name: 'Older' },
          { id: 'backup-only', updatedAt: '2026-11-05T00:00:00Z', name: 'Recovered' },
        ]),
      },
      deviceShared: { legacyBookmarks: null },
    }));

    restoreUserDataBackup(backup, 'user-a', false, storage);
    const restored = JSON.parse(storage.getItem('u:user-a:study-sessions') || '[]');
    expect(restored.find((item: { id: string }) => item.id === 'existing').name).toBe('Current');
    expect(restored.find((item: { id: string }) => item.id === 'backup-only').name).toBe('Recovered');
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
    expect(JSON.parse(target.getItem('jupeb_study_bookmarks') || '[]')).toHaveLength(1);
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
