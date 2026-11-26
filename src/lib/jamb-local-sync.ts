export interface JambSavedAnswerSync {
  selected: string;
  savedAt: number;
}

export interface RemoteJambProgressSync {
  questionId: string;
  selected: string | null;
  savedAt: number;
}

export function reconcileJambProgress(
  local: Record<string, JambSavedAnswerSync>,
  remoteRows: RemoteJambProgressSync[],
): {
  merged: Record<string, JambSavedAnswerSync>;
  pendingUpserts: Array<[string, JambSavedAnswerSync]>;
} {
  const remoteById = new Map(remoteRows.map((row) => [row.questionId, row]));
  const merged = { ...local };

  for (const row of remoteRows) {
    if (!row.selected) continue;
    const savedAt = Number.isFinite(row.savedAt) ? row.savedAt : 0;
    const remote = { selected: row.selected, savedAt };
    const localAnswer = merged[row.questionId];
    if (!localAnswer || savedAt > localAnswer.savedAt) {
      merged[row.questionId] = remote;
    }
  }

  const pendingUpserts = Object.entries(merged).filter(([questionId, answer]) => {
    const remote = remoteById.get(questionId);
    if (!remote) return true;
    const remoteSavedAt = Number.isFinite(remote.savedAt) ? remote.savedAt : 0;
    // Local wins timestamp ties when values differ. That keeps a saved offline
    // answer from being silently replaced by an older or ambiguous cloud value.
    return answer.savedAt > remoteSavedAt ||
      (answer.savedAt === remoteSavedAt && answer.selected !== remote.selected);
  });

  return { merged, pendingUpserts };
}

export function reconcileJambBookmarks(
  localIds: string[],
  remoteIds: string[],
  deletedIds: string[],
): {
  merged: string[];
  remoteToDelete: string[];
  localToUpsert: string[];
} {
  const deleted = new Set(deletedIds);
  const remote = new Set(remoteIds);
  const merged = [...new Set([...localIds, ...remoteIds])]
    .filter((id) => !deleted.has(id));

  return {
    merged,
    remoteToDelete: [...remote].filter((id) => deleted.has(id)),
    localToUpsert: merged.filter((id) => !remote.has(id)),
  };
}
