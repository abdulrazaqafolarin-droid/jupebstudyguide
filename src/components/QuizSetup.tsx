import { useMemo, useState } from 'react';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, Target, Sparkles } from 'lucide-react';

export interface QuizPlan {
  /** Per-subject question counts. Subject is omitted when count is 0. */
  perSubject: Partial<Record<Subject, number>>;
  /** True when user picked the "same count across subjects" mode. */
  uniform: boolean;
}

interface QuizSetupProps {
  /** How many questions exist for each subject (after merging custom + built-in). */
  available: Record<Subject, number>;
  onStart: (plan: QuizPlan) => void;
  onBack: () => void;
}

const COUNT_PRESETS = [15, 30, 50] as const;
const ALL_SUBJECTS: Subject[] = ['physics', 'chemistry', 'biology', 'math'];

export const QuizSetup = ({ available, onStart, onBack }: QuizSetupProps) => {
  const [selected, setSelected] = useState<Set<Subject>>(
    new Set(ALL_SUBJECTS.filter(s => available[s] > 0)),
  );
  const [mode, setMode] = useState<'uniform' | 'custom'>('uniform');
  const [uniformCount, setUniformCount] = useState<number>(15);
  const [perSubject, setPerSubject] = useState<Record<Subject, number>>({
    physics: 15,
    chemistry: 15,
    biology: 15,
    math: 15,
  });

  const toggleSubject = (s: Subject) => {
    if (available[s] === 0) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const plan = useMemo<QuizPlan>(() => {
    const out: Partial<Record<Subject, number>> = {};
    selected.forEach(s => {
      const desired = mode === 'uniform' ? uniformCount : perSubject[s];
      const capped = Math.min(desired, available[s]);
      if (capped > 0) out[s] = capped;
    });
    return { perSubject: out, uniform: mode === 'uniform' };
  }, [selected, mode, uniformCount, perSubject, available]);

  const totalQuestions = Object.values(plan.perSubject).reduce((a, b) => a + (b ?? 0), 0);
  const canStart = totalQuestions > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-card rounded-2xl border border-border p-6 md:p-8 chalk-texture">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Build your quiz</h2>
            <p className="text-sm text-muted-foreground">
              Pick subjects and how many questions you want from each.
            </p>
          </div>
        </div>

        {/* Subjects */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Subjects
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ALL_SUBJECTS.map(subject => {
              const info = SUBJECT_INFO[subject];
              const count = available[subject];
              const isSelected = selected.has(subject);
              const disabled = count === 0;
              return (
                <button
                  key={subject}
                  onClick={() => toggleSubject(subject)}
                  disabled={disabled}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all',
                    'flex items-center gap-3',
                    disabled && 'opacity-40 cursor-not-allowed',
                    !disabled && isSelected && 'border-primary bg-primary/10',
                    !disabled && !isSelected && 'border-border hover:border-primary/50 bg-secondary/30',
                  )}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{count} available</p>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode toggle */}
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Question count
          </h3>
          <div className="inline-flex p-1 rounded-lg bg-secondary/40 border border-border mb-4">
            {(['uniform', 'custom'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  mode === m ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground',
                )}
              >
                {m === 'uniform' ? 'Same for all' : 'Per subject'}
              </button>
            ))}
          </div>

          {mode === 'uniform' ? (
            <div className="flex flex-wrap gap-2">
              {COUNT_PRESETS.map(n => (
                <button
                  key={n}
                  onClick={() => setUniformCount(n)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl border-2 font-semibold transition-all',
                    uniformCount === n
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {ALL_SUBJECTS.filter(s => selected.has(s)).map(subject => {
                const info = SUBJECT_INFO[subject];
                const max = available[subject];
                return (
                  <div key={subject} className="flex items-center gap-3">
                    <span className="w-28 text-sm flex items-center gap-2">
                      <span>{info.icon}</span> {info.name}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {COUNT_PRESETS.map(n => {
                        const capped = Math.min(n, max);
                        return (
                          <button
                            key={n}
                            onClick={() =>
                              setPerSubject(p => ({ ...p, [subject]: n }))
                            }
                            disabled={max === 0}
                            className={cn(
                              'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                              perSubject[subject] === n
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/50',
                            )}
                          >
                            {capped}
                            {capped < n && <span className="opacity-60"> /{n}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {selected.size === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Pick at least one subject above.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Quiz size</span>
            </div>
            <span className="text-2xl font-bold text-primary">{totalQuestions}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Questions are kept strictly within each subject — no cross-subject mixing.
          </p>
        </section>

        <Button
          onClick={() => onStart(plan)}
          disabled={!canStart}
          className="w-full mt-6 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          size="lg"
        >
          Start Quiz
        </Button>
      </div>
    </div>
  );
};
