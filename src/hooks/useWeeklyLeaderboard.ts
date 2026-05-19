import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyLeaderboardRow {
  user_id: string;
  week_score: number;
  event_count: number;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
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
  currentWeekStart: string;
  currentWeekEnd: string;
  pastChampions: LeaderboardWeek[];
  myRank: { rank: number; score: number } | null;
}

function getWeekBoundaries(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

export function useWeeklyLeaderboard(userId?: string | null, limit = 100) {
  const [state, setState] = useState<WeeklyLeaderboardState>({
    rows: [],
    loading: true,
    currentWeekStart: getWeekBoundaries().start,
    currentWeekEnd: getWeekBoundaries().end,
    pastChampions: [],
    myRank: null,
  });

  const fetchData = useCallback(async () => {
    const { start, end } = getWeekBoundaries();

    // Fetch current week scores
    const { data: scores } = await supabase
      .from("score_events")
      .select("user_id, amount")
      .gte("created_at", start)
      .lt("created_at", end);

    // Aggregate by user
    const scoreMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const s of scores ?? []) {
      scoreMap.set(s.user_id, (scoreMap.get(s.user_id) ?? 0) + s.amount);
      countMap.set(s.user_id, (countMap.get(s.user_id) ?? 0) + 1);
    }

    // Sort by score descending
    const sorted = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const userIds = sorted.map(([id]) => id);

    // Fetch profiles
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      for (const p of profs ?? []) {
        profileMap.set(p.user_id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        });
      }
    }

    const rows: WeeklyLeaderboardRow[] = sorted.map(([user_id, week_score], i) => {
      const prof = profileMap.get(user_id);
      return {
        user_id,
        week_score,
        event_count: countMap.get(user_id) ?? 0,
        display_name: prof?.display_name ?? null,
        avatar_url: prof?.avatar_url ?? null,
        rank: i + 1,
      };
    });

    // Find my rank
    let myRank: { rank: number; score: number } | null = null;
    if (userId) {
      const found = rows.find((r) => r.user_id === userId);
      if (found) {
        myRank = { rank: found.rank, score: found.week_score };
      } else {
        // User has no score this week
        myRank = { rank: rows.length + 1, score: 0 };
      }
    }

    // Fetch past champions
    const { data: weeks } = await supabase
      .from("leaderboard_weeks")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(10);

    setState({
      rows,
      loading: false,
      currentWeekStart: start,
      currentWeekEnd: end,
      pastChampions: (weeks ?? []) as LeaderboardWeek[],
      myRank,
    });
  }, [userId, limit]);

  useEffect(() => {
    fetchData();

    // Realtime subscription for live updates
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
