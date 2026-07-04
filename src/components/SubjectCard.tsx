import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { ChevronRight, Clock } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  questionCount: number;
  studiedCount: number;
  learnedCount: number;
  onClick: () => void;
  locked?: boolean;
  timeLeft?: string;
  progress?: number;
}

const bouncySpring = { type: "spring" as const, stiffness: 400, damping: 10, mass: 0.7 };

export const SubjectCard = ({
  subject,
  questionCount,
  studiedCount,
  learnedCount,
  onClick,
  locked,
  timeLeft,
  progress: lockProgress,
}: SubjectCardProps) => {
  const info = SUBJECT_INFO[subject];
  const progressPercent = questionCount > 0 ? (learnedCount / questionCount) * 100 : 0;

  return (
    <motion.button
      onClick={locked ? undefined : onClick}
      className="w-full text-left group relative"
      whileHover={locked ? {} : { y: -10, scale: 1.02, transition: bouncySpring }}
      whileTap={locked ? {} : { scale: 0.96, transition: bouncySpring }}
    >
      <div className={cn(
        "bg-card rounded-2xl border p-6 chalk-texture relative overflow-hidden",
        locked && 'opacity-40',
        subject === 'physics' && 'border-physics/20 hover:border-physics/50 hover:bg-physics/[0.03]',
        subject === 'chemistry' && 'border-chemistry/20 hover:border-chemistry/50 hover:bg-chemistry/[0.03]',
        subject === 'biology' && 'border-biology/20 hover:border-biology/50 hover:bg-biology/[0.03]',
        subject === 'math' && 'border-math/20 hover:border-math/50 hover:bg-math/[0.03]',
      )}>
        {locked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/20 dark:bg-black/40 backdrop-blur-[2px]">
            <Clock className="h-6 w-6 text-yellow-400 mb-1" />
            <p className="text-sm font-bold text-white drop-shadow-lg">Coming Soon</p>
            <p className="text-xl font-mono font-bold text-yellow-400 tabular-nums drop-shadow-lg">
              {timeLeft}
            </p>
            <div className="mt-1.5 h-1 w-2/3 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full rounded-full bg-yellow-400 transition-all duration-1000" style={{ width: `${(lockProgress ?? 1) * 100}%` }} />
            </div>
          </div>
        )}
        {/* Glow effect on hover */}
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          subject === 'physics' && 'bg-gradient-to-br from-physics/10 to-transparent',
          subject === 'chemistry' && 'bg-gradient-to-br from-chemistry/10 to-transparent',
          subject === 'biology' && 'bg-gradient-to-br from-biology/10 to-transparent',
          subject === 'math' && 'bg-gradient-to-br from-math/10 to-transparent',
        )} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ x: 4, transition: { type: "spring", stiffness: 300 } }}
            >
              <span className={cn(
                "text-3xl transition-transform duration-300 group-hover:scale-110",
                "inline-block"
              )}>{info.icon}</span>
              <div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-200">{info.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {questionCount} questions
                </p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </motion.div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mastery</span>
              <span className="font-medium text-primary">
                {learnedCount}/{questionCount}
              </span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  subject === 'physics' && 'bg-gradient-to-r from-physics to-physics/70',
                  subject === 'chemistry' && 'bg-gradient-to-r from-chemistry to-chemistry/70',
                  subject === 'biology' && 'bg-gradient-to-r from-biology to-biology/70',
                  subject === 'math' && 'bg-gradient-to-r from-math to-math/70',
                )}
                initial={{ width: 0 }}
                whileInView={{ width: `${progressPercent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>

          {/* Stats */}
          <motion.div
            className="flex gap-4 mt-4 text-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="bg-secondary/40 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Studied </span>
              <span className="font-medium text-foreground">{studiedCount}</span>
            </div>
            <div className="bg-accent/10 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Mastered </span>
              <span className="font-medium text-accent">{learnedCount}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
};
