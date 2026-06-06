import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/hooks/useAchievements';
import { X, Sparkles, Star, Trophy, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementPopupProps {
  achievements: Achievement[];
  onClose: () => void;
}

const rarityConfig = {
  common: {
    gradient: 'from-slate-500 to-slate-600',
    bgLight: 'from-slate-500/10 to-slate-600/10',
    icon: Sparkles,
    label: 'Unlocked!',
  },
  uncommon: {
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'from-green-500/10 to-emerald-600/10',
    icon: Sparkles,
    label: 'Unlocked!',
  },
  rare: {
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'from-blue-500/10 to-indigo-600/10',
    icon: Star,
    label: 'Rare Unlock!',
  },
  epic: {
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'from-purple-500/10 to-violet-600/10',
    icon: Trophy,
    label: 'Epic Achievement!',
  },
  legendary: {
    gradient: 'from-yellow-400 via-amber-500 to-orange-600',
    bgLight: 'from-yellow-400/10 via-amber-500/10 to-orange-600/10',
    icon: Crown,
    label: 'Legendary Unlock!',
  },
};

const particles = ['✨', '⭐', '🌟', '💫', '🔥', '⚡'];

function ParticleBurst({ rarity, fullScreen }: { rarity: Achievement['rarity']; fullScreen?: boolean }) {
  const [burst, setBurst] = useState<{ id: number; x: number; y: number; emoji: string; delay: number }[]>([]);

  useEffect(() => {
    const count = rarity === 'legendary' ? 20 : rarity === 'epic' ? 12 : rarity === 'rare' ? 6 : 0;
    if (count === 0) return;
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * (fullScreen ? 500 : 200),
      y: -(Math.random() * (fullScreen ? 300 : 150) + 50),
      emoji: particles[Math.floor(Math.random() * particles.length)],
      delay: Math.random() * 0.4,
    }));
    setBurst(items);
    const timer = setTimeout(() => setBurst([]), 2500);
    return () => clearTimeout(timer);
  }, [rarity, fullScreen]);

  if (burst.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {burst.map(p => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.5 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
          className="absolute left-1/2 top-1/2 text-xl"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

function ConfettiRain() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            background: ['#fbbf24', '#a855f7', '#60a5fa', '#34d399', '#fb923c', '#f472b6'][Math.floor(Math.random() * 6)],
          }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: '100vh',
            x: Math.random() > 0.5 ? 50 : -50,
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: [0.23, 1, 0.32, 1],
            repeat: Infinity,
            repeatDelay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

const AchievementPopup: React.FC<AchievementPopupProps> = ({ achievements, onClose }) => {
  const topRarity = achievements.length > 0
    ? achievements.reduce((a, b) => {
        const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        return order.indexOf(a.rarity) > order.indexOf(b.rarity) ? a : b;
      }).rarity
    : 'common';
  const cfg = rarityConfig[topRarity];
  const Icon = cfg.icon;
  const isPremium = topRarity === 'legendary' || topRarity === 'epic' || topRarity === 'rare';

  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(onClose, isPremium ? 7000 : 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onClose, isPremium]);

  return (
    <AnimatePresence>
      {achievements.length > 0 && (
        <>
          {isPremium && <ConfettiRain />}

          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -30 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-16px)] sm:w-[90%] max-w-xs sm:max-w-sm"
          >
            <motion.div
              className={cn(
                'relative border-2 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl',
                topRarity === 'legendary' ? 'border-yellow-500/60 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/15 shadow-yellow-500/20' :
                topRarity === 'epic' ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-purple-500/15 shadow-purple-500/20' :
                topRarity === 'rare' ? 'border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-blue-500/10' :
                'bg-card border-primary/30',
              )}
              animate={topRarity === 'legendary' ? { boxShadow: ['0 0 20px rgba(250,204,21,0.3)', '0 0 40px rgba(250,204,21,0.5)', '0 0 20px rgba(250,204,21,0.3)'] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isPremium && <ConfettiLine />}
              <ParticleBurst rarity={topRarity} />

              <div className={cn(
                'px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between relative z-10',
                'bg-gradient-to-r',
                topRarity === 'legendary' ? 'from-yellow-500/30 via-amber-500/30 to-orange-500/30' :
                topRarity === 'epic' ? 'from-purple-500/30 via-violet-500/30 to-purple-500/30' :
                topRarity === 'rare' ? 'from-blue-500/20 via-indigo-500/20 to-blue-500/20' :
                'from-primary/20 to-accent/20',
              )}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <motion.div
                    animate={isPremium ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Icon className={cn(
                      'w-4 h-4 sm:w-5 sm:h-5',
                      topRarity === 'legendary' ? 'text-yellow-400' :
                      topRarity === 'epic' ? 'text-purple-400' :
                      topRarity === 'rare' ? 'text-blue-400' :
                      'text-primary',
                      isPremium ? 'animate-pulse' : '',
                    )} />
                  </motion.div>
                  <span className="font-bold text-xs sm:text-sm bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {topRarity === 'legendary' ? 'Legendary Achievement!' :
                     topRarity === 'epic' ? 'Epic Achievement!' :
                     topRarity === 'rare' ? 'Rare Achievement!' :
                     'Achievement Unlocked!'}
                  </span>
                  {isPremium && (
                    <Medal className={cn(
                      'w-3.5 h-3.5 sm:w-4 sm:h-4',
                      topRarity === 'legendary' ? 'text-yellow-400' :
                      topRarity === 'epic' ? 'text-purple-400' :
                      'text-blue-400',
                    )} />
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 relative z-10">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 + 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                    className="flex items-center gap-2.5 sm:gap-3"
                  >
                    <motion.div
                      animate={achievement.rarity === 'legendary' ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                      className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl',
                        'bg-gradient-to-br shadow-lg flex-shrink-0 border border-white/10',
                        (rarityConfig[achievement.rarity] ?? rarityConfig.common).gradient,
                      )}
                    >
                      {achievement.icon}
                    </motion.div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{achievement.name}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{achievement.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function ConfettiLine() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 60">
      <defs>
        <linearGradient id="confetti-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(250,204,21)" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(250,204,21)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="rgb(250,204,21)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.rect
        x="-50%" y="8" width="50%" height="2"
        fill="url(#confetti-grad)"
        animate={{ x: ['100%', '-50%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.rect
        x="-50%" y="20" width="30%" height="1"
        fill="url(#confetti-grad)"
        animate={{ x: ['100%', '-50%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
      />
    </svg>
  );
}

export default AchievementPopup;
