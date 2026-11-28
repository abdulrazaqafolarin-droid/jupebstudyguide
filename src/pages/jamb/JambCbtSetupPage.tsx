import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, Info, Loader2, ShieldCheck, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_CBT_PRACTICE_PRESETS, JAMB_SUBJECT_INFO, JAMB_QUESTION_BANK_SUBJECTS, type JambSubject } from "@/lib/jamb-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SelectableSubjectCard } from "@/components/SelectableSubjectCard";
import { WorkspaceSetupPanel } from "@/components/WorkspaceSetupPanel";
import { useJambStudyPreferences } from "@/hooks/useJambStudyPreferences";
import { getJambCbtAvailableQuestionCount } from "@/lib/jamb-question-service";

export default function JambCbtSetupPage() {
  const navigate = useNavigate();
  const { preferences, isReady: preferencesReady } = useJambStudyPreferences();
  const hasManuallySelectedSubject = useRef(false);
  const [subject, setSubject] = useState<JambSubject>("physics");
  const [presetIndex, setPresetIndex] = useState(1);
  const [starting, setStarting] = useState(false);
  const [availability, setAvailability] = useState<{
    subject: JambSubject;
    count: number;
    loading: boolean;
    error: boolean;
  }>({ subject: "physics", count: 0, loading: true, error: false });
  const idempotencyKeyRef = useRef<string | null>(null);
  const preset = JAMB_CBT_PRACTICE_PRESETS[presetIndex];
  const availabilityIsCurrent = availability.subject === subject;
  const availabilityLoading = !availabilityIsCurrent || availability.loading;
  const availabilityError = availabilityIsCurrent && availability.error;
  const availableQuestions = availabilityIsCurrent ? availability.count : 0;
  const enoughQuestions = !availabilityLoading && !availabilityError && availableQuestions >= preset.questionCount;

  useEffect(() => {
    if (!preferencesReady || hasManuallySelectedSubject.current) return;
    const preferred = preferences.subjects[0];
    if (preferred && JAMB_QUESTION_BANK_SUBJECTS.includes(preferred)) setSubject(preferred);
  }, [preferencesReady, preferences.subjects]);

  useEffect(() => {
    let active = true;
    setAvailability({ subject, count: 0, loading: true, error: false });
    getJambCbtAvailableQuestionCount(subject)
      .then((count) => {
        if (active) setAvailability({ subject, count, loading: false, error: false });
      })
      .catch((reason: unknown) => {
        console.error("[jamb-cbt] availability check failed:", reason);
        if (active) setAvailability({ subject, count: 0, loading: false, error: true });
      });
    return () => { active = false; };
  }, [subject]);

  const startPractice = async () => {
    if (!enoughQuestions) return;
    setStarting(true);
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    try {
      const { data, error } = await supabase.functions.invoke("exam-attempts", {
        body: {
          action: "create",
          exam_program_id: "jamb",
          exam_year: new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0),
          subject,
          question_count: preset.questionCount,
          duration_minutes: preset.durationMinutes,
          attempt_kind: "subject_practice",
          idempotency_key: idempotencyKey,
        },
      });
      if (error) throw error;
      if (!data?.attempt_id) throw new Error(data?.error ?? "The CBT practice session could not be created.");
      navigate(`/jamb/cbt/${data.attempt_id}`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to start CBT practice.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-28">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/jamb"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <WorkspaceSetupPanel
          title="CBT Practice"
          description="Pick a subject and how many questions you want."
          icon={<Target className="h-5 w-5 text-primary" />}
        >
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subject</h2>
              <div className="grid grid-cols-2 gap-3">
                {JAMB_QUESTION_BANK_SUBJECTS.map((item) => {
                  const selected = subject === item;
                  const info = JAMB_SUBJECT_INFO[item];
                  return (
                    <SelectableSubjectCard
                      key={item}
                      icon={info.icon}
                      label={info.label}
                      description={<span className="line-clamp-2">{info.description}</span>}
                      selected={selected}
                      disabled={starting}
                      onSelect={() => {
                        idempotencyKeyRef.current = null;
                        hasManuallySelectedSubject.current = true;
                        setSubject(item);
                      }}
                    />
                  );
                })}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Question count</h2>
              <div className="flex flex-wrap gap-2">
                {JAMB_CBT_PRACTICE_PRESETS.map((item, index) => {
                  const selected = presetIndex === index;
                  return (
                    <button
                      key={item.questionCount}
                      type="button"
                      disabled={starting}
                      onClick={() => {
                        idempotencyKeyRef.current = null;
                        setPresetIndex(index);
                      }}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-xl border-2 px-5 py-2.5 font-semibold transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:border-primary/50",
                        starting && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="block text-lg font-bold tabular-nums">{item.questionCount}</span>
                      <span className="mt-0.5 block text-xs font-medium">{item.durationMinutes} min</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Practice size</span>
                </div>
                <span className="text-2xl font-bold text-primary tabular-nums">{preset.questionCount}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {JAMB_SUBJECT_INFO[subject].label} · {preset.durationMinutes} min
              </p>
              <p
                className={cn(
                  "mt-2 text-xs leading-relaxed",
                  availabilityError ? "text-destructive" : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {availabilityLoading
                  ? "Checking reviewed questions…"
                  : availabilityError
                    ? "Question availability could not be checked. Refresh and try again."
                    : availableQuestions < preset.questionCount
                      ? availableQuestions + " eligible questions available · " + preset.questionCount + " required"
                      : availableQuestions + " eligible questions available"}
              </p>
              <details className="mt-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5 text-primary" />
                  Session details
                </summary>
                <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                  <p>The server timer starts when the attempt is created and does not restart if you refresh.</p>
                  <p>This is single-subject practice, not a full UTME mock. Full-mock settings remain disabled pending official format verification.</p>
                </div>
              </details>
            </section>

            <Button
              onClick={startPractice}
              disabled={starting || !enoughQuestions}
              size="lg"
              className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            >
              {starting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing session…</>
              ) : availabilityLoading ? (
                "Checking availability…"
              ) : availabilityError ? (
                "Availability unavailable"
              ) : availableQuestions < preset.questionCount ? (
                "Not enough questions"
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" />Start timed practice</>
              )}
            </Button>
        </WorkspaceSetupPanel>
      </div>
    </main>
  );
}
