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
  return { ...progress, [topicId]: { state, updatedAt } };
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
