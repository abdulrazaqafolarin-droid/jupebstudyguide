import React from 'react';
import { Achievement } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const rarityColors = {
  common: 'from-slate-400 to-slate-600 border-slate-500',
  rare: 'from-blue-400 to-blue-600 border-blue-500',
  epic: 'from-purple-400 to-purple-600 border-purple-500',
  legendary: 'from-yellow-400 to-orange-500 border-yellow-500',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40 animate-pulse',
};

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  unlocked,
  size = 'md',
  showDetails = true,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  return (
    <div className={cn(
      'flex items-center gap-3',
      !showDetails && 'justify-center'
    )}>
      <div className={cn(
        'relative rounded-full flex items-center justify-center transition-all duration-300',
        sizeClasses[size],
        unlocked 
          ? cn('bg-gradient-to-br border-2 shadow-lg', rarityColors[achievement.rarity], rarityGlow[achievement.rarity])
          : 'bg-muted/50 border-2 border-muted'
      )}>
        {unlocked ? (
          <span className="drop-shadow-lg">{achievement.icon}</span>
        ) : (
          <Lock className="w-1/2 h-1/2 text-muted-foreground/50" />
        )}
        
        {/* Rarity indicator for unlocked */}
        {unlocked && achievement.rarity !== 'common' && (
          <div className={cn(
            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background',
            achievement.rarity === 'rare' && 'bg-blue-500',
            achievement.rarity === 'epic' && 'bg-purple-500',
            achievement.rarity === 'legendary' && 'bg-gradient-to-br from-yellow-400 to-orange-500',
          )} />
        )}
      </div>
      
      {showDetails && (
        <div className={cn(!unlocked && 'opacity-50')}>
          <p className="font-semibold text-sm">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
        </div>
      )}
    </div>
  );
};

export default AchievementBadge;
