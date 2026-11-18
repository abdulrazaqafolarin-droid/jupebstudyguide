import { useCallback } from "react";
import { useUserStorage } from "@/hooks/useUserStorage";
import {
  getJambTopicState,
  setJambTopicState,
  summarizeJambSyllabusProgress,
  type JambSyllabusProgressMap,
  type JambSyllabusTopicState,
} from "@/lib/jamb-syllabus-progress";

/** Per-account JAMB syllabus progress. It never reads or writes JUPEB syllabus keys. */
export function useJambSyllabusProgress() {
  const [progress, setProgress, { isReady, reset }] = useUserStorage<JambSyllabusProgressMap>(
    "jamb-syllabus-progress-v1",
    {},
  );

  const setTopicState = useCallback((topicId: string, state: JambSyllabusTopicState) => {
    if (!isReady) return;
    setProgress((previous) => setJambTopicState(previous, topicId, state));
  }, [isReady, setProgress]);

  const getTopicState = useCallback((topicId: string) => (
    getJambTopicState(progress, topicId)
  ), [progress]);

  const getSummary = useCallback((topicIds: string[]) => (
    summarizeJambSyllabusProgress(topicIds, progress)
  ), [progress]);

  return { progress, setTopicState, getTopicState, getSummary, isReady, reset };
}
