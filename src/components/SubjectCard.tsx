import { cn } from '@/lib/utils';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { ChevronRight } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  questionCount: number;
  studiedCount: number;
  learnedCount: number;
  onClick: () => void;
}

export const SubjectCard = ({
  subject,
  questionCount,
  studiedCount,
  learnedCount,
  onClick,
}: SubjectCardProps) => {
  const info = SUBJECT_INFO[subject];
  const progressPercent = questionCount > 0 ? (learnedCount / questionCount) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className={cn(
        "bg-card rounded-2xl border p-6 chalk-texture relative overflow-hidden",
        "transition-all duration-300",
        "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/20",
        subject === 'physics' && 'border-physics/20 hover:border-physics/50 hover:bg-physics/[0.03]',
        subject === 'chemistry' && 'border-chemistry/20 hover:border-chemistry/50 hover:bg-chemistry/[0.03]',
        subject === 'biology' && 'border-biology/20 hover:border-biology/50 hover:bg-biology/[0.03]',
        subject === 'math' && 'border-math/20 hover:border-math/50 hover:bg-math/[0.03]',
      )}>
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
            <div className="flex items-center gap-3">
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
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
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
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  subject === 'physics' && 'bg-gradient-to-r from-physics to-physics/70',
                  subject === 'chemistry' && 'bg-gradient-to-r from-chemistry to-chemistry/70',
                  subject === 'biology' && 'bg-gradient-to-r from-biology to-biology/70',
                  subject === 'math' && 'bg-gradient-to-r from-math to-math/70',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="bg-secondary/40 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Studied </span>
              <span className="font-medium text-foreground">{studiedCount}</span>
            </div>
            <div className="bg-accent/10 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Mastered </span>
              <span className="font-medium text-accent">{learnedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
