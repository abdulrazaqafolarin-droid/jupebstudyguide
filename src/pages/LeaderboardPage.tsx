import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyLeaderboard, LeaderboardWeek } from "@/hooks/useWeeklyLeaderboard";
import WeeklyCountdown from "@/components/WeeklyCountdown";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Trophy, ArrowLeft, Crown, Loader2, TrendingUp,
  Timer, Award, Sparkles, Star, Medal
} from "lucide-react";
import { cn } from "@/lib/utils";

const MEDAL = ["🥇", "🥈", "🥉"];

function RankIcon({ rank, className }: { rank: number; className?: string }) {
  if (rank <= 3) {
    return <span className={cn("text-lg", className)}>{MEDAL[rank - 1]}</span>;
  }
  return (
    <span className={cn("w-6 text-center text-sm font-bold text-muted-foreground", className)}>
      {rank}
    </span>
  );
}

interface ChampionWithProfile extends LeaderboardWeek {
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { rows, loading, currentWeekStart, currentWeekEnd, pastChampions, myRank } =
    useWeeklyLeaderboard(user?.id, 200);

  const [showPast, setShowPast] = useState(false);
  const [championDetails, setChampionDetails] = useState<ChampionWithProfile[]>([]);

  useEffect(() => {
    const championEntries = pastChampions.filter((w) => w.champion_user_id);
    if (championEntries.length === 0) {
      setChampionDetails([]);
      return;
    }
    (async () => {
      const ids = championEntries.map((w) => w.champion_user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      setChampionDetails(
        championEntries.map((w) => ({
          ...w,
          profile: profs?.find((p) => p.user_id === w.champion_user_id) ?? null,
        }))
      );
    })().catch(() => {
      setChampionDetails(championEntries.map(w => ({ ...w, profile: null })));
    });
  }, [pastChampions]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Leaderboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Timer className="w-4 h-4" />
              Week ends in
            </div>
            <WeeklyCountdown weekEnd={currentWeekEnd} className="text-lg" />
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              Your Rank
            </div>
            {myRank ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">#{myRank.rank}</span>
                <span className="text-sm text-muted-foreground">
                  with {myRank.score.toLocaleString()} pts
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answer questions to earn points!
              </p>
            )}
          </div>
        </div>

        {championDetails.length > 0 && (
          <div className="bg-card rounded-xl border border-accent/20 overflow-hidden">
            <button
              onClick={() => setShowPast(!showPast)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                <span className="font-semibold text-sm">Past Champions</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {showPast ? "Hide" : `View ${championDetails.length}`}
              </span>
            </button>
            {showPast && (
              <div className="px-4 pb-3 space-y-2">
                {championDetails.map((week) => (
                  <div
                    key={week.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        name={week.profile?.display_name || "Champion"}
                        url={week.profile?.avatar_url}
                        className="w-9 h-9 ring-1 ring-accent"
                      />
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {week.profile?.display_name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(week.week_start).toLocaleDateString()} – {new Date(week.week_end).toLocaleDateString()}
                      </p>
                    </div>
                    {week.champion_badge_awarded && (
                      <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            This Week's Rankings ({rows.length} participant{rows.length !== 1 ? "s" : ""})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No scores yet this week</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start studying to earn points and climb the ranks!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => {
                const isMe = r.user_id === user?.id;
                return (
                  <div
                    key={r.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isMe
                        ? "bg-primary/10 border border-primary/30 -mx-1 px-4"
                        : "hover:bg-secondary/40"
                    )}
                  >
                    <RankIcon rank={r.rank} className="shrink-0 w-8 text-center" />
                    <UserAvatar
                      name={r.display_name || "Anon"}
                      url={r.avatar_url}
                      className="h-9 w-9 shrink-0 text-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.display_name || "Anonymous"}
                        {isMe && (
                          <span className="text-[10px] text-primary ml-1.5">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.event_count} action{r.event_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {r.week_score.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
