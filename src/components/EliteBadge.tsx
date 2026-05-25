import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Achievement } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { Sparkles, Star } from 'lucide-react';

interface EliteBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  featured?: boolean;
  onClick?: () => void;
}

const glowMap = {
  legendary: {
    outer: 'shadow-[0_0_30px_rgba(250,204,21,0.4)] shadow-yellow-500/30',
    ring: 'ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-background',
    gradient: 'from-yellow-300 via-amber-500 to-orange-600',
    bg: 'from-yellow-400/20 via-amber-500/20 to-orange-600/20',
    text: 'text-yellow-400',
    particle: '✨',
    starColor: 'text-yellow-400 fill-yellow-400',
  },
  epic: {
    outer: 'shadow-[0_0_25px_rgba(168,85,247,0.35)] shadow-purple-500/25',
    ring: 'ring-2 ring-purple-400/50 ring-offset-2 ring-offset-background',
    gradient: 'from-purple-400 via-violet-500 to-purple-600',
    bg: 'from-purple-400/20 via-violet-500/20 to-purple-600/20',
    text: 'text-purple-400',
    particle: '⭐',
    starColor: 'text-purple-400 fill-purple-400',
  },
  rare: {
    outer: 'shadow-[0_0_20px_rgba(59,130,246,0.3)] shadow-blue-500/20',
    ring: 'ring-2 ring-blue-400/40 ring-offset-2 ring-offset-background',
    gradient: 'from-blue-400 via-blue-500 to-indigo-600',
    bg: 'from-blue-400/15 via-blue-500/15 to-indigo-600/15',
    text: 'text-blue-400',
    particle: '🌟',
    starColor: 'text-blue-400 fill-blue-400',
  },
};

const EliteBadge: React.FC<EliteBadgeProps> = ({ achievement, unlocked, featured = false, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const isElite = achievement.rarity === 'legendary' || achievement.rarity === 'epic' || achievement.rarity === 'rare';
  const glow = glowMap[achievement.rarity] || glowMap.rare;

  if (!unlocked || !isElite) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl',
          'bg-muted/30 border border-muted-foreground/20',
        )}>
          <span className="opacity-30">{achievement.icon}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center leading-tight">{achievement.name}</p>
      </div>
    );
  }

  const size = featured ? 'w-24 h-24 text-4xl' : 'w-16 h-16 text-2xl';

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex flex-col items-center gap-2 group cursor-default"
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      <div className="relative">
        {/* Outer glow ring */}
        {featured && (
          <motion.div
            className={cn(
              'absolute -inset-3 rounded-full opacity-40 blur-xl',
              `bg-gradient-to-r ${glow.gradient}`,
            )}
            animate={{ opacity: hovered ? 0.7 : 0.3, scale: hovered ? 1.15 : 1 }}
            transition={{ duration: 0.4 }}
          />
        )}

        {/* Floating particles */}
        {featured && (
          <motion.div
            className="absolute -inset-4 pointer-events-none"
            initial={false}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={cn('absolute text-xs', glow.text)}
                style={{
                  left: `${20 + i * 30}%`,
                  top: '-10%',
                }}
                animate={{
                  y: [-8, -18, -8],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + i * 0.4,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: 'easeInOut',
                }}
              >
                {glow.particle}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Badge container */}
        <motion.div
          className={cn(
            'relative rounded-2xl flex items-center justify-center',
            'bg-gradient-to-br border-2 shadow-lg',
            glow.bg,
            glow.ring,
            glow.outer,
            size,
            featured && 'shadow-2xl',
          )}
          animate={featured ? {
            boxShadow: hovered
              ? `0 0 40px rgba(${achievement.rarity === 'legendary' ? '250,204,21' : '168,85,247'},0.5)`
              : `0 0 20px rgba(${achievement.rarity === 'legendary' ? '250,204,21' : '168,85,247'},0.3)`,
          } : {}}
          whileHover={featured ? { rotate: [0, -3, 3, 0], transition: { duration: 0.4 } } : {}}
        >
          {/* Shine overlay */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/10 to-transparent"
            animate={{ opacity: hovered ? 0.3 : 0.1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Legendary animated border */}
          {achievement.rarity === 'legendary' && (
            <>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 opacity-40 blur-sm animate-pulse" />
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 opacity-30 blur-md animate-float" />
            </>
          )}

          {/* Epic shimmer border */}
          {achievement.rarity === 'epic' && (
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-400/20 via-violet-500/20 to-purple-400/20 opacity-30 blur-sm" />
          )}

          {/* Icon */}
          <motion.span
            className="relative z-10 drop-shadow-lg"
            animate={featured ? { scale: hovered ? 1.1 : 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            {achievement.icon}
          </motion.span>

          {/* Sparkle icon overlay */}
          {featured && (
            <motion.div
              className="absolute -top-1 -right-1 z-20"
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className={cn('w-3.5 h-3.5', glow.text)} />
            </motion.div>
          )}
        </motion.div>

        {/* Star count */}
        <div className="flex justify-center gap-0.5 mt-1">
          {Array.from({ length: achievement.rarity === 'legendary' ? 5 : achievement.rarity === 'epic' ? 4 : 3 }).map((_, i) => (
            <Star key={i} className={cn('w-2 h-2', glow.starColor)} />
          ))}
        </div>
      </div>

      <p className={cn(
        'text-center leading-tight font-medium',
        featured ? 'text-xs' : 'text-[10px]',
        glow.text,
      )}>
        {achievement.name}
      </p>
    </motion.button>
  );
};

export default EliteBadge;
