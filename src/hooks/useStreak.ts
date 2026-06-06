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

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function useStreak() {
  const [streakData, setStreakData] = useUserStorage<StreakData>('streak', INITIAL);

  // If the streak is stale (missed > 1 day), reset on load.
  useEffect(() => {
    if (!streakData.lastStudyDate || streakData.currentStreak === 0) return;
    const lastDate = parseLocalDateStr(streakData.lastStudyDate);
    const today = new Date();
    const todayStart = parseLocalDateStr(toLocalDateStr(today));
    const daysDiff = Math.floor((todayStart.getTime() - lastDate.getTime()) / 86_400_000);
    if (daysDiff > 1) {
      setStreakData(prev => ({ ...prev, currentStreak: 0 }));
    }
  }, [streakData.lastStudyDate, streakData.currentStreak, setStreakData]);

  const recordStudySession = useCallback((questionsAnswered: number = 1) => {
    setStreakData(prev => {
      const todayStr = toLocalDateStr(new Date());
      const todayStart = parseLocalDateStr(todayStr);

      const lastDate = prev.lastStudyDate ? parseLocalDateStr(prev.lastStudyDate) : null;
      let newStreak = prev.currentStreak;
      let newTotalDays = prev.totalDaysStudied;

      if (lastDate) {
        const lastDateStr = toLocalDateStr(lastDate);

        if (lastDateStr !== todayStr) {
          const daysDiff = Math.floor((todayStart.getTime() - lastDate.getTime()) / 86_400_000);
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
    return streakData.lastStudyDate === toLocalDateStr(new Date());
  }, [streakData.lastStudyDate]);

  return {
    ...streakData,
    recordStudySession,
    hasStudiedToday,
  };
}
