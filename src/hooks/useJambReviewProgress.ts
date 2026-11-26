import { useCallback } from "react";
import { useUserStorage } from "@/hooks/useUserStorage";
import {
  getJambDueQuestionIds,
  getJambReviewStats,
  scheduleJambReview,
  type JambReviewProgress,
  type JambReviewQuality,
} from "@/lib/jamb-review";

/**
 * Per-account, device-local spaced repetition for the JAMB question bank.
 * The storage key is deliberately separate from JUPEB's study-progress.
 */
export function useJambReviewProgress() {
  const [progress, setProgress, { isReady, reset }] = useUserStorage<Record<string, JambReviewProgress>>(
    "jamb-review-progress",
    {},
  );

  const rateQuestion = useCallback((questionId: string, quality: JambReviewQuality) => {
    if (!isReady || !questionId) return;
    setProgress((previous) => ({
      ...previous,
      [questionId]: scheduleJambReview(questionId, previous[questionId], quality),
    }));
  }, [isReady, setProgress]);

  const dueQuestionIds = useCallback((questionIds: string[], now = Date.now()) =>
    getJambDueQuestionIds(questionIds, progress, now), [progress]);

  const getStats = useCallback((questionIds: string[], now = Date.now()) =>
    getJambReviewStats(questionIds, progress, now), [progress]);

  return { progress, rateQuestion, dueQuestionIds, getStats, isReady, reset };
}
