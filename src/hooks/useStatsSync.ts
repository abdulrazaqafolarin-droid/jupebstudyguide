import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SyllabusProgress } from '@/types/syllabus';

interface SyncInput {
  currentStreak: number;
  achievementsCount: number;
  syllabus: SyllabusProgress | null;
}

/**
 * Syncs user stats to user_stats table for profile display.
 * Score tracking is now handled by useScoreAwarder + score_events table.
 * This only syncs metadata (streak, syllabus progress, achievements).
 */
export function useStatsSync({ currentStreak, achievementsCount, syllabus }: SyncInput) {
  const { user } = useAuth();
  const lastHash = useRef<string>('');

  useEffect(() => {
    if (!user) return;
    const completed = syllabus?.dailyTasks.filter(t => t.isCompleted) ?? [];
    const syllabusCompletedDays = completed.length;
    const masteryAvg = completed.length
      ? completed.reduce((s, t) => s + (t.masteryScore ?? 0), 0) / completed.length
      : 0;

    const hash = `${currentStreak}|${syllabusCompletedDays}|${achievementsCount}|${masteryAvg.toFixed(2)}`;
    if (hash === lastHash.current) return;
    lastHash.current = hash;

    const t = setTimeout(() => {
      supabase
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
        )
        .then(({ error }) => { if (error) console.error('stats sync', error); });
    }, 600);
    return () => clearTimeout(t);
  }, [user, currentStreak, achievementsCount, syllabus]);
}
