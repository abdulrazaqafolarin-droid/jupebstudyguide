import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Crown, Swords, Medal, Sparkles, Star, Loader2, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACHIEVEMENTS, AchievementStats } from '@/hooks/useAchievements';
import EliteBadge from './EliteBadge';
import AchievementBadge from './AchievementBadge';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';

interface UserData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  achievements: string[];
  week_score?: number;
  rank?: number;
}

interface UserAchievementPreviewProps {
  user: UserData | null;
  open: boolean;
  onClose: () => void;
  onChat?: (userId: string) => void;
  stats?: AchievementStats;
}

const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'] as const;

export default function UserAchievementPreview({ user, open, onClose, onChat, stats }: UserAchievementPreviewProps) {
  const unlockedAchievements = useMemo(() => {
    if (!user) return [];
    const ids = new Set(user.achievements);
    return ACHIEVEMENTS.filter(a => ids.has(a.id))
      .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  }, [user?.achievements]);

  const lockedAchievements = useMemo(() => {
    if (!user || !stats) return [];
    const ids = new Set(user.achievements);
    return ACHIEVEMENTS.filter(a => !ids.has(a.id))
      .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  }, [user?.achievements, stats]);

  if (!user) return null;

  const legendary = unlockedAchievements.filter(a => a.rarity === 'legendary').length;
  const epic = unlockedAchievements.filter(a => a.rarity === 'epic').length;
  const rare = unlockedAchievements.filter(a => a.rarity === 'rare').length;

  const eliteBadges = unlockedAchievements.filter(a => a.rarity === 'legendary' || a.rarity === 'epic');
  const normalBadges = unlockedAchievements.filter(a => a.rarity !== 'legendary' && a.rarity !== 'epic');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background p-5 relative">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
              <UserAvatar
                name={user.display_name || 'User'}
                url={user.avatar_url}
                className="w-14 h-14 ring-2 ring-primary/30"
                targetUserId={user.user_id}
              />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-base truncate">{user.display_name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">
                    {unlockedAchievements.length} achievement{unlockedAchievements.length !== 1 ? 's' : ''}
                    {user.rank && ` · #${user.rank} on leaderboard`}
                  </p>
                </div>
                {onChat && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 shrink-0 self-start"
                    onClick={() => onChat(user.user_id)}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Message
                  </Button>
                )}
              </div>

              {unlockedAchievements.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {legendary > 0 && (
                    <span className="text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Crown className="w-3 h-3" /> {legendary} legendary
                    </span>
                  )}
                  {epic > 0 && (
                    <span className="text-[10px] bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Swords className="w-3 h-3" /> {epic} epic
                    </span>
                  )}
                  {rare > 0 && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {rare} rare
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {unlockedAchievements.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No achievements yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Studying will unlock achievements!
                  </p>
                </div>
              ) : (
                <>
                  {/* Elite badges */}
                  {eliteBadges.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Medal className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">Elite Achievements</span>
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                      </div>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {eliteBadges.map((achievement, i) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08, duration: 0.4 }}
                          >
                            <EliteBadge achievement={achievement} unlocked featured />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All badges */}
                  {normalBadges.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">All Achievements</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {normalBadges.map((achievement, i) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (eliteBadges.length * 0.08) + i * 0.03, duration: 0.3 }}
                            className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-secondary/30 transition-colors cursor-default"
                          >
                            <AchievementBadge
                              achievement={achievement}
                              unlocked
                              size="sm"
                              showDetails={false}
                            />
                            <p className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-1">
                              {achievement.name}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Locked achievements — only when stats provided (self-view) */}
                  {lockedAchievements.length > 0 && (
                    <div className="border-t border-border/40 pt-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Locked</span>
                        <span className="text-[10px] text-muted-foreground">({lockedAchievements.length})</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {lockedAchievements.map((achievement, i) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.3 }}
                            className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-secondary/30 transition-colors cursor-default"
                          >
                            <AchievementBadge
                              achievement={achievement}
                              unlocked={false}
                              size="sm"
                              showDetails={false}
                              stats={stats}
                            />
                            <p className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-1">
                              {achievement.name}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
