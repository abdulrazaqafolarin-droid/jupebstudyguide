import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO, type JambSubject } from "@/lib/jamb-config";
import type { JambExamTarget, JambStudyPreferences } from "@/lib/jamb-study-preferences";
import { cn } from "@/lib/utils";
import { MAX_SCHOOL_NAME_LENGTH, parseSeatNumber } from "@/lib/profile-fields";

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
  subjects: JambSubject[];
  examTarget: JambExamTarget;
  dailyGoalMinutes: JambStudyPreferences["dailyGoalMinutes"];
  schoolName: string;
  examSeatNumber: string;
  onToggleSubject: (subject: JambSubject) => void;
  onExamTarget: (target: JambExamTarget) => void;
  onDailyGoal: (minutes: JambStudyPreferences["dailyGoalMinutes"]) => void;
  onSchoolName: (value: string) => void;
  onExamSeatNumber: (value: string) => void;
}

/** JAMB counterpart to JUPEB's study-plan step, without inventing a syllabus. */
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
        <h2 className="text-2xl font-bold">Set up your JAMB study plan</h2>
        <p className="text-sm text-muted-foreground">
          Choose the subjects you want to focus on and set a daily practice goal. These are preferences, not an official subject-combination check.
        </p>
      </div>
      <section className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">UTME subject guide</p>
        <div className="relative flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
          <span className="text-2xl">📘</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Use of English</p>
            <p className="text-[10px] text-muted-foreground">Compulsory paper · Rutex question content pending</p>
          </div>
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {JAMB_SUBJECTS.map((subject) => {
            const info = JAMB_SUBJECT_INFO[subject];
            const selected = subjects.includes(subject);
            return (
              <motion.button
                key={subject}
                type="button"
                onClick={() => onToggleSubject(subject)}
                aria-pressed={selected}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-colors",
                  selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/30",
                )}
              >
                <span className="text-2xl">{info.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{info.label}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {selected ? "Pinned to your focus" : "Add to your focus"}
                  </span>
                </span>
                {selected && (
                  <motion.span
                    initial={{ opacity: 0, transform: "scale(0.6)" }}
                    animate={{ opacity: 1, transform: "scale(1)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-border bg-secondary/20 p-3 opacity-80" aria-disabled="true">
            <span className="text-2xl">{JAMB_SUBJECT_INFO.math.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{JAMB_SUBJECT_INFO.math.label}</span>
              <span className="block text-[10px] text-muted-foreground">Rutex question content pending review</span>
            </span>
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Select any of the science subjects currently available in Rutex. Your preferences do not change your official UTME subject combination. More subjects will appear when their question content has been reviewed and published.
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
        <p className="text-[10px] text-muted-foreground">Shown as a tag on your profile where school details are visible.</p>
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
      <div className="rounded-xl border border-border bg-secondary/20 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The JAMB syllabus and topic-led daily lessons are still being verified. Rutex will not substitute JUPEB topics or mark unreviewed questions as correct.
        </p>
      </div>
    </div>
  );
}
