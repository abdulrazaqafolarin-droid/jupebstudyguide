import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getWeekStart } from '@/lib/weekBoundary';

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

    // Server-side aggregation via RPC (one bounded query instead of
    // downloading every score event of the week).
    const { data: board, error: boardErr } = await supabase.rpc(
      "get_weekly_leaderboard",
      { p_week_start: weekStart.slice(0, 10) }
    );

    if (boardErr) {
      console.error("Leaderboard RPC query:", boardErr);
      setError("Failed to load scores: " + boardErr.message);
      setLoading(false);
      return;
    }

    const sorted = (board ?? []).slice(0, limit);

    const ids = sorted.map((r) => r.user_id);

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
          achievements: (Array.isArray(p.achievements) ? p.achievements : []).filter((a): a is string => typeof a === 'string'),
        });
      }
    }

    setRows(
      sorted.map((r) => ({
        user_id: r.user_id,
        week_score: Number(r.week_score),
        event_count: Number(r.event_count),
        display_name: profileMap.get(r.user_id)?.display_name || r.display_name || r.user_id.slice(0, 8),
        avatar_url: profileMap.get(r.user_id)?.avatar_url ?? r.avatar_url ?? null,
        achievements: profileMap.get(r.user_id)?.achievements ?? [],
        rank: Number(r.rank),
      }))
    );
    setError(null);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  return { rows, loading, error, refresh: fetchAll };
}
