import { Input } from "@/components/ui/input";
import { OnboardingSubjectTile } from "@/components/onboarding/OnboardingSubjectTile";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import type { JambScienceSubject, JambExamTarget, JambStudyPreferences } from "@/lib/jamb-study-preferences";
import { cn } from "@/lib/utils";
import { MAX_SCHOOL_NAME_LENGTH, parseSeatNumber } from "@/lib/profile-fields";

const SELECTED_SUBJECT_STYLE: Record<JambScienceSubject, { card: string; icon: string }> = {
  physics: { card: "border-physics bg-physics/10", icon: "hsl(var(--physics))" },
  chemistry: { card: "border-chemistry bg-chemistry/10", icon: "hsl(var(--chemistry))" },
  biology: { card: "border-biology bg-biology/10", icon: "hsl(var(--biology))" },
};

const EXAM_TARGETS = [
  { id: "this-session", label: "This session" },
  { id: "next-session", label: "Next session" },
  { id: "early", label: "Preparing early" },
] as const;

const DAILY_GOALS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "60 min" },
] as const;

interface StepJambStudySetupProps {
  subjects: JambScienceSubject[];
  examTarget: JambExamTarget;
  dailyGoalMinutes: JambStudyPreferences["dailyGoalMinutes"];
  schoolName: string;
  examSeatNumber: string;
  onToggleSubject: (subject: JambScienceSubject) => void;
  onExamTarget: (target: JambExamTarget) => void;
  onDailyGoal: (minutes: JambStudyPreferences["dailyGoalMinutes"]) => void;
  onSchoolName: (value: string) => void;
  onExamSeatNumber: (value: string) => void;
}

/** JAMB subject rules and availability, using the shared JUPEB setup structure. */
export function StepJambStudySetup({
  subjects,
  examTarget,
  dailyGoalMinutes,
  schoolName,
  examSeatNumber,
  onToggleSubject,
  onExamTarget,
  onDailyGoal,
  onSchoolName,
  onExamSeatNumber,
}: StepJambStudySetupProps) {
  const seatInvalid = examSeatNumber.trim().length > 0 && parseSeatNumber(examSeatNumber).status === "invalid";

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Build your study plan</h2>
        <p className="text-sm text-muted-foreground">
          These set up your JAMB revision and Daily Missions.
        </p>
      </div>

      <section className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your subjects</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <OnboardingSubjectTile
            variant="required"
            icon={JAMB_SUBJECT_INFO.use_of_english.icon}
            title={JAMB_SUBJECT_INFO.use_of_english.label}
            subtitle="Required · content pending"
          />
          {JAMB_SUBJECTS.map((subject) => {
            const info = JAMB_SUBJECT_INFO[subject];
            const selected = subjects.includes(subject);
            const style = SELECTED_SUBJECT_STYLE[subject];
            return (
              <OnboardingSubjectTile
                key={subject}
                icon={info.icon}
                title={info.label}
                subtitle={selected ? "Added" : "Elective"}
                selected={selected}
                selectedClassName={style.card}
                selectedIconBackground={style.icon}
                onClick={() => onToggleSubject(subject)}
              />
            );
          })}
          <OnboardingSubjectTile
            variant="unavailable"
            icon={JAMB_SUBJECT_INFO.math.icon}
            title={JAMB_SUBJECT_INFO.math.label}
            subtitle="Pending review"
          />
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Subject choices are study preferences, not official UTME combination advice. More question content is added after review.
        </p>
      </section>

      <section className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">When are you writing?</p>
        <div className="flex gap-2">
          {EXAM_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onExamTarget(target.id)}
              aria-pressed={examTarget === target.id}
              className={cn(
                "flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150",
                examTarget === target.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              {target.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Daily study goal</p>
        <div className="flex gap-2">
          {DAILY_GOALS.map((goal) => (
            <button
              key={goal.minutes}
              type="button"
              onClick={() => onDailyGoal(goal.minutes)}
              aria-pressed={dailyGoalMinutes === goal.minutes}
              className={cn(
                "flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150",
                dailyGoalMinutes === goal.minutes ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your school</p>
        <Input
          value={schoolName}
          onChange={(event) => onSchoolName(event.target.value)}
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
          onChange={(event) => onExamSeatNumber(event.target.value)}
          placeholder="Exam seat number (optional)"
          inputMode="numeric"
          maxLength={12}
          aria-label="Exam seat number"
          className={cn("bg-background/50", seatInvalid && "border-destructive")}
        />
        <p className={cn("text-[10px]", seatInvalid ? "text-destructive" : "text-muted-foreground")}>
          {seatInvalid ? "Type the last 3 or 4 digits — e.g. 4321" : "Last 3 or 4 digits on your ID card. Optional — only you can see it."}
        </p>
      </section>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        JAMB syllabus content is under review; only verified answer keys can be graded.
      </p>
    </div>
  );
}
