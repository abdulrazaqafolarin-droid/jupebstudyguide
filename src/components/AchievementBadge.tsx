import React from 'react';
import { Achievement, AchievementStats } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { Lock, Star } from 'lucide-react';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  shimmer?: boolean;
  stats?: AchievementStats;
}

const rarityConfig = {
  common: {
    bg: 'from-slate-500/80 to-slate-700/80',
    ring: 'ring-slate-400/40',
    glow: 'shadow-slate-500/20',
    accent: 'bg-slate-400',
    badge: 'from-slate-400 to-slate-600',
    label: 'text-slate-300',
  },
  uncommon: {
    bg: 'from-green-500/80 to-emerald-700/80',
    ring: 'ring-green-400/40',
    glow: 'shadow-green-500/20',
    accent: 'bg-green-400',
    badge: 'from-green-400 to-emerald-600',
    label: 'text-green-300',
  },
  rare: {
    bg: 'from-blue-500/80 to-indigo-700/80',
    ring: 'ring-blue-400/40',
    glow: 'shadow-blue-500/20',
    accent: 'bg-blue-400',
    badge: 'from-blue-400 to-indigo-600',
    label: 'text-blue-300',
  },
  epic: {
    bg: 'from-purple-500/80 to-violet-700/80',
    ring: 'ring-purple-400/40',
    glow: 'shadow-purple-500/30',
    accent: 'bg-purple-400',
    badge: 'from-purple-400 to-violet-600',
    label: 'text-purple-300',
  },
  legendary: {
    bg: 'from-amber-400/90 via-orange-500/80 to-red-600/80',
    ring: 'ring-yellow-400/50',
    glow: 'shadow-yellow-500/40',
    accent: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    badge: 'from-yellow-400 via-amber-500 to-orange-600',
    label: 'text-amber-300',
  },
};

function RarityBadge({ rarity, unlocked }: { rarity: Achievement['rarity']; unlocked: boolean }) {
  if (!unlocked) return null;
  const cfg = rarityConfig[rarity];
  return (
    <div className={cn(
      'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
      'border-2 border-background shadow-lg',
      'bg-gradient-to-br',
      cfg.badge,
    )}>
      <Star className="w-2.5 h-2.5 text-white drop-shadow" />
    </div>
  );
}

function RarityStars({ rarity, unlocked }: { rarity: Achievement['rarity']; unlocked: boolean }) {
  if (!unlocked) return null;
  const starCount = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }[rarity];
  return (
    <div className="flex gap-0.5 mt-0.5">
      {Array.from({ length: starCount }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-2.5 h-2.5',
            rarity === 'legendary' ? 'text-yellow-400 fill-yellow-400' :
            rarity === 'epic' ? 'text-purple-400 fill-purple-400' :
            rarity === 'rare' ? 'text-blue-400 fill-blue-400' :
            rarity === 'uncommon' ? 'text-green-400 fill-green-400' :
            'text-slate-400 fill-slate-400',
          )}
        />
      ))}
    </div>
  );
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  unlocked,
  size = 'md',
  showDetails = true,
  shimmer = false,
  stats,
}) => {
  const progress = stats && achievement.getProgress
    ? achievement.getProgress(stats)
    : null;
  const cfg = rarityConfig[achievement.rarity];

  const sizeClasses = {
    sm: 'w-10 h-10 text-base',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div className={cn(
      'flex items-center gap-3',
      !showDetails && 'justify-center',
    )}>
      <div className="relative shrink-0">
        <div className={cn(
          'relative rounded-xl flex items-center justify-center transition-all duration-300',
          sizeClasses[size],
          unlocked
            ? cn(
                'bg-gradient-to-br border shadow-lg',
                cfg.bg,
                cfg.ring,
                cfg.glow,
                shimmer && 'animate-pulse shadow-lg',
              )
            : 'bg-muted/50 border border-muted-foreground/20',
        )}>
          {unlocked ? (
            <>
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-white/10 to-transparent" />
              <span className="relative z-10 drop-shadow-lg brightness-110">{achievement.icon}</span>
            </>
          ) : (
            <Lock className="w-1/3 h-1/3 text-muted-foreground/40" />
          )}

          {/* Rarity badge */}
          {unlocked && achievement.rarity !== 'common' && (
            <RarityBadge rarity={achievement.rarity} unlocked={unlocked} />
          )}

          {/* Legendary animated border */}
          {unlocked && achievement.rarity === 'legendary' && (
            <>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 opacity-50 blur-sm animate-pulse" />
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-yellow-400/30 via-amber-500/30 to-yellow-400/30 opacity-30 blur-md animate-float" />
            </>
          )}

          {/* Epic shimmer border */}
          {unlocked && achievement.rarity === 'epic' && (
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-purple-400/30 via-violet-500/30 to-purple-400/30 opacity-40 blur-sm" />
          )}
        </div>
      </div>

      {showDetails && (
        <div className={cn('min-w-0', !unlocked && 'opacity-50')}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate">{achievement.name}</p>
            <RarityStars rarity={achievement.rarity} unlocked={unlocked} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
          {progress && (
            <div className="mt-1.5 w-full">
              <div className="flex items-center justify-between text-[9px] text-muted-foreground/70 mb-0.5">
                <span>{progress.current}/{progress.max}</span>
                <span>{Math.round((progress.current / progress.max) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((progress.current / progress.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AchievementBadge;
