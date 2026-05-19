import React from 'react';
import { Flame, Calendar, Target, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  hasStudiedToday: boolean;
  compact?: boolean;
}

function getStreakTier(days: number) {
  if (days >= 30) return { label: 'Legendary', color: 'from-yellow-500 to-orange-600', multiplier: 1 };
  if (days >= 14) return { label: 'On Fire!', color: 'from-orange-500 to-red-500', multiplier: 2 };
  if (days >= 7) return { label: 'Unstoppable', color: 'from-primary to-orange-500', multiplier: 3 };
  if (days >= 3) return { label: 'Getting Warm', color: 'from-primary to-accent', multiplier: 4 };
  return { label: 'Start Streak', color: 'from-muted to-muted', multiplier: 5 };
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  totalDaysStudied,
  hasStudiedToday,
  compact = false,
}) => {
  const tier = getStreakTier(currentStreak);

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300',
        hasStudiedToday && currentStreak > 0
          ? 'bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30 shadow-sm shadow-primary/20' 
          : currentStreak > 0
          ? 'bg-primary/10 border-primary/20'
          : 'bg-muted/50 border-muted'
      )}>
        <Flame className={cn(
          'w-4 h-4',
          currentStreak > 0 ? 'text-primary' : 'text-muted-foreground',
          hasStudiedToday && currentStreak > 0 && 'animate-pulse'
        )} />
        <span className={cn(
          'font-bold text-sm',
          currentStreak > 0 ? 'text-primary' : 'text-muted-foreground'
        )}>
          {currentStreak}
        </span>
        <span className="text-xs text-muted-foreground">day{currentStreak !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      {/* Main Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center relative',
            currentStreak > 0 
              ? `bg-gradient-to-br ${tier.color}` 
              : 'bg-muted'
          )}>
            <Flame className={cn(
              'w-7 h-7',
              currentStreak > 0 ? 'text-white' : 'text-muted-foreground',
              hasStudiedToday && 'animate-bounce'
            )} />
            {hasStudiedToday && currentStreak > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
            )}
          </div>
          <div>
            <p className="text-3xl font-bold">{currentStreak}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-muted-foreground">Day Streak</p>
              {currentStreak > 2 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gradient-to-r text-white',
                  tier.color
                )}>
                  {tier.label}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className={cn(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all',
          hasStudiedToday 
            ? 'text-accent bg-accent/10 border-accent/30' 
            : 'text-muted-foreground bg-muted/50 border-muted'
        )}>
          {hasStudiedToday ? (
            <><Zap className="w-3 h-3" /> Studied today!</>
          ) : (
            <><Calendar className="w-3 h-3" /> Study today</>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-3.5 text-center border border-accent/10 transition-all duration-200 hover:border-accent/30">
          <TrendingUp className="w-4 h-4 mx-auto mb-1.5 text-accent" />
          <p className="text-xl font-bold text-accent">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
        <div className="bg-gradient-to-br from-physics/10 to-physics/5 rounded-xl p-3.5 text-center border border-physics/10 transition-all duration-200 hover:border-physics/30">
          <Calendar className="w-4 h-4 mx-auto mb-1.5 text-physics" />
          <p className="text-xl font-bold text-physics">{totalDaysStudied}</p>
          <p className="text-xs text-muted-foreground">Total Days</p>
        </div>
      </div>
    </div>
  );
};

export default StreakDisplay;
