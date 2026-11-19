import type { JambSyllabusSubjectId } from "@/lib/jamb-syllabus";

export type JambSyllabusTopicState = "not_started" | "in_progress" | "completed";

export interface JambSyllabusTopicProgress {
  state: JambSyllabusTopicState;
  updatedAt: number;
}

export type JambSyllabusProgressMap = Record<string, JambSyllabusTopicProgress>;

export interface JambSyllabusProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
}

export function setJambTopicState(
  progress: JambSyllabusProgressMap,
  topicId: string,
  state: JambSyllabusTopicState,
  updatedAt = Date.now(),
): JambSyllabusProgressMap {
  if (!topicId.trim()) return progress;
  const previousTimestamp = progress[topicId]?.updatedAt ?? 0;
  return {
    ...progress,
    [topicId]: { state, updatedAt: Math.max(updatedAt, previousTimestamp + 1) },
  };
}

export function getJambTopicState(
  progress: JambSyllabusProgressMap,
  topicId: string,
): JambSyllabusTopicState {
  return progress[topicId]?.state ?? "not_started";
}

export function summarizeJambSyllabusProgress(
  topicIds: string[],
  progress: JambSyllabusProgressMap,
): JambSyllabusProgressSummary {
  const uniqueIds = [...new Set(topicIds)];
  let completed = 0;
  let inProgress = 0;
  for (const id of uniqueIds) {
    const state = getJambTopicState(progress, id);
    if (state === "completed") completed += 1;
    else if (state === "in_progress") inProgress += 1;
  }
  const total = uniqueIds.length;
  return {
    total,
    completed,
    inProgress,
    notStarted: total - completed - inProgress,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getJambSubjectTopicIds(
  subjectId: JambSyllabusSubjectId,
  subjects: Record<string, { sections: Array<{ topics: Array<{ id: string }> }> }>,
): string[] {
  const subject = subjects[subjectId];
  return subject?.sections.flatMap((section) => section.topics.map((topic) => topic.id)) ?? [];
}

/**
 * Topic IDs removed by official syllabus restructuring are mapped to the
 * surviving topic so existing progress is never silently orphaned.
 */
export const JAMB_LEGACY_TOPIC_ID_MAP: Record<string, string> = {
  "bio-d-03-biotechnology": "bio-d-02-heredity",
};

export function migrateJambLegacyTopicProgress(
  progress: JambSyllabusProgressMap,
): { progress: JambSyllabusProgressMap; migratedIds: string[] } {
  const next = { ...progress };
  const migratedIds: string[] = [];
  const stateRank: Record<JambSyllabusTopicState, number> = {
    not_started: 0,
    in_progress: 1,
    completed: 2,
  };

  for (const [legacyId, currentId] of Object.entries(JAMB_LEGACY_TOPIC_ID_MAP)) {
    const legacyEntry = next[legacyId];
    if (!legacyEntry) continue;
    const currentEntry = next[currentId];
    const legacyWins = !currentEntry
      || legacyEntry.updatedAt > currentEntry.updatedAt
      || (
        legacyEntry.updatedAt === currentEntry.updatedAt
        && stateRank[legacyEntry.state] > stateRank[currentEntry.state]
      );
    if (legacyWins) next[currentId] = legacyEntry;
    delete next[legacyId];
    migratedIds.push(legacyId);
  }
  return { progress: next, migratedIds };
}

/** Merge local/cloud progress while normalizing retired topic IDs on both sides. */
export function reconcileJambSyllabusProgress(
  local: JambSyllabusProgressMap,
  remote: JambSyllabusProgressMap,
): {
  merged: JambSyllabusProgressMap;
  pendingUpserts: Array<[string, JambSyllabusTopicProgress]>;
  pendingDeletes: string[];
} {
  const localMigration = migrateJambLegacyTopicProgress(local);
  const remoteMigration = migrateJambLegacyTopicProgress(remote);
  const normalizedLocal = localMigration.progress;
  const normalizedRemote = remoteMigration.progress;
  const merged: JambSyllabusProgressMap = { ...normalizedRemote };
  const pendingUpserts: Array<[string, JambSyllabusTopicProgress]> = [];
  const stateRank: Record<JambSyllabusTopicState, number> = {
    not_started: 0,
    in_progress: 1,
    completed: 2,
  };

  for (const [topicId, localEntry] of Object.entries(normalizedLocal)) {
    const remoteEntry = normalizedRemote[topicId];
    const localWins = !remoteEntry
      || localEntry.updatedAt > remoteEntry.updatedAt
      || (
        localEntry.updatedAt === remoteEntry.updatedAt
        && stateRank[localEntry.state] > stateRank[remoteEntry.state]
      );
    if (localWins) {
      merged[topicId] = localEntry;
      pendingUpserts.push([topicId, localEntry]);
    }
  }

  // If a retired topic existed in the cloud, write the surviving topic row
  // before deleting the retired row, even where no local copy exists.
  for (const legacyId of remoteMigration.migratedIds) {
    const currentId = JAMB_LEGACY_TOPIC_ID_MAP[legacyId];
    const currentEntry = merged[currentId];
    if (currentEntry && !pendingUpserts.some(([id]) => id === currentId)) {
      pendingUpserts.push([currentId, currentEntry]);
    }
  }

  return {
    merged,
    pendingUpserts,
    pendingDeletes: remoteMigration.migratedIds,
  };
}
