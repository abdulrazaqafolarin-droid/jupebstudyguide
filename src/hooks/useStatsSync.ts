import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SyllabusProgress } from '@/types/syllabus';

interface SyncInput {
  currentStreak: number;
  achievementsCount: number;
  syllabus: SyllabusProgress | null;
  isReady: boolean;
}

/**
 * Syncs user stats only after the account's profile, local streak and cloud-
 * restored study sessions have loaded. Failed writes remain retryable.
 */
export function useStatsSync({
  currentStreak,
  achievementsCount,
  syllabus,
  isReady,
}: SyncInput) {
  const { user } = useAuth();
  const lastSuccessfulHash = useRef<string>('');
  const pendingHash = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isReady) return;

    const completed = syllabus?.dailyTasks.filter(t => t.isCompleted) ?? [];
    const syllabusCompletedDays = completed.length;
    const masteryAvg = completed.length
      ? completed.reduce((sum, task) => sum + (task.masteryScore ?? 0), 0) / completed.length
      : 0;

    const hash = [
      user.id,
      currentStreak,
      syllabusCompletedDays,
      achievementsCount,
      masteryAvg.toFixed(2),
    ].join('|');
    if (hash === lastSuccessfulHash.current || hash === pendingHash.current) return;

    pendingHash.current = hash;
    const timeout = window.setTimeout(async () => {
      const { error } = await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: user.id,
            streak_days: currentStreak,
            syllabus_completed_days: syllabusCompletedDays,
            achievements_count: achievementsCount,
            mastery_avg: Number(masteryAvg.toFixed(2)),
          },
          { onConflict: 'user_id' },
        );

      if (pendingHash.current === hash) pendingHash.current = null;
      if (error) {
        console.error('Stats sync failed; a later state change can retry.', error);
        return;
      }
      lastSuccessfulHash.current = hash;
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      if (pendingHash.current === hash) pendingHash.current = null;
    };
  }, [user, isReady, currentStreak, achievementsCount, syllabus]);
}
