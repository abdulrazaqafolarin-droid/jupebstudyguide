import { useEffect, useState, useCallback, useRef } from 'react';
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

export function useLeaderboard(limit = 5) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchAll = useCallback(async () => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const { data: scores, error: scoresErr } = await supabase
      .from('score_events')
      .select('user_id, amount')
      .gte('created_at', weekStart)
      .lt('created_at', weekEnd);

    if (scoresErr) {
      console.error("Leaderboard score_events query:", scoresErr);
      setError("Failed to load scores: " + scoresErr.message);
      setLoading(false);
      return;
    }

    const scoreMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const s of scores ?? []) {
      scoreMap.set(s.user_id, (scoreMap.get(s.user_id) ?? 0) + s.amount);
      countMap.set(s.user_id, (countMap.get(s.user_id) ?? 0) + 1);
    }

    const sorted = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const ids = sorted.map(([id]) => id);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; achievements: string[] }>();
    if (ids.length > 0) {
      const { data: profs, error: profsErr } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, achievements')
        .in('user_id', ids);
      if (profsErr) {
        console.error("Leaderboard profiles query:", profsErr);
      }
      for (const p of profs ?? []) {
        profileMap.set(p.user_id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          achievements: Array.isArray(p.achievements) ? p.achievements : [],
        });
      }
    }

    setRows(
      sorted.map(([user_id, week_score], i) => ({
        user_id,
        week_score,
        event_count: countMap.get(user_id) ?? 0,
        display_name: profileMap.get(user_id)?.display_name || user_id.slice(0, 8),
        avatar_url: profileMap.get(user_id)?.avatar_url ?? null,
        achievements: profileMap.get(user_id)?.achievements ?? [],
        rank: i + 1,
      }))
    );
    setError(null);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel('leaderboard_home')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_events' }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchAll(), 500);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { rows, loading, error, refresh: fetchAll };
}
