export const USER_BACKUP_FORMAT = 'jupeb-master-user-backup';
export const USER_BACKUP_VERSION = 1;
export const LEGACY_BOOKMARKS_KEY = 'jupeb_study_bookmarks';
const MAX_BACKUP_BYTES = 12 * 1024 * 1024;

export interface UserDataBackup {
  format: typeof USER_BACKUP_FORMAT;
  version: typeof USER_BACKUP_VERSION;
  userId: string;
  exportedAt: string;
  entries: Record<string, string>;
  deviceShared: {
    legacyBookmarks: string | null;
  };
}

export interface RestoreResult {
  restored: number;
  merged: number;
  skipped: number;
}

function parseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function timestamp(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeProgressMap(current: string, incoming: string): string | null {
  const a = parseJson<Record<string, Record<string, unknown>>>(current);
  const b = parseJson<Record<string, Record<string, unknown>>>(incoming);
  if (!a || !b || Array.isArray(a) || Array.isArray(b)) return null;

  const merged = { ...a };
  for (const [questionId, candidate] of Object.entries(b)) {
    const existing = merged[questionId];
    if (!existing || timestamp(candidate?.lastReviewed) > timestamp(existing?.lastReviewed)) {
      merged[questionId] = candidate;
    }
  }
  return JSON.stringify(merged);
}

function mergeSessions(current: string, incoming: string): string | null {
  const a = parseJson<Array<Record<string, unknown>>>(current);
  const b = parseJson<Array<Record<string, unknown>>>(incoming);
  if (!Array.isArray(a) || !Array.isArray(b)) return null;

  const byId = new Map<string, Record<string, unknown>>();
  for (const item of a) {
    if (typeof item?.id === 'string') byId.set(item.id, item);
  }
  for (const item of b) {
    if (typeof item?.id !== 'string') return null;
    const existing = byId.get(item.id);
    if (!existing || timestamp(item.updatedAt) > timestamp(existing.updatedAt)) byId.set(item.id, item);
  }
  return JSON.stringify([...byId.values()]);
}

function mergeSyllabus(current: string, incoming: string): string | null {
  const a = parseJson<Record<string, unknown>>(current);
  const b = parseJson<Record<string, unknown>>(incoming);
  if (!a || !b || !Array.isArray(a.dailyTasks) || !Array.isArray(b.dailyTasks)) return null;

  const currentTasks = a.dailyTasks as Array<Record<string, unknown>>;
  const backupTasks = b.dailyTasks as Array<Record<string, unknown>>;
  const tasks = new Map<number, Record<string, unknown>>();
  for (const task of currentTasks) {
    if (typeof task.day === 'number') tasks.set(task.day, task);
  }
  for (const task of backupTasks) {
    if (typeof task.day !== 'number') continue;
    const existing = tasks.get(task.day);
    if (!existing || (task.isCompleted === true && existing.isCompleted !== true)) {
      tasks.set(task.day, task);
    } else if (existing.isCompleted === true && task.isCompleted === true) {
      const candidateTime = timestamp(task.completedAt);
      const existingTime = timestamp(existing.completedAt);
      if (candidateTime > existingTime) tasks.set(task.day, task);
    }
  }

  const lastStudiedAt = timestamp(b.lastStudiedAt) > timestamp(a.lastStudiedAt)
    ? b.lastStudiedAt
    : a.lastStudiedAt;
  const subjectA = (a.subjectProgress && typeof a.subjectProgress === 'object')
    ? a.subjectProgress as Record<string, number> : {};
  const subjectB = (b.subjectProgress && typeof b.subjectProgress === 'object')
    ? b.subjectProgress as Record<string, number> : {};
  const subjectProgress = { ...subjectA };
  for (const [subject, percent] of Object.entries(subjectB)) {
    if (Number.isFinite(percent)) subjectProgress[subject] = Math.max(subjectProgress[subject] || 0, percent);
  }
  const mergedTasks = [...tasks.values()].sort((x, y) => Number(x.day) - Number(y.day));
  const completedCount = mergedTasks.filter(task => task.isCompleted === true).length;

  return JSON.stringify({
    ...a,
    ...b,
    dailyTasks: mergedTasks,
    currentDay: Math.max(Number(a.currentDay) || 1, Number(b.currentDay) || 1),
    lastStudiedAt,
    overallProgress: mergedTasks.length ? completedCount / mergedTasks.length * 100 : 0,
    subjectProgress,
  });
}

function mergeStreak(current: string, incoming: string): string | null {
  const a = parseJson<Record<string, unknown>>(current);
  const b = parseJson<Record<string, unknown>>(incoming);
  if (!a || !b) return null;
  const aDate = timestamp(a.lastStudyDate);
  const bDate = timestamp(b.lastStudyDate);
  const latest = bDate > aDate ? b : a;
  return JSON.stringify({
    ...a,
    ...latest,
    currentStreak: Number(latest.currentStreak) || 0,
    longestStreak: Math.max(Number(a.longestStreak) || 0, Number(b.longestStreak) || 0),
    totalDaysStudied: Math.max(Number(a.totalDaysStudied) || 0, Number(b.totalDaysStudied) || 0),
    totalQuestionsAnswered: Math.max(Number(a.totalQuestionsAnswered) || 0, Number(b.totalQuestionsAnswered) || 0),
  });
}

function mergeEntry(key: string, current: string, incoming: string): string | null {
  if (key.endsWith(':study-progress')) return mergeProgressMap(current, incoming);
  if (key.endsWith(':study-sessions')) return mergeSessions(current, incoming);
  if (key.endsWith(':syllabus-progress')) return mergeSyllabus(current, incoming);
  if (key.endsWith(':streak')) return mergeStreak(current, incoming);
  return null;
}

export function createUserDataBackup(userId: string, storage: Storage = localStorage): UserDataBackup {
  if (!userId.trim()) throw new Error('A signed-in account is required to create a backup.');
  const prefix = `u:${userId}:`;
  const entries: Record<string, string> = {};

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(prefix)) continue;
    if (/(token|secret|password|credential|api[-_]?key)/i.test(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }

  return {
    format: USER_BACKUP_FORMAT,
    version: USER_BACKUP_VERSION,
    userId,
    exportedAt: new Date().toISOString(),
    entries,
    deviceShared: {
      // This legacy key predates per-account namespacing. Keep it in the backup
      // but never restore it silently into another account.
      legacyBookmarks: storage.getItem(LEGACY_BOOKMARKS_KEY),
    },
  };
}

export function parseUserDataBackup(raw: string): UserDataBackup {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error('Backup file is too large.');
  const value = parseJson<Record<string, unknown>>(raw);
  if (!value || value.format !== USER_BACKUP_FORMAT || value.version !== USER_BACKUP_VERSION) {
    throw new Error('This is not a supported JUPEB Master backup file.');
  }
  if (typeof value.userId !== 'string' || !value.userId.trim()) {
    throw new Error('The backup does not identify its original account.');
  }
  if (!value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) {
    throw new Error('The backup file has an invalid data section.');
  }

  const prefix = `u:${value.userId}:`;
  const entries: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value.entries as Record<string, unknown>)) {
    if (!key.startsWith(prefix) || typeof entry !== 'string') {
      throw new Error('The backup contains an invalid or foreign-account storage key.');
    }
    entries[key] = entry;
  }

  const shared = value.deviceShared && typeof value.deviceShared === 'object'
    ? value.deviceShared as Record<string, unknown>
    : {};
  return {
    format: USER_BACKUP_FORMAT,
    version: USER_BACKUP_VERSION,
    userId: value.userId,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    entries,
    deviceShared: {
      legacyBookmarks: typeof shared.legacyBookmarks === 'string' ? shared.legacyBookmarks : null,
    },
  };
}

export function restoreUserDataBackup(
  backup: UserDataBackup,
  currentUserId: string,
  restoreLegacyBookmarks = false,
  storage: Storage = localStorage,
): RestoreResult {
  if (backup.userId !== currentUserId) {
    throw new Error('This backup belongs to a different account. Sign in with the original account before restoring it.');
  }

  const prefix = `u:${currentUserId}:`;
  const staged = new Map<string, { value: string; kind: 'restored' | 'merged' }>();
  let skipped = 0;

  for (const [key, incoming] of Object.entries(backup.entries)) {
    if (!key.startsWith(prefix)) throw new Error('A foreign-account key was found in the backup.');
    const current = storage.getItem(key);
    if (current === null) {
      staged.set(key, { value: incoming, kind: 'restored' });
      continue;
    }
    if (current === incoming) {
      skipped += 1;
      continue;
    }
    const merged = mergeEntry(key, current, incoming);
    if (merged !== null && merged !== current) {
      staged.set(key, { value: merged, kind: 'merged' });
    } else {
      // Unknown or conflicting settings are never overwritten automatically.
      skipped += 1;
    }
  }

  let mergedBookmarks: string | null = null;
  if (restoreLegacyBookmarks && backup.deviceShared.legacyBookmarks) {
    const backupBookmarks = parseJson<Array<Record<string, unknown>>>(backup.deviceShared.legacyBookmarks);
    if (Array.isArray(backupBookmarks)) {
      const currentRaw = storage.getItem(LEGACY_BOOKMARKS_KEY);
      const currentBookmarks = currentRaw ? parseJson<Array<Record<string, unknown>>>(currentRaw) : [];
      if (Array.isArray(currentBookmarks)) {
        const byQuestion = new Map<string, Record<string, unknown>>();
        for (const item of currentBookmarks) if (typeof item.questionId === 'string') byQuestion.set(item.questionId, item);
        for (const item of backupBookmarks) {
          if (typeof item.questionId !== 'string') continue;
          const existing = byQuestion.get(item.questionId);
          if (!existing || Number(item.createdAt) > Number(existing.createdAt)) byQuestion.set(item.questionId, item);
        }
        mergedBookmarks = JSON.stringify([...byQuestion.values()]);
      }
    }
  }

  const before = new Map<string, string | null>();
  try {
    for (const [key, item] of staged) {
      before.set(key, storage.getItem(key));
      storage.setItem(key, item.value);
    }
    if (mergedBookmarks !== null) {
      before.set(LEGACY_BOOKMARKS_KEY, storage.getItem(LEGACY_BOOKMARKS_KEY));
      storage.setItem(LEGACY_BOOKMARKS_KEY, mergedBookmarks);
    }
  } catch (error) {
    for (const [key, value] of [...before.entries()].reverse()) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        // Continue attempting rollback for every key.
      }
    }
    console.error('Backup restore storage failure; rollback was attempted.', error);
    throw new Error('The device could not finish restoring the backup. Existing local values were kept wherever storage allowed rollback.');
  }

  return {
    restored: [...staged.values()].filter(item => item.kind === 'restored').length,
    merged: [...staged.values()].filter(item => item.kind === 'merged').length,
    skipped: skipped + (restoreLegacyBookmarks && backup.deviceShared.legacyBookmarks && mergedBookmarks === null ? 1 : 0),
  };
}
