import type { StudySessionData } from '@/types/syllabus';

/**
 * Merge local and cloud study sessions without dropping sessions found on
 * either side. When the same session exists on both sides, the copy with the
 * newest updatedAt timestamp wins. A tie intentionally favours local state,
 * because it may contain the most recent offline edits.
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
    if (!cloud || sessionTimestamp(session) >= sessionTimestamp(cloud)) {
      byId.set(session.id, session);
    }
  }

  return [...byId.values()];
}

function sessionTimestamp(session: StudySessionData): number {
  const updatedAt = Date.parse(session.updatedAt || session.createdAt || '');
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}
