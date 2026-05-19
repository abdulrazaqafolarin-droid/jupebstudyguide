import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/hooks/useAchievements';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementPopupProps {
  achievements: Achievement[];
  onClose: () => void;
}

const rarityColors = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
};

const AchievementPopup: React.FC<AchievementPopupProps> = ({ achievements, onClose }) => {
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onClose]);

  return (
    <AnimatePresence>
      {achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-16px)] sm:w-[90%] max-w-xs sm:max-w-sm"
        >
          <div className="bg-card border border-primary/30 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                <span className="font-bold text-xs sm:text-sm text-primary">Achievement Unlocked!</span>
              </div>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
            
            {/* Achievements */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-center gap-2.5 sm:gap-3"
                >
                  <div className={cn(
                    'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl',
                    'bg-gradient-to-br shadow-lg flex-shrink-0',
                    rarityColors[achievement.rarity]
                  )}>
                    {achievement.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{achievement.name}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{achievement.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementPopup;
