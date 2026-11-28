import { OnboardingSubjectTile } from '@/components/onboarding/OnboardingSubjectTile';
import { SUBJECT_INFO, type Subject } from '@/types/question';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { MAX_SCHOOL_NAME_LENGTH, parseSeatNumber } from '@/lib/profile-fields';

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
  schoolName: string;
  examSeatNumber: string;
  onToggleElective: (subject: Subject) => void;
  onExamTarget: (id: string) => void;
  onDailyGoal: (minutes: number) => void;
  onSchoolName: (value: string) => void;
  onExamSeatNumber: (value: string) => void;
}

/**
 * Step 2 — the study engine's inputs. Core subjects are locked on (the
 * 30-day syllabus requires them); electives, exam target and daily goal
 * are one-tap choices that pre-seed the syllabus and mission copy. School
 * becomes the tag on the student's profile; the exam seat number is
 * optional own-profile text (last 3-4 digits of the ID card).
 */
export function StepStudySetup({
  electives,
  examTarget,
  dailyGoalMinutes,
  schoolName,
  examSeatNumber,
  onToggleElective,
  onExamTarget,
  onDailyGoal,
  onSchoolName,
  onExamSeatNumber,
}: StepStudySetupProps) {
  const seatInvalid =
    examSeatNumber.trim().length > 0 && parseSeatNumber(examSeatNumber).status === 'invalid';

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
              <OnboardingSubjectTile
                key={subject}
                variant="required"
                icon={info.icon}
                title={info.name}
                subtitle="Required"
              />
            );
          })}
          {ELECTIVES.map((subject) => {
            const info = SUBJECT_INFO[subject];
            const isSelected = electives.includes(subject);
            return (
              <OnboardingSubjectTile
                key={subject}
                icon={info.icon}
                title={info.name}
                subtitle={isSelected ? "Added" : "Elective"}
                selected={isSelected}
                selectedClassName={SELECTED_CLASS[subject]}
                selectedIconBackground={`hsl(var(--${info.color}))`}
                onClick={() => onToggleElective(subject)}
              />
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

      {/* School tag + optional exam seat number */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your school</p>
        <Input
          value={schoolName}
          onChange={(e) => onSchoolName(e.target.value)}
          placeholder="e.g. Baptist High School"
          maxLength={MAX_SCHOOL_NAME_LENGTH}
          aria-label="School name"
          className="bg-background/50"
        />
        <p className="text-[10px] text-muted-foreground">
          Shown as a tag on your profile everywhere it appears — leaderboard, chat, groups.
        </p>
        <Input
          value={examSeatNumber}
          onChange={(e) => onExamSeatNumber(e.target.value)}
          placeholder="Exam seat number (optional)"
          inputMode="numeric"
          maxLength={12}
          aria-label="Exam seat number"
          className={cn('bg-background/50', seatInvalid && 'border-destructive')}
        />
        <p className={cn('text-[10px]', seatInvalid ? 'text-destructive' : 'text-muted-foreground')}>
          {seatInvalid
            ? 'Type the last 3 or 4 digits — e.g. 4321'
            : 'Last 3 or 4 digits on your ID card. Optional — only you can see it.'}
        </p>
      </div>
    </div>
  );
}
