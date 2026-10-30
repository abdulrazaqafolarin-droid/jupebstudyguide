import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { SUBJECT_INFO, type Subject } from '@/types/question';
import { cn } from '@/lib/utils';

const CORE: Subject[] = ['physics', 'chemistry'];
const ELECTIVES: Subject[] = ['biology', 'math'];

/** Explicit map — Tailwind can't generate classes from template literals. */
const SELECTED_CLASS: Record<Subject, string> = {
  physics: 'border-physics bg-physics/10',
  chemistry: 'border-chemistry bg-chemistry/10',
  biology: 'border-biology bg-biology/10',
  math: 'border-math bg-math/10',
};

const EXAM_TARGETS = [
  { id: 'this-session', label: 'This session' },
  { id: 'next-session', label: 'Next session' },
  { id: 'early', label: 'Preparing early' },
];

const DAILY_GOALS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
];

interface StepStudySetupProps {
  electives: Subject[];
  examTarget: string;
  dailyGoalMinutes: number;
  onToggleElective: (subject: Subject) => void;
  onExamTarget: (id: string) => void;
  onDailyGoal: (minutes: number) => void;
}

/**
 * Step 2 — the study engine's inputs. Core subjects are locked on (the
 * 30-day syllabus requires them); electives, exam target and daily goal
 * are one-tap choices that pre-seed the syllabus and mission copy.
 */
export function StepStudySetup({
  electives,
  examTarget,
  dailyGoalMinutes,
  onToggleElective,
  onExamTarget,
  onDailyGoal,
}: StepStudySetupProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Build your study plan</h2>
        <p className="text-sm text-muted-foreground">
          These set up your 30-Day Syllabus and Daily Missions.
        </p>
      </div>

      {/* Subjects */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your subjects</p>
        <div className="grid grid-cols-2 gap-2.5">
          {CORE.map((subject) => {
            const info = SUBJECT_INFO[subject];
            return (
              <div
                key={subject}
                className="relative rounded-xl border-2 border-primary/40 bg-primary/5 p-3 flex items-center gap-2.5"
              >
                <span className="text-2xl">{info.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{info.name}</p>
                  <p className="text-[10px] text-muted-foreground">Required</p>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground ms-auto shrink-0" aria-hidden />
              </div>
            );
          })}
          {ELECTIVES.map((subject) => {
            const info = SUBJECT_INFO[subject];
            const isSelected = electives.includes(subject);
            return (
              <motion.button
                key={subject}
                onClick={() => onToggleElective(subject)}
                aria-pressed={isSelected}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'rounded-xl border-2 p-3 flex items-center gap-2.5 text-left transition-colors duration-150',
                  isSelected
                    ? cn(SELECTED_CLASS[subject], 'border-2')
                    : 'border-border hover:border-primary/30',
                )}
              >
                <span className="text-2xl">{info.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{info.name}</p>
                  <p className="text-[10px] text-muted-foreground">{isSelected ? 'Added' : 'Elective'}</p>
                </div>
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0, transform: 'scale(0.6)' }}
                    animate={{ opacity: 1, transform: 'scale(1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="ms-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: `hsl(var(--${info.color}))` }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Exam target */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">When are you writing?</p>
        <div className="flex gap-2">
          {EXAM_TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => onExamTarget(t.id)}
              aria-pressed={examTarget === t.id}
              className={cn(
                'flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150',
                examTarget === t.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily goal */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Daily study goal</p>
        <div className="flex gap-2">
          {DAILY_GOALS.map((g) => (
            <button
              key={g.minutes}
              onClick={() => onDailyGoal(g.minutes)}
              aria-pressed={dailyGoalMinutes === g.minutes}
              className={cn(
                'flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150',
                dailyGoalMinutes === g.minutes
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
