import { useState, useEffect, useCallback } from 'react';
import { StudyProgress, Question } from '@/types/question';
import { useUserStorage } from './useUserStorage';

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

type StoredProgress = Record<string, Omit<StudyProgress, 'lastReviewed' | 'nextReview'> & {
  lastReviewed: string;
  nextReview: string;
}>;

export const useStudyProgress = () => {
  const [stored, setStored, { isReady, reset: resetStorage }] = useUserStorage<StoredProgress>(
    'study-progress',
    {},
  );

  // Hydrate Date objects for consumers.
  const [progress, setProgress] = useState<Record<string, StudyProgress>>({});

  useEffect(() => {
    const hydrated: Record<string, StudyProgress> = {};
    for (const k in stored) {
      hydrated[k] = {
        ...stored[k],
        lastReviewed: new Date(stored[k].lastReviewed),
        nextReview: new Date(stored[k].nextReview),
      };
    }
    setProgress(hydrated);
  }, [stored]);

  const persist = useCallback(
    (next: Record<string, StudyProgress>) => {
      const serialized: StoredProgress = {};
      for (const k in next) {
        serialized[k] = {
          ...next[k],
          lastReviewed: next[k].lastReviewed.toISOString(),
          nextReview: next[k].nextReview.toISOString(),
        };
      }
      setStored(serialized);
    },
    [setStored],
  );

  const updateProgress = useCallback((questionId: string, quality: number) => {
    setProgress(prev => {
      const existing = prev[questionId];
      const now = new Date();
      let newProgress: StudyProgress;

      if (!existing) {
        const interval = quality >= 3 ? 1 : 0;
        newProgress = {
          questionId,
          lastReviewed: now,
          nextReview: new Date(now.getTime() + interval * 86_400_000),
          repetitions: quality >= 3 ? 1 : 0,
          easeFactor: INITIAL_EASE_FACTOR,
          interval,
          isLearned: false,
        };
      } else {
        let { repetitions, easeFactor, interval } = existing;

        if (quality < 3) {
          repetitions = 0;
          interval = 0;
        } else {
          if (repetitions === 0) interval = 1;
          else if (repetitions === 1) interval = 6;
          else interval = Math.round(interval * easeFactor);
          repetitions += 1;
        }

        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

        newProgress = {
          questionId,
          lastReviewed: now,
          nextReview: new Date(now.getTime() + interval * 86_400_000),
          repetitions,
          easeFactor,
          interval,
          isLearned: repetitions >= 3 && interval >= 7,
        };
      }

      const next = { ...prev, [questionId]: newProgress };
      persist(next);
      return next;
    });
  }, [persist]);

  const getDueQuestions = useCallback(<T extends Pick<Question, 'id'>>(questions: T[]): T[] => {
    const now = new Date();
    return questions.filter(q => {
      const p = progress[q.id];
      if (!p) return true;
      return p.nextReview <= now;
    });
  }, [progress]);

  const getStats = useCallback((questions: Pick<Question, 'id'>[]) => {
    const total = questions.length;
    const studied = questions.filter(q => progress[q.id]).length;
    const learned = questions.filter(q => progress[q.id]?.isLearned).length;
    const dueToday = getDueQuestions(questions).length;
    return {
      total,
      studied,
      learned,
      dueToday,
      studiedPercentage: total > 0 ? (studied / total) * 100 : 0,
      learnedPercentage: total > 0 ? (learned / total) * 100 : 0,
    };
  }, [progress, getDueQuestions]);

  const getQuestionProgress = useCallback(
    (questionId: string): StudyProgress | undefined => progress[questionId],
    [progress],
  );

  const resetProgress = useCallback(() => {
    resetStorage();
    setProgress({});
  }, [resetStorage]);

  return {
    progress,
    updateProgress,
    getDueQuestions,
    getStats,
    getQuestionProgress,
    resetProgress,
    isLoaded: isReady,
  };
};
