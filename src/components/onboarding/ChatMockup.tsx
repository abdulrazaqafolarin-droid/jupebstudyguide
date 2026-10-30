import { motion, useReducedMotion } from 'framer-motion';
import { Mic } from 'lucide-react';

const BUBBLE_SPRING = { type: 'spring' as const, stiffness: 400, damping: 24 };

/**
 * The chat step's explainer: a miniature conversation that plays itself in —
 * bubbles pop with a spring, staggered like messages arriving. Purely
 * explanatory motion (students have never seen peer chat here), so it gets
 * the one expressive beat in the flow.
 */
export function ChatMockup() {
  const reduce = useReducedMotion();

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5" aria-hidden>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px) scale(0.97)' }}
        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
        transition={BUBBLE_SPRING}
        className="max-w-[80%] bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 text-sm"
      >
        Did you get Q12 in the 2022 paper? 🔥
      </motion.div>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px) scale(0.97)' }}
        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
        transition={{ ...BUBBLE_SPRING, delay: reduce ? 0 : 0.15 }}
        className="ms-auto max-w-[80%] bg-primary/15 border border-primary/25 rounded-2xl rounded-br-md px-3.5 py-2.5 flex items-center gap-2"
      >
        {/* Voice note with live waveform */}
        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Mic className="w-3 h-3 text-primary-foreground" />
        </span>
        <span className="flex items-center gap-[3px] h-5">
          {[6, 12, 9, 16, 11, 7].map((h, i) => (
            <span
              key={i}
              className={reduce ? '' : 'wave-bar'}
              style={{
                width: 2.5,
                height: h,
                borderRadius: 2,
                background: 'hsl(var(--primary))',
                opacity: 0.75,
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">0:07</span>
      </motion.div>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px) scale(0.97)' }}
        animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
        transition={{ ...BUBBLE_SPRING, delay: reduce ? 0 : 0.3 }}
        className="max-w-[85%] bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 text-sm"
      >
        Yes! Let's revise it together 💡
      </motion.div>
    </div>
  );
}
