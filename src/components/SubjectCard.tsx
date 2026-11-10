import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { ArrowUpRight } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  questionCount: number;
  studiedCount: number;
  learnedCount: number;
  onClick: () => void;
}

const subjectStyles: Record<Subject, { border: string; icon: string; bar: string; glow: string }> = {
  physics: {
    border: 'hover:border-physics/50',
    icon: 'bg-physics/10 text-physics',
    bar: 'bg-gradient-to-r from-physics to-physics/65',
    glow: 'from-physics/[0.09] via-transparent to-transparent',
  },
  chemistry: {
    border: 'hover:border-chemistry/50',
    icon: 'bg-chemistry/10 text-chemistry',
    bar: 'bg-gradient-to-r from-chemistry to-chemistry/65',
    glow: 'from-chemistry/[0.09] via-transparent to-transparent',
  },
  biology: {
    border: 'hover:border-biology/50',
    icon: 'bg-biology/10 text-biology',
    bar: 'bg-gradient-to-r from-biology to-biology/65',
    glow: 'from-biology/[0.09] via-transparent to-transparent',
  },
  math: {
    border: 'hover:border-math/50',
    icon: 'bg-math/10 text-math',
    bar: 'bg-gradient-to-r from-math to-math/65',
    glow: 'from-math/[0.09] via-transparent to-transparent',
  },
};

const cardMotion = {
  transition: { type: 'spring' as const, stiffness: 360, damping: 26, mass: 0.8 },
};

export const SubjectCard = ({
  subject,
  questionCount,
  studiedCount,
  learnedCount,
  onClick,
}: SubjectCardProps) => {
  const info = SUBJECT_INFO[subject];
  const styles = subjectStyles[subject];
  const reduceMotion = useReducedMotion();
  const progressPercent = questionCount > 0
    ? Math.min(100, Math.max(0, (learnedCount / questionCount) * 100))
    : 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Study ${info.name}: ${questionCount} questions, ${learnedCount} mastered`}
      whileHover={reduceMotion ? undefined : { y: -3, ...cardMotion }}
      whileTap={reduceMotion ? undefined : { scale: 0.985, transition: cardMotion.transition }}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card p-5 text-left shadow-sm',
        'transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-lg hover:shadow-black/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        styles.border,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100', styles.glow)} />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', styles.icon)}>
              {info.icon}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {info.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {questionCount.toLocaleString()} questions
              </p>
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-all duration-200 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">Mastery</span>
            <span className="font-semibold tabular-nums text-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary/90"
            role="progressbar"
            aria-label={`${info.name} mastery`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
          >
            <motion.div
              className={cn('h-full rounded-full', styles.bar)}
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 22 }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px]">
          <span className="rounded-lg bg-secondary/65 px-2.5 py-1.5 text-muted-foreground">
            Studied <strong className="ml-1 font-semibold tabular-nums text-foreground">{studiedCount.toLocaleString()}</strong>
          </span>
          <span className="rounded-lg bg-accent/10 px-2.5 py-1.5 text-muted-foreground">
            Mastered <strong className="ml-1 font-semibold tabular-nums text-accent">{learnedCount.toLocaleString()}</strong>
          </span>
        </div>
      </div>
    </motion.button>
  );
};
