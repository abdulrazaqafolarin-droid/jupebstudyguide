import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyLeaderboard, LeaderboardWeek } from "@/hooks/useWeeklyLeaderboard";
import { ACHIEVEMENTS } from "@/hooks/useAchievements";
import WeeklyCountdown from "@/components/WeeklyCountdown";
import { UserAvatar } from "@/components/UserAvatar";
import UserAchievementPreview from "@/components/UserAchievementPreview";
import { Button } from "@/components/ui/button";
import {
  Trophy, ArrowLeft, Crown, Loader2, TrendingUp,
  Timer, Sparkles, Star, Eye, Share2, MessageCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AchievementBadge from "@/components/AchievementBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const achievementNameMap = new Map(ACHIEVEMENTS.map(a => [a.id, a.name]));
const achievementMap = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rows, loading, error, currentWeekStart, currentWeekEnd, pastChampions, myRank } =
    useWeeklyLeaderboard(user?.id, 200);

  const [showPast, setShowPast] = useState(false);
  const [championDetails, setChampionDetails] = useState<ChampionWithProfile[]>([]);
  const [previewUser, setPreviewUser] = useState<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    achievements: string[];
    week_score?: number;
    rank?: number;
  } | null>(null);

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
    })().catch((err) => {
      console.warn('Failed to fetch champion details:', err);
      setChampionDetails(championEntries.map(w => ({ ...w, profile: null })));
    });
  }, [pastChampions]);

  const startChat = useCallback((otherUserId: string) => {
    navigate('/chat?dm=' + otherUserId);
  }, [navigate]);

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
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">#{myRank.rank}</span>
                  <span className="text-sm text-muted-foreground">
                    with {myRank.score.toLocaleString()} pts
                  </span>
                </div>
                <button
                  onClick={() => {
                    const text = `🏆 I'm ranked #${myRank.rank} on the JUPEB Study Guide leaderboard with ${myRank.score.toLocaleString()} points!`;
                    if (navigator.share) {
                      navigator.share({ title: 'JUPEB Leaderboard', text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text).then(() => toast('Leaderboard rank copied!')).catch(() => {});
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  title="Share your rank"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answer questions to earn points!
              </p>
            )}
            {user && (() => {
              const myRow = rows.find(r => r.user_id === user.id);
              if (!myRow || myRow.achievements.length === 0) return null;
              return (
                <button
                  onClick={() => setPreviewUser({
                    user_id: user.id,
                    display_name: myRow.display_name,
                    avatar_url: myRow.avatar_url,
                    achievements: myRow.achievements,
                    week_score: myRow.week_score,
                    rank: myRow.rank,
                  })}
                  className="mt-2 flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Eye className="w-3 h-3" />
                  View My Achievements ({myRow.achievements.length})
                </button>
              );
            })()}
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
                        targetUserId={week.champion_user_id}
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
          ) : error ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Unable to load leaderboard</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No scores yet this week</p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Start studying to earn points and climb the ranks!
              </p>
              <Button asChild>
                <Link to="/past-questions">Go Study Now</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => {
                const isMe = r.user_id === user?.id;
                return (
                  <div
                    key={r.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                      isMe
                        ? "bg-primary/10 border border-primary/30 -mx-1 px-4"
                        : "hover:bg-secondary/40 group"
                    )}
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:scale-[0.99]"
                      onClick={() => {
                        setPreviewUser({
                          user_id: r.user_id,
                          display_name: r.display_name,
                          avatar_url: r.avatar_url,
                          achievements: r.achievements,
                          week_score: r.week_score,
                          rank: r.rank,
                        });
                      }}
                    >
                      <RankIcon rank={r.rank} className="shrink-0 w-8 text-center" />
                      <UserAvatar
                        name={r.display_name || "Anon"}
                        url={r.avatar_url}
                        className="h-9 w-9 shrink-0 text-xs"
                        targetUserId={r.user_id}
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
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground">
                            {r.event_count} action{r.event_count !== 1 ? "s" : ""}
                          </p>
                          {r.achievements.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 cursor-default">
                                    {r.achievements.slice(0, 3).map(id => {
                                      const a = achievementMap.get(id);
                                      return a ? (
                                        <span key={id} className="text-xs leading-none" title={a.name}>
                                          {a.icon}
                                        </span>
                                      ) : null;
                                    })}
                                    {r.achievements.length > 3 && (
                                      <span className="text-[9px] text-muted-foreground font-medium">
                                        +{r.achievements.length - 3}
                                      </span>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="space-y-1 max-w-[200px]">
                                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Achievements</p>
                                  {r.achievements.map(id => (
                                    <p key={id} className="text-xs truncate">
                                      {achievementNameMap.get(id) || id}
                                    </p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">
                          {r.week_score.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground">pts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isMe ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] px-2 gap-1 text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => {
                            setPreviewUser({
                              user_id: r.user_id,
                              display_name: r.display_name,
                              avatar_url: r.avatar_url,
                              achievements: r.achievements,
                              week_score: r.week_score,
                              rank: r.rank,
                            });
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          My Achievements
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            startChat(r.user_id);
                          }}
                          title="Chat with this user"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <UserAchievementPreview
          user={previewUser}
          open={previewUser !== null}
          onClose={() => setPreviewUser(null)}
          onChat={startChat}
        />
      </main>
    </div>
  );
}
