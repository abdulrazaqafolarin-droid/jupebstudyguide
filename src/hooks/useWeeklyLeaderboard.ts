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

    const { data: scores, error: scoresErr } = await supabase
      .from("score_events")
      .select("user_id, amount")
      .gte("created_at", start)
      .lt("created_at", end);

    if (scoresErr) {
      console.error("Failed to fetch score_events:", scoresErr);
      anyError = "Failed to load scores";
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

    const userIds = sorted.map(([id]) => id);

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

    const rows: WeeklyLeaderboardRow[] = sorted.map(([user_id, week_score], i) => {
      const prof = profileMap.get(user_id);
      return {
        user_id,
        week_score,
        event_count: countMap.get(user_id) ?? 0,
        display_name: prof?.display_name || user_id.slice(0, 8),
        avatar_url: prof?.avatar_url ?? null,
        achievements: prof?.achievements ?? [],
        rank: i + 1,
      };
    });

    let myRank: { rank: number; score: number } | null = null;
    if (userId) {
      const found = rows.find((r) => r.user_id === userId);
      if (found) {
        myRank = { rank: found.rank, score: found.week_score };
      } else {
        myRank = { rank: rows.length + 1, score: 0 };
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
    intervalRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("score_events_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "score_events" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return state;
}
