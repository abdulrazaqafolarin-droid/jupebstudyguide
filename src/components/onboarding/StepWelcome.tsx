import { motion, useReducedMotion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

/**
 * Step 0 — the brand moment. The crest springs in first, then the headline,
 * then the student's name rises word by word under a one-time gold sweep.
 * Nothing here asks for a decision; it exists to make the student feel
 * expected.
 */
export function StepWelcome({ displayName }: { displayName: string | null }) {
  const reduce = useReducedMotion();
  const words = (displayName ?? 'Student').trim().split(/\s+/).slice(0, 3);

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 0.9 }}
        className="mx-auto w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center glow-gold shadow-lg shadow-primary/25"
      >
        <GraduationCap className="w-12 h-12 text-primary-foreground" strokeWidth={1.75} />
      </motion.div>

      <div className="space-y-3">
        <motion.h1
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px)' }}
          animate={{ opacity: 1, transform: 'translateY(0)' }}
          transition={{ delay: reduce ? 0 : 0.15, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="text-3xl font-bold leading-tight"
        >
          Welcome to{' '}
          <span className="text-gradient-gold text-shimmer-sweep">JUPEB Master</span>
        </motion.h1>

        <p className="text-muted-foreground text-lg font-medium flex flex-wrap justify-center gap-x-2" aria-label={`Welcome ${words.join(' ')}`}>
          {words.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: reduce ? 0 : 0.3 + i * 0.08 }}
              className="text-foreground"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.3 + words.length * 0.08 }}
            className="text-foreground"
          >
            👋
          </motion.span>
        </p>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.5, duration: 0.3 }}
        className="text-sm text-muted-foreground"
      >
        Let's set up your study space — about 30 seconds.
      </motion.p>
    </div>
  );
}
