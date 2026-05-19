import { useEffect, useCallback } from 'react';
import { useUserStorage } from './useUserStorage';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  totalDaysStudied: number;
  totalQuestionsAnswered: number;
}

const INITIAL: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  totalDaysStudied: 0,
  totalQuestionsAnswered: 0,
};

export function useStreak() {
  const [streakData, setStreakData] = useUserStorage<StreakData>('streak', INITIAL);

  // If the streak is stale (missed > 1 day), reset on load.
  useEffect(() => {
    if (!streakData.lastStudyDate || streakData.currentStreak === 0) return;
    const lastDate = new Date(streakData.lastStudyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000);
    if (daysDiff > 1) {
      setStreakData(prev => ({ ...prev, currentStreak: 0 }));
    }
  }, [streakData.lastStudyDate, streakData.currentStreak, setStreakData]);

  const recordStudySession = useCallback((questionsAnswered: number = 1) => {
    setStreakData(prev => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const lastDate = prev.lastStudyDate ? new Date(prev.lastStudyDate) : null;
      let newStreak = prev.currentStreak;
      let newTotalDays = prev.totalDaysStudied;

      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
        const lastDateStr = lastDate.toISOString().split('T')[0];

        if (lastDateStr !== todayStr) {
          const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000);
          if (daysDiff === 1) newStreak = prev.currentStreak + 1;
          else if (daysDiff > 1) newStreak = 1;
          newTotalDays = prev.totalDaysStudied + 1;
        }
      } else {
        newStreak = 1;
        newTotalDays = 1;
      }

      return {
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastStudyDate: todayStr,
        totalDaysStudied: newTotalDays,
        totalQuestionsAnswered: prev.totalQuestionsAnswered + questionsAnswered,
      };
    });
  }, [setStreakData]);

  const hasStudiedToday = useCallback(() => {
    if (!streakData.lastStudyDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return streakData.lastStudyDate === today.toISOString().split('T')[0];
  }, [streakData.lastStudyDate]);

  return {
    ...streakData,
    recordStudySession,
    hasStudiedToday,
  };
}
