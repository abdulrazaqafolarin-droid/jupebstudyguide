import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SyllabusProgress } from '@/types/syllabus';
import { mergeUserStatsForSync } from '@/lib/user-stats-sync';

interface SyncInput {
  currentStreak: number;
  achievementsCount: number;
  syllabus: SyllabusProgress | null;
  isReady: boolean;
}

/**
 * Syncs aggregates only after cloud study sessions have been restored.
 * It reads the existing row before writing and never lowers an existing cloud
 * aggregate when a fresh/partial local store reports a smaller value.
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
      const { data: cloudStats, error: readError } = await supabase
        .from('user_stats')
        .select('streak_days, syllabus_completed_days, achievements_count, mastery_avg')
        .eq('user_id', user.id)
        .maybeSingle();

      if (readError) {
        if (pendingHash.current === hash) pendingHash.current = null;
        console.error('Could not read saved cloud stats; no replacement write was attempted.', readError);
        return;
      }

      const merged = mergeUserStatsForSync(
        {
          streakDays: currentStreak,
          syllabusCompletedDays,
          achievementsCount,
          masteryAverage: masteryAvg,
        },
        cloudStats,
      );

      const { error } = await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: user.id,
            streak_days: merged.streak_days,
            syllabus_completed_days: merged.syllabus_completed_days,
            achievements_count: merged.achievements_count,
            mastery_avg: merged.mastery_avg,
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
