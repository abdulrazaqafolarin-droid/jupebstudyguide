export interface JambReviewProgress {
  questionId: string;
  lastReviewedAt: number;
  nextReviewAt: number;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface JambReviewStats {
  total: number;
  studied: number;
  mastered: number;
  due: number;
}

export type JambReviewQuality = 1 | 2 | 3 | 4 | 5;

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const AGAIN_DELAY_MS = 10 * 60 * 1000;

function clampQuality(quality: number): JambReviewQuality {
  if (!Number.isInteger(quality) || quality < 1 || quality > 5) {
    throw new RangeError("Review quality must be an integer from 1 to 5.");
  }
  return quality as JambReviewQuality;
}

/** Schedule a JAMB question after a learner rates how well they recalled it. */
export function scheduleJambReview(
  questionId: string,
  existing: JambReviewProgress | undefined,
  qualityInput: number,
  reviewedAt = Date.now(),
): JambReviewProgress {
  if (!questionId.trim()) throw new Error("A question ID is required.");
  if (!Number.isFinite(reviewedAt) || reviewedAt < 0) throw new RangeError("Review time must be a valid timestamp.");

  const quality = clampQuality(qualityInput);
  const oldRepetitions = existing?.repetitions ?? 0;
  const oldInterval = existing?.intervalDays ?? 0;
  let easeFactor = existing?.easeFactor ?? INITIAL_EASE_FACTOR;
  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 0;
  } else {
    repetitions = oldRepetitions + 1;
    if (oldRepetitions === 0) intervalDays = quality === 3 ? 1 : quality === 4 ? 2 : 4;
    else if (oldRepetitions === 1) intervalDays = quality === 3 ? 3 : quality === 4 ? 5 : 7;
    else {
      const qualityMultiplier = quality === 3 ? 0.8 : quality === 4 ? 1 : 1.3;
      intervalDays = Math.max(1, Math.round(oldInterval * easeFactor * qualityMultiplier));
    }
  }

  easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);

  return {
    questionId,
    lastReviewedAt: reviewedAt,
    nextReviewAt: reviewedAt + (quality < 3 ? AGAIN_DELAY_MS : intervalDays * 86_400_000),
    repetitions,
    intervalDays,
    easeFactor,
  };
}

/** Unseen questions are due; reviewed questions are due once their date arrives. */
export function getJambDueQuestionIds(
  questionIds: string[],
  progress: Record<string, JambReviewProgress>,
  now = Date.now(),
): string[] {
  return questionIds
    .filter((id) => {
      const item = progress[id];
      return !item || item.nextReviewAt <= now;
    })
    .sort((a, b) => (progress[a]?.nextReviewAt ?? 0) - (progress[b]?.nextReviewAt ?? 0));
}

export function getJambReviewStats(
  questionIds: string[],
  progress: Record<string, JambReviewProgress>,
  now = Date.now(),
): JambReviewStats {
  const uniqueIds = [...new Set(questionIds)];
  return {
    total: uniqueIds.length,
    studied: uniqueIds.filter((id) => Boolean(progress[id])).length,
    mastered: uniqueIds.filter((id) => {
      const item = progress[id];
      return Boolean(item && item.repetitions >= 3 && item.intervalDays >= 7);
    }).length,
    due: getJambDueQuestionIds(uniqueIds, progress, now).length,
  };
}
