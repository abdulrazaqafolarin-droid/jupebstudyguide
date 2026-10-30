import { useLeaderboard } from '@/hooks/useLeaderboard';
import { ACHIEVEMENTS, AchievementStats } from '@/hooks/useAchievements';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Loader2, ArrowRight, Target, Eye } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import UserAchievementPreview from './UserAchievementPreview';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const achievementNameMap = new Map(ACHIEVEMENTS.map(a => [a.id, a.name]));
const achievementIconMap = new Map(ACHIEVEMENTS.map(a => [a.id, a.icon]));

const TOP_COLORS = [
  'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  'from-slate-300/20 to-slate-400/10 border-slate-400/30',
  'from-amber-600/20 to-amber-700/10 border-amber-600/30',
];

interface LeaderboardPanelProps {
  stats?: AchievementStats;
}

export const LeaderboardPanel = ({ stats }: LeaderboardPanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rows, loading, error } = useLeaderboard(4);
  const [previewUser, setPreviewUser] = useState<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    school_name?: string | null;
    achievements: string[];
  } | null>(null);

  const startChat = useCallback(async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('find_or_create_dm', { other_user_id: otherUserId });
      if (error) throw new Error(error.message);
      const result = data as { conversation_id?: string; error?: string };
      if (result?.error) throw new Error(result.error);
      if (result?.conversation_id) {
        navigate(`/chat?conversation=${result.conversation_id}`);
      }
    } catch (err) {
      toast.error(String(err));
    }
  }, [navigate]);

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-accent" />
          </div>
          Leaderboard
          <span className="ml-auto text-[10px] font-normal text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading scores...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">Unable to load leaderboard</p>
            <p className="text-xs text-muted-foreground/60">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Target className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">No scores yet</p>
            <p className="text-xs text-muted-foreground/60">Start a study session to earn points and climb the ranks.</p>
          </div>
        ) : (
          <ol className="space-y-1">
              {rows.map((r, i) => {
                const isMe = r.user_id === user?.id;
                return (
                  <li
                    key={r.user_id}
                    style={{ animationDelay: `${i * 0.06}s` }}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 animate-in-up',
                      isMe
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-secondary/40 border border-transparent group',
                      i < 3 && !isMe && cn('bg-gradient-to-r', TOP_COLORS[i])
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 text-center shrink-0 cursor-pointer",
                        !isMe && "active:scale-[0.99]"
                      )}
                      onClick={!isMe ? () => {
                        setPreviewUser({
                          user_id: r.user_id,
                          display_name: r.display_name,
                          avatar_url: r.avatar_url,
                          school_name: r.school_name,
                          achievements: r.achievements,
                        });
                      } : undefined}
                    >
                      {i < 3 ? (
                        <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                      )}
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-3 flex-1 min-w-0",
                        !isMe && "cursor-pointer active:scale-[0.99]"
                      )}
                      onClick={!isMe ? () => {
                        setPreviewUser({
                          user_id: r.user_id,
                          display_name: r.display_name,
                          avatar_url: r.avatar_url,
                          school_name: r.school_name,
                          achievements: r.achievements,
                        });
                      } : undefined}
                    >
                      <UserAvatar
                        name={r.display_name || 'Anon'}
                        url={r.avatar_url}
                        className="h-8 w-8 text-xs shrink-0"
                        targetUserId={r.user_id}
                      />
                       <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {r.display_name || 'Anonymous'} {isMe && <span className="text-[10px] text-primary font-semibold">(You)</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-muted-foreground">
                            {r.event_count} action{r.event_count !== 1 ? 's' : ''}
                          </p>
                          {r.achievements.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-0.5 cursor-default">
                                    {r.achievements.slice(0, 3).map(id => {
                                      const icon = achievementIconMap.get(id);
                                      return icon ? (
                                        <span key={id} className="text-[11px] leading-none" title={achievementNameMap.get(id)}>
                                          {icon}
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
                                <TooltipContent side="top" className="space-y-1 max-w-[180px]">
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
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{r.week_score}</p>
                      <p className="text-[9px] text-muted-foreground">pts</p>
                    </div>
                    {isMe && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[9px] px-1.5 gap-1 text-primary hover:text-primary/80 hover:bg-primary/10 shrink-0"
                        onClick={() => {
                          setPreviewUser({
                            user_id: r.user_id,
                            display_name: r.display_name,
                            avatar_url: r.avatar_url,
                            school_name: r.school_name,
                            achievements: r.achievements,
                          });
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        Achievements
                      </Button>
                    )}
                  </li>
                );
              })}
          </ol>
        )}
        {rows.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <Link
              to="/leaderboard"
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors group"
            >
              View Full Leaderboard
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        <UserAchievementPreview
          user={previewUser}
          open={previewUser !== null}
          onClose={() => setPreviewUser(null)}
          onChat={startChat}
          stats={previewUser?.user_id === user?.id ? stats : undefined}
        />
      </CardContent>
    </Card>
  );
};

export default LeaderboardPanel;
