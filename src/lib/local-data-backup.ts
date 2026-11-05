import type { StoredStudySession } from '@/types/syllabus';
import { deserializeProgress, serializeProgress } from '@/types/syllabus';
import { mergeStudySessions } from '@/lib/study-session-sync';

export const USER_BACKUP_FORMAT = 'jupeb-master-user-backup';
export const USER_BACKUP_VERSION = 1;
export const LEGACY_BOOKMARKS_KEY = 'jupeb_study_bookmarks';
export const USER_BOOKMARKS_KEY = 'study-bookmarks';
const LEGACY_USER_KEY_MAP: Record<string, string> = {
  'jupeb-study-progress': 'study-progress',
  jupeb_streak_data: 'streak',
  jupeb_achievements_unlocked: 'achievements-unlocked',
  jupeb_syllabus_progress: 'syllabus-progress',
};
export const LEGACY_DEVICE_DATA_KEYS = [
  LEGACY_BOOKMARKS_KEY,
  'jupeb-study-progress',
  'jupeb_streak_data',
  'jupeb_achievements_unlocked',
  'jupeb_syllabus_progress',
  'jupeb-chat-hub',
] as const;
const MAX_BACKUP_BYTES = 12 * 1024 * 1024;
const CREDENTIAL_KEY_PATTERN = /(token|secret|password|credential|api[-_]?key)/i;

export interface UserDataBackup {
  format: typeof USER_BACKUP_FORMAT;
  version: typeof USER_BACKUP_VERSION;
  userId: string;
  exportedAt: string;
  entries: Record<string, string>;
  deviceShared: {
    legacyBookmarks: string | null;
    legacyEntries: Record<string, string>;
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

const VALID_SUBJECTS = ['physics', 'chemistry', 'biology', 'math'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isValidSubjectList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(subject => typeof subject === 'string'
      && (VALID_SUBJECTS as readonly string[]).includes(subject));
}

function isValidStoredTopic(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.name === 'string'
    && typeof value.description === 'string'
    && Array.isArray(value.subtopics)
    && value.subtopics.every(item => typeof item === 'string')
    && ['beginner', 'intermediate', 'advanced'].includes(String(value.difficulty))
    && typeof value.estimatedHours === 'number'
    && Number.isFinite(value.estimatedHours)
    && value.estimatedHours >= 0;
}

function isValidStoredTask(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.day)
    && Number(value.day) > 0
    && typeof value.subject === 'string'
    && (VALID_SUBJECTS as readonly string[]).includes(value.subject)
    && Array.isArray(value.topics)
    && value.topics.every(isValidStoredTopic)
    && Array.isArray(value.learningObjectives)
    && value.learningObjectives.every(item => typeof item === 'string')
    && Array.isArray(value.checkpointQuestions)
    && value.checkpointQuestions.every(item => typeof item === 'string')
    && typeof value.isCompleted === 'boolean'
    && (value.completedAt === undefined
      || (typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt))))
    && (value.masteryScore === undefined
      || (typeof value.masteryScore === 'number'
        && Number.isFinite(value.masteryScore)
        && value.masteryScore >= 0
        && value.masteryScore <= 100));
}

function isStoredSession(value: unknown): value is StoredStudySession {
  if (!isRecord(value)) return false;
  const session = value;
  const progress = session.progress;
  if (!isRecord(progress)) return false;

  const combination = progress.combination;
  const subjectProgress = progress.subjectProgress;
  return typeof session.id === 'string'
    && session.id.length > 0
    && typeof session.name === 'string'
    && isValidSubjectList(session.subjects)
    && ['active', 'paused', 'completed'].includes(String(session.status))
    && typeof session.createdAt === 'string'
    && Number.isFinite(Date.parse(session.createdAt))
    && typeof session.updatedAt === 'string'
    && Number.isFinite(Date.parse(session.updatedAt))
    && typeof session.startDate === 'string'
    && Number.isFinite(Date.parse(session.startDate))
    && typeof session.dailyGoalMinutes === 'number'
    && Number.isFinite(session.dailyGoalMinutes)
    && Number(session.dailyGoalMinutes) > 0
    && typeof progress.startedAt === 'string'
    && Number.isFinite(Date.parse(progress.startedAt))
    && Array.isArray(progress.dailyTasks)
    && progress.dailyTasks.every(isValidStoredTask)
    && typeof progress.currentDay === 'number'
    && Number.isFinite(progress.currentDay)
    && typeof progress.overallProgress === 'number'
    && Number.isFinite(progress.overallProgress)
    && isRecord(combination)
    && isValidSubjectList(combination.core)
    && isValidSubjectList(combination.elective)
    && isRecord(subjectProgress)
    && Object.entries(subjectProgress).every(([subject, item]) =>
      (VALID_SUBJECTS as readonly string[]).includes(subject)
      && typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 100)
    && (progress.lastStudiedAt === undefined
      || (typeof progress.lastStudiedAt === 'string' && Number.isFinite(Date.parse(progress.lastStudiedAt))));
}

function isValidSyllabusProgress(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.combination) || !isRecord(value.subjectProgress)) return false;
  return isValidSubjectList(value.combination.core)
    && isValidSubjectList(value.combination.elective)
    && Number.isInteger(value.currentDay)
    && Number(value.currentDay) > 0
    && typeof value.startedAt === 'string'
    && Number.isFinite(Date.parse(value.startedAt))
    && (value.lastStudiedAt === undefined
      || (typeof value.lastStudiedAt === 'string' && Number.isFinite(Date.parse(value.lastStudiedAt))))
    && Array.isArray(value.dailyTasks)
    && value.dailyTasks.every(isValidStoredTask)
    && typeof value.overallProgress === 'number'
    && Number.isFinite(value.overallProgress)
    && value.overallProgress >= 0
    && value.overallProgress <= 100
    && Object.entries(value.subjectProgress).every(([subject, percent]) =>
      (VALID_SUBJECTS as readonly string[]).includes(subject)
      && typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100);
}

function isValidStudyProgressMap(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([questionId, entry]) => {
    if (!isRecord(entry)) return false;
    return typeof entry.questionId === 'string'
      && entry.questionId === questionId
      && typeof entry.lastReviewed === 'string'
      && Number.isFinite(Date.parse(entry.lastReviewed))
      && typeof entry.nextReview === 'string'
      && Number.isFinite(Date.parse(entry.nextReview))
      && typeof entry.repetitions === 'number'
      && Number.isInteger(entry.repetitions)
      && entry.repetitions >= 0
      && typeof entry.easeFactor === 'number'
      && Number.isFinite(entry.easeFactor)
      && entry.easeFactor >= 1.3
      && typeof entry.interval === 'number'
      && Number.isFinite(entry.interval)
      && entry.interval >= 0
      && typeof entry.isLearned === 'boolean';
  });
}

function isValidStreak(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const counters = ['currentStreak', 'longestStreak', 'totalDaysStudied', 'totalQuestionsAnswered'];
  return counters.every(key => typeof value[key] === 'number'
      && Number.isInteger(value[key]) && Number(value[key]) >= 0)
    && (value.lastStudyDate === null
      || (typeof value.lastStudyDate === 'string'
        && /^\\d{4}-\\d{2}-\\d{2}$/.test(value.lastStudyDate)
        && Number.isFinite(Date.parse(value.lastStudyDate))));
}

function isValidBookmarks(value: unknown): boolean {
  return Array.isArray(value) && value.every(item => isRecord(item)
    && typeof item.questionId === 'string'
    && item.questionId.length > 0
    && typeof item.createdAt === 'number'
    && Number.isFinite(item.createdAt)
    && (item.notes === undefined || typeof item.notes === 'string'));
}

function isValidKnownEntry(key: string, raw: string): boolean {
  const value = parseJson<unknown>(raw);
  if (value === null) return false;
  if (key.endsWith(':study-sessions')) {
    return Array.isArray(value) && value.every(isStoredSession);
  }
  if (key.endsWith(':study-progress')) return isValidStudyProgressMap(value);
  if (key.endsWith(':syllabus-progress')) return isValidSyllabusProgress(value);
  if (key.endsWith(':streak')) return isValidStreak(value);
  if (key.endsWith(':study-bookmarks')) return isValidBookmarks(value);
  if (key.endsWith(':achievements-unlocked') || key.startsWith('jupeb-hidden-msgs-')) {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
  }
  // Unknown user preferences and app-specific values are preserved as opaque
  // strings; they are never interpreted or overwritten when already present.
  return true;
}

function mergeStringArray(current: string, incoming: string): string | null {
  const a = parseJson<unknown[]>(current);
  const b = parseJson<unknown[]>(incoming);
  if (!Array.isArray(a) || !Array.isArray(b)
      || !a.every(value => typeof value === 'string')
      || !b.every(value => typeof value === 'string')) return null;
  return JSON.stringify([...new Set([...a, ...b])]);
}

function mergeSessions(current: string, incoming: string): string | null {
  const a = parseJson<unknown[]>(current);
  const b = parseJson<unknown[]>(incoming);
  if (!Array.isArray(a) || !Array.isArray(b)
      || !a.every(isStoredSession) || !b.every(isStoredSession)) return null;

  try {
    const hydrate = (sessions: StoredStudySession[]) => sessions.map(session => ({
      ...session,
      progress: deserializeProgress(session.progress),
    }));
    const merged = mergeStudySessions(hydrate(a), hydrate(b));
    return JSON.stringify(merged.map(session => ({
      ...session,
      progress: serializeProgress(session.progress),
    })));
  } catch {
    // Invalid legacy session data must never be used to overwrite a good copy.
    return null;
  }
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
  if (key.endsWith(':achievements-unlocked') || key.startsWith('jupeb-hidden-msgs-')) {
    return mergeStringArray(current, incoming);
  }
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
    if (CREDENTIAL_KEY_PATTERN.test(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }

  const legacyEntries: Record<string, string> = {};
  const legacyKeys = [...LEGACY_DEVICE_DATA_KEYS, `jupeb-hidden-msgs-${userId}`];
  for (const key of legacyKeys) {
    const value = storage.getItem(key);
    if (value !== null) legacyEntries[key] = value;
  }

  const backup: UserDataBackup = {
    format: USER_BACKUP_FORMAT,
    version: USER_BACKUP_VERSION,
    userId,
    exportedAt: new Date().toISOString(),
    entries,
    deviceShared: {
      // These keys predate per-account namespacing. Keep them in the backup,
      // but restore them only after an explicit user choice.
      legacyBookmarks: legacyEntries[LEGACY_BOOKMARKS_KEY] ?? null,
      legacyEntries,
    },
  };
  if (new Blob([JSON.stringify(backup)]).size > MAX_BACKUP_BYTES) {
    throw new Error('This device backup exceeds the 12 MiB restore limit. Export is stopped before creating an unusable backup.');
  }
  return backup;
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
    if (!key.startsWith(prefix) || typeof entry !== 'string'
        || CREDENTIAL_KEY_PATTERN.test(key)) {
      throw new Error('The backup contains an invalid, sensitive, or foreign-account storage key.');
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
      legacyEntries: (() => {
        const restored: Record<string, string> = {};
        const rawEntries = shared.legacyEntries;
        if (rawEntries && typeof rawEntries === 'object' && !Array.isArray(rawEntries)) {
          for (const [key, entry] of Object.entries(rawEntries as Record<string, unknown>)) {
            const allowed = (LEGACY_DEVICE_DATA_KEYS as readonly string[]).includes(key)
              || key === `jupeb-hidden-msgs-${value.userId}`;
            if (!allowed || typeof entry !== 'string') {
              throw new Error('The backup contains an invalid legacy device-data key.');
            }
            restored[key] = entry;
          }
        }
        return restored;
      })(),
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
    if (!key.startsWith(prefix) || CREDENTIAL_KEY_PATTERN.test(key)) {
      throw new Error('A foreign-account or credential-like key was found in the backup.');
    }
    if (!isValidKnownEntry(key, incoming)) {
      skipped += 1;
      continue;
    }
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

  let legacyBookmarkSkipped = 0;
  if (restoreLegacyBookmarks) {
    // Convert old device-global keys into the signed-in account namespace.
    // Never write these historical keys back globally: another account on the
    // same phone could otherwise read this student's restored learning data.
    for (const [legacyKey, value] of Object.entries(backup.deviceShared.legacyEntries)) {
      if (legacyKey === LEGACY_BOOKMARKS_KEY) continue;

      const mappedKey = LEGACY_USER_KEY_MAP[legacyKey];
      const targetKey = mappedKey
        ? `${prefix}${mappedKey}`
        : legacyKey === `jupeb-hidden-msgs-${currentUserId}`
          ? legacyKey
          : `${prefix}legacy-device-data:${legacyKey}`;

      if (!isValidKnownEntry(targetKey, value)) {
        skipped += 1;
        continue;
      }
      const current = storage.getItem(targetKey);
      if (current === null) {
        staged.set(targetKey, { value, kind: 'restored' });
      } else if (current === value) {
        skipped += 1;
      } else {
        const merged = mergeEntry(targetKey, current, value);
        if (merged !== null && merged !== current) {
          staged.set(targetKey, { value: merged, kind: 'merged' });
        } else {
          skipped += 1;
        }
      }
    }

    const rawBookmarks = backup.deviceShared.legacyEntries[LEGACY_BOOKMARKS_KEY]
      ?? backup.deviceShared.legacyBookmarks;
    if (rawBookmarks) {
      const backupBookmarks = parseJson<unknown>(rawBookmarks);
      const userBookmarksKey = `u:${currentUserId}:${USER_BOOKMARKS_KEY}`;
      const currentRaw = storage.getItem(userBookmarksKey);
      const currentBookmarks = currentRaw === null
        ? []
        : parseJson<unknown>(currentRaw);
      if (isValidBookmarks(backupBookmarks) && isValidBookmarks(currentBookmarks)) {
        const byQuestion = new Map<string, Record<string, unknown>>();
        for (const item of currentBookmarks) {
          if (typeof item.questionId === 'string') byQuestion.set(item.questionId, item);
        }
        for (const item of backupBookmarks) {
          if (typeof item.questionId !== 'string') continue;
          const existing = byQuestion.get(item.questionId);
          if (!existing || Number(item.createdAt) > Number(existing.createdAt)) {
            byQuestion.set(item.questionId, item);
          }
        }
        const merged = JSON.stringify([...byQuestion.values()]);
        staged.set(userBookmarksKey, {
          value: merged,
          kind: currentRaw === null ? 'restored' : 'merged',
        });
      } else {
        legacyBookmarkSkipped += 1;
      }
    }
  }

  // A restored legacy syllabus record must be reconsidered by the next
  // app launch. The first launch may already have marked an empty store as
  // checked before the backup file was imported.
  const restoredLegacySyllabus = staged.has(`${prefix}syllabus-progress`);
  if (restoredLegacySyllabus) {
    staged.set(`${prefix}study-sessions-legacy-migrated-v1`, {
      value: '0',
      kind: 'restored',
    });
  }

  const before = new Map<string, string | null>();
  try {
    for (const [key, item] of staged) {
      before.set(key, storage.getItem(key));
      storage.setItem(key, item.value);
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
    skipped: skipped + legacyBookmarkSkipped,
  };
}
