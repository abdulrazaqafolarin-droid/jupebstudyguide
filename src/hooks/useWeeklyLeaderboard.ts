import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeekBoundaries } from "@/lib/weekBoundary";

export interface WeeklyLeaderboardRow {
  user_id: string;
  week_score: number;
  event_count: number;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
  achievements: string[];
}

export interface LeaderboardWeek {
  id: string;
  week_start: string;
  week_end: string;
  champion_user_id: string | null;
  champion_badge_awarded: boolean;
}

export interface WeeklyLeaderboardState {
  rows: WeeklyLeaderboardRow[];
  loading: boolean;
  error: string | null;
  currentWeekStart: string;
  currentWeekEnd: string;
  pastChampions: LeaderboardWeek[];
  myRank: { rank: number; score: number } | null;
}

export function useWeeklyLeaderboard(userId?: string | null, limit = 100) {
  const [state, setState] = useState<WeeklyLeaderboardState>({
    rows: [],
    loading: true,
    error: null,
    currentWeekStart: getWeekBoundaries().start,
    currentWeekEnd: getWeekBoundaries().end,
    pastChampions: [],
    myRank: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    const { start, end } = getWeekBoundaries();
    let anyError: string | null = null;

    // Server-side aggregation (one bounded query instead of downloading
    // every score event of the week).
    const { data: board, error: boardErr } = await supabase.rpc(
      "get_weekly_leaderboard",
      { p_week_start: start.slice(0, 10) }
    );

    if (boardErr) {
      console.error("Failed to fetch weekly leaderboard:", boardErr);
      setState((s) => ({ ...s, loading: false, error: "Failed to load scores" }));
      return;
    }

    const top = (board ?? []).slice(0, limit);
    const userIds = top.map((r) => r.user_id);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; achievements: string[] }>();
    if (userIds.length > 0) {
      const { data: profs, error: profsErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, achievements")
        .in("user_id", userIds);
      if (profsErr) {
        console.error("Failed to fetch profiles for leaderboard:", profsErr);
        anyError = anyError || "Failed to load user profiles";
      }
      for (const p of profs ?? []) {
        profileMap.set(p.user_id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          achievements: (Array.isArray(p.achievements) ? p.achievements : []).filter((a): a is string => typeof a === 'string'),
        });
      }
    }

    const rows: WeeklyLeaderboardRow[] = top.map((r) => {
      const prof = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        week_score: Number(r.week_score),
        event_count: Number(r.event_count),
        display_name: prof?.display_name || r.display_name || r.user_id.slice(0, 8),
        avatar_url: prof?.avatar_url ?? r.avatar_url ?? null,
        achievements: prof?.achievements ?? [],
        rank: Number(r.rank),
      };
    });

    let myRank: { rank: number; score: number } | null = null;
    if (userId) {
      const found = (board ?? []).find((r) => r.user_id === userId);
      if (found) {
        myRank = { rank: Number(found.rank), score: Number(found.week_score) };
      } else {
        myRank = { rank: (board ?? []).length + 1, score: 0 };
      }
    }

    const { data: weeks, error: weeksErr } = await supabase
      .from("leaderboard_weeks")
      .select("id, week_start, week_end, champion_user_id, champion_badge_awarded")
      .order("week_start", { ascending: false })
      .limit(10);

    if (weeksErr) {
      console.error("Failed to fetch leaderboard_weeks:", weeksErr);
      anyError = anyError || "Failed to load past champions";
    }

    setState({
      rows,
      loading: false,
      error: anyError,
      currentWeekStart: start,
      currentWeekEnd: end,
      pastChampions: (weeks ?? []) as LeaderboardWeek[],
      myRank,
    });
  }, [userId, limit]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  return state;
}
