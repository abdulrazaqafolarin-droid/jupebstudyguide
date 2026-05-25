import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart, getWeekEnd } from '@/lib/weekBoundary';

export interface LeaderboardRow {
  user_id: string;
  week_score: number;
  event_count: number;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
  achievements: string[];
}

/**
 * Fetches top N users by weekly score from score_events.
 * Subscribes to realtime INSERTs on score_events for live updates.
 */
export function useLeaderboard(limit = 5) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();

      // Aggregate scores from score_events for this week
      const { data: scores } = await supabase
        .from('score_events')
        .select('user_id, amount')
        .gte('created_at', weekStart)
        .lt('created_at', weekEnd);

      if (cancelled) return;

      // Aggregate by user
      const scoreMap = new Map<string, number>();
      const countMap = new Map<string, number>();
      for (const s of scores ?? []) {
        scoreMap.set(s.user_id, (scoreMap.get(s.user_id) ?? 0) + s.amount);
        countMap.set(s.user_id, (countMap.get(s.user_id) ?? 0) + 1);
      }

      // Sort descending by score
      const sorted = [...scoreMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      const ids = sorted.map(([id]) => id);

      // Fetch profiles
      const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; achievements: string[] }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, achievements')
          .in('user_id', ids);
        for (const p of profs ?? []) {
          profileMap.set(p.user_id, {
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            achievements: Array.isArray(p.achievements) ? p.achievements : [],
          });
        }
      }

      if (cancelled) return;
      setRows(
        sorted.map(([user_id, week_score], i) => ({
          user_id,
          week_score,
          event_count: countMap.get(user_id) ?? 0,
          display_name: profileMap.get(user_id)?.display_name ?? null,
          avatar_url: profileMap.get(user_id)?.avatar_url ?? null,
          achievements: profileMap.get(user_id)?.achievements ?? [],
          rank: i + 1,
        }))
      );
      setLoading(false);
    };

    fetchAll();

    // Realtime subscription with 500ms debounce
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel('leaderboard_home')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_events' }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchAll(), 500);
      })
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { rows, loading };
}
