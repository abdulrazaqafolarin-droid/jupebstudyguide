import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StepFinishProps {
  displayName: string | null;
  theme: 'dark' | 'light';
  subjectCount: number;
  chatEnabled: boolean;
}

/**
 * Step last — the celebration. Confetti fires once on mount (smaller burst
 * under reduced motion), the title pops, then the receipt chips stagger in:
 * a quick visual summary of what was just set up before the student lands
 * on home with their first mission waiting.
 */
export function StepFinish({ displayName, theme, subjectCount, chatEnabled }: StepFinishProps) {
  const reduce = useReducedMotion();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    confetti({
      particleCount: reduce ? 30 : 80,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fb923c', '#f97316', '#a78bfa'],
    });
  }, [reduce]);

  const chips = [
    theme === 'dark' ? '🌙 Night Owl' : '☀️ Day Light',
    subjectCount > 0 ? `${subjectCount} subject${subjectCount > 1 ? 's' : ''} + study plan` : 'Study plan ready',
    chatEnabled ? '💬 Chat on' : '💬 Chat set up',
  ];

  return (
    <div className="text-center space-y-8">
      <div className="space-y-3">
        <motion.h1
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.95)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="text-3xl font-bold"
        >
          You're all set{displayName ? ',' : ''}{' '}
          <span className="text-gradient-gold">{displayName ?? 'Student'}</span>! 🎉
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.15, duration: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          Your study space is ready. First mission starts today.
        </motion.p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip, i) => (
          <motion.span
            key={chip}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: reduce ? 0 : 0.25 + i * 0.08, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary"
          >
            {chip}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        transition={{ delay: reduce ? 0 : 0.5, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Flame className="w-4 h-4 text-destructive" />
        Your streak starts today — keep it alive!
      </motion.div>
    </div>
  );
}
