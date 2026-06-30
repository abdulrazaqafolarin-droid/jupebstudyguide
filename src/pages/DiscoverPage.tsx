import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, Trophy, Clock, ArrowLeft, Loader2, Compass, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DiscoverUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  total_score: number;
  is_online: boolean;
  rank: number;
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url, last_seen_at').neq('user_id', user.id),
      supabase.from('score_events').select('user_id, amount'),
    ]).then(([profilesRes, scoresRes]) => {
      if (profilesRes.error) console.warn('profiles error:', profilesRes.error);
      if (scoresRes.error) console.warn('score_events error:', scoresRes.error);

      const profileData = (profilesRes.data ?? []) as DiscoverUser[];
      const scoreEvents = (scoresRes.data ?? []) as { user_id: string; amount: number }[];

      const scoreMap = new Map<string, number>();
      for (const ev of scoreEvents) {
        scoreMap.set(ev.user_id, (scoreMap.get(ev.user_id) ?? 0) + ev.amount);
      }

      const enriched: DiscoverUser[] = profileData.map(p => ({
        ...p,
        total_score: scoreMap.get(p.user_id) ?? 0,
        is_online: false,
        rank: 0,
      }));

      enriched.sort((a, b) => b.total_score - a.total_score);
      enriched.forEach((u, i) => { u.rank = i + 1; });
      setUsers(enriched);

      setLoading(false);
    }).catch(err => {
      console.warn('DiscoverPage load failed:', err);
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return users;
    const q = debouncedQuery.toLowerCase();
    return users.filter(u =>
      u.display_name?.toLowerCase().includes(q)
    );
  }, [users, debouncedQuery]);

  const onlineUsers = useMemo(() => filtered.filter(u => u.is_online), [filtered]);
  const topUsers = useMemo(() => [...filtered].sort((a, b) => b.total_score - a.total_score).slice(0, 20), [filtered]);

  const openProfile = (userId: string) => navigate(`/profile?userId=${userId}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Discover
            </h1>
            <p className="text-[10px] text-muted-foreground">Find study partners</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div data-tour="discover-search" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name..."
            className="pl-9 bg-secondary/50 border-border/50 h-10 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Online Now */}
            {onlineUsers.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online Now
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4">
                  {onlineUsers.slice(0, 10).map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => openProfile(u.user_id)}
                      className="flex flex-col items-center gap-1.5 min-w-[64px]"
                    >
                      <div className="relative">
                        <UserAvatar url={u.avatar_url} name={u.display_name} className="w-12 h-12 ring-0" targetUserId={u.user_id} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                      </div>
                      <span className="text-[10px] font-medium truncate max-w-[64px]">
                        {u.display_name || 'User'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Top Users */}
            {!searchQuery && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Top Scorers
                </h2>
                <div className="space-y-1">
                  {topUsers.slice(0, 5).map((u, i) => (
                    <motion.div
                      key={u.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border group hover:bg-accent/50 transition-colors"
                    >
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        i === 0 ? 'bg-amber-500/20 text-amber-500' :
                        i === 1 ? 'bg-slate-400/20 text-slate-400' :
                        i === 2 ? 'bg-amber-700/20 text-amber-700' :
                        'bg-secondary text-muted-foreground'
                      )}>
                        {i + 1}
                      </span>
                      <button onClick={() => openProfile(u.user_id)} className="relative shrink-0">
                        <UserAvatar url={u.avatar_url} name={u.display_name} className="w-9 h-9 ring-0" targetUserId={u.user_id} />
                        {u.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openProfile(u.user_id)}
                          className="text-sm font-medium truncate block text-left hover:underline"
                        >
                          {u.display_name || 'User'}
                        </button>
                        <p className="text-[10px] text-muted-foreground">{u.total_score.toLocaleString()} pts</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs rounded-lg"
                          onClick={(e) => { e.stopPropagation(); openProfile(u.user_id); }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All Users */}
            <section data-tour="discover-list" className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {searchQuery ? `Search Results (${filtered.length})` : 'All Members'}
              </h2>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Compass className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No users found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {(searchQuery ? filtered : filtered.slice(5)).map((u) => (
                    <motion.div
                      key={u.user_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                    >
                      <button onClick={() => openProfile(u.user_id)} className="relative shrink-0">
                        <UserAvatar url={u.avatar_url} name={u.display_name} className="w-10 h-10 ring-0" targetUserId={u.user_id} />
                        {u.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openProfile(u.user_id)}
                          className="text-sm font-medium truncate block text-left hover:underline"
                        >
                          {u.display_name || 'User'}
                        </button>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {u.total_score.toLocaleString()} pts
                          </span>
                          {u.last_seen_at && !u.is_online && (
                            <>
                              <span className="text-muted-foreground/40">&middot;</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true })}
                              </span>
                            </>
                          )}
                          {u.is_online && (
                            <>
                              <span className="text-muted-foreground/40">&middot;</span>
                              <span className="text-emerald-500 font-medium">Online</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs rounded-lg"
                          onClick={(e) => { e.stopPropagation(); openProfile(u.user_id); }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
