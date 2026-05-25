import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Sparkles, Star, Crown, Swords, ArrowRight } from 'lucide-react';
import { Achievement } from '@/hooks/useAchievements';
import AchievementBadge from './AchievementBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AchievementsPanelProps {
  unlockedAchievements: Achievement[];
  lockedAchievements: Achievement[];
  totalCount: number;
}

const rarityIcons = {
  common: Star,
  uncommon: Star,
  rare: Star,
  epic: Swords,
  legendary: Crown,
};

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  unlockedAchievements,
  lockedAchievements,
  totalCount,
}) => {
  const [showLocked, setShowLocked] = useState(false);
  const pct = totalCount > 0 ? (unlockedAchievements.length / totalCount) * 100 : 0;

  const legendaries = unlockedAchievements.filter(a => a.rarity === 'legendary');
  const epics = unlockedAchievements.filter(a => a.rarity === 'epic');
  const rares = unlockedAchievements.filter(a => a.rarity === 'rare');

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-semibold">Achievements</span>
            <div className="flex items-center gap-1 mt-0.5">
              {legendaries.length > 0 && (
                <span className="text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  {legendaries.length}
                </span>
              )}
              {epics.length > 0 && (
                <span className="text-[10px] bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <Swords className="w-2.5 h-2.5" />
                  {epics.length}
                </span>
              )}
              {rares.length > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                  {rares.length} rare
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold">{unlockedAchievements.length}</span>
          <span className="text-sm text-muted-foreground">/{totalCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {pct > 0 && pct < 100 && (
          <div className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent to-white/20 rounded-full blur-sm"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
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

      <Link
        to="/achievements"
        className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors group border-t border-border pt-3"
      >
        View All Achievements
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
};

export default AchievementsPanel;
