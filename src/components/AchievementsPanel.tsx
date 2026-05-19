import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';
import AchievementBadge from './AchievementBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AchievementsPanelProps {
  unlockedAchievements: Achievement[];
  lockedAchievements: Achievement[];
  totalCount: number;
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'from-yellow-500 to-orange-600';
    case 'epic': return 'from-purple-500 to-violet-600';
    case 'rare': return 'from-blue-500 to-cyan-600';
    default: return 'from-slate-400 to-slate-500';
  }
};

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  unlockedAchievements,
  lockedAchievements,
  totalCount,
}) => {
  const [showLocked, setShowLocked] = useState(false);
  const pct = (unlockedAchievements.length / totalCount) * 100;

  // Count by rarity
  const legendaries = unlockedAchievements.filter(a => a.rarity === 'legendary').length;
  const epics = unlockedAchievements.filter(a => a.rarity === 'epic').length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-semibold">Achievements</span>
            {legendaries > 0 && (
              <span className="ml-2 text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium">
                {legendaries} legend{legendaries > 1 ? 'aries' : 'ary'}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold">{unlockedAchievements.length}</span>
          <span className="text-sm text-muted-foreground">/{totalCount}</span>
        </div>
      </div>

      {/* Progress bar with glow */}
      <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {pct > 0 && pct < 100 && (
          <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-r from-transparent to-white/20 rounded-full blur-sm" 
            style={{ right: `${100 - pct}%`, transform: 'translateX(50%)' }} 
          />
        )}
      </div>

      {/* Unlocked achievements */}
      {unlockedAchievements.length > 0 ? (
        <div className="space-y-2">
          {unlockedAchievements.slice(0, 5).map((achievement, i) => (
            <div key={achievement.id} className="animate-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <AchievementBadge
                achievement={achievement}
                unlocked={true}
                size="sm"
              />
            </div>
          ))}
          {unlockedAchievements.length > 5 && !showLocked && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{unlockedAchievements.length - 5} more unlocked
              {epics > 0 && ` (${epics} epic${epics > 1 ? 's' : ''})`}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Start studying to unlock achievements!
          </p>
        </div>
      )}

      {/* Show/hide locked toggle */}
      {lockedAchievements.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs hover:bg-secondary/50 transition-colors"
          onClick={() => setShowLocked(!showLocked)}
        >
          {showLocked ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Hide locked
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {lockedAchievements.length} locked
            </>
          )}
        </Button>
      )}

      {/* Locked achievements */}
      {showLocked && lockedAchievements.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          {lockedAchievements.map((achievement, i) => (
            <div key={achievement.id} className="animate-in-up" style={{ animationDelay: `${i * 0.03}s` }}>
              <AchievementBadge
                achievement={achievement}
                unlocked={false}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementsPanel;
