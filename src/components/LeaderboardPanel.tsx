import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Loader2, ArrowRight, Target } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const TOP_COLORS = [
  'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  'from-slate-300/20 to-slate-400/10 border-slate-400/30',
  'from-amber-600/20 to-amber-700/10 border-amber-600/30',
];

export const LeaderboardPanel = () => {
  const { user } = useAuth();
  const { rows, loading } = useLeaderboard(4);

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
                      : 'hover:bg-secondary/40 border border-transparent',
                    i < 3 && !isMe && cn('bg-gradient-to-r', TOP_COLORS[i])
                  )}
                >
                  <span className="w-7 text-center">
                    {i < 3 ? (
                      <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </span>
                  <UserAvatar
                    name={r.display_name || 'Anon'}
                    url={r.avatar_url}
                    className="h-8 w-8 text-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {r.display_name || 'Anonymous'} {isMe && <span className="text-[10px] text-primary font-semibold">(You)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {r.event_count} action{r.event_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{r.week_score}</p>
                    <p className="text-[9px] text-muted-foreground">pts</p>
                  </div>
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
      </CardContent>
    </Card>
  );
};

export default LeaderboardPanel;
