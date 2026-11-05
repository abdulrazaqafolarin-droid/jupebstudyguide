import type { Subject } from '@/types/question';
import type { StoredStudySession, StoredSyllabus } from '@/types/syllabus';

const TOTAL_DAYS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Convert the previous single-plan localStorage record into the current
 * multi-session shape without deleting or mutating the source record.
 */
export function createLegacyStudySession(
  value: unknown,
  id: string,
  now: string,
): StoredStudySession | null {
  if (!isRecord(value) || !Array.isArray(value.dailyTasks) || !isRecord(value.combination)) {
    return null;
  }

  const allowedSubjects: Subject[] = ['physics', 'chemistry', 'biology', 'math'];
  const rawCore = Array.isArray(value.combination.core) ? value.combination.core : [];
  const rawElective = Array.isArray(value.combination.elective) ? value.combination.elective : [];
  const subjects = [...rawCore, ...rawElective].filter((subject, index, all): subject is Subject =>
    typeof subject === 'string'
      && allowedSubjects.includes(subject as Subject)
      && all.indexOf(subject) === index
  );

  if (subjects.length === 0) return null;

  const startedAt = typeof value.startedAt === 'string' && !Number.isNaN(Date.parse(value.startedAt))
    ? value.startedAt
    : now;

  return {
    id,
    name: subjects.map(subject => subject.charAt(0).toUpperCase() + subject.slice(1)).join(' + ') + ' Plan',
    subjects,
    status: Number(value.currentDay) > TOTAL_DAYS ? 'completed' : 'active',
    progress: value as unknown as StoredSyllabus,
    startDate: startedAt.split('T')[0],
    dailyGoalMinutes: 30,
    createdAt: startedAt,
    updatedAt: now,
  };
}

/** Compare stored legacy progress independent of JSON object-key order. */
export function areLegacyProgressEquivalent(left: unknown, right: unknown): boolean {
  const stableSerialize = (value: unknown): string => {
    if (Array.isArray(value)) {
      return `[${value.map(stableSerialize).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      const keys = Object.keys(object).sort();
      return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  };

  return stableSerialize(left) === stableSerialize(right);
}
