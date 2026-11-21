import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, Info, Loader2, ShieldCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_CBT_PRACTICE_PRESETS, JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import type { Subject } from "@/types/question";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SelectableSubjectCard } from "@/components/SelectableSubjectCard";
import { useJambStudyPreferences } from "@/hooks/useJambStudyPreferences";
import { getJambCbtAvailableQuestionCount } from "@/lib/jamb-question-service";

export default function JambCbtSetupPage() {
  const navigate = useNavigate();
  const { preferences, isReady: preferencesReady } = useJambStudyPreferences();
  const hasManuallySelectedSubject = useRef(false);
  const [subject, setSubject] = useState<Exclude<Subject, "math">>("physics");
  const [presetIndex, setPresetIndex] = useState(1);
  const [starting, setStarting] = useState(false);
  const [availability, setAvailability] = useState<{
    subject: Exclude<Subject, "math">;
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
    if (preferred && JAMB_SUBJECTS.includes(preferred)) setSubject(preferred);
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

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 chalk-texture md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div>
                  <h1 className="text-xl font-bold">CBT Practice</h1>
                  <p className="text-sm text-muted-foreground">Choose a subject and a practice length.</p>
                </div>
              </div>
            </div>

            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subject</h2>
              <div className="grid grid-cols-2 gap-3">
                {JAMB_SUBJECTS.map((item) => {
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
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Practice length</h2>
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
                        "px-5 py-2.5 rounded-xl border-2 font-semibold transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground",
                        starting && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="block text-lg font-bold tabular-nums">{item.questionCount}</span>
                      <span className="mt-0.5 block text-xs font-medium">{item.durationMinutes} min</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <Clock3 className="h-4 w-4 shrink-0 text-primary" />
                The {preset.questionCount}-question session runs for {preset.durationMinutes} minutes. The timer starts on the server when the attempt is created and will not restart if you refresh.
              </div>
              <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-3 text-xs leading-relaxed" aria-live="polite">
                {availabilityLoading ? (
                  <span className="text-muted-foreground">Checking reviewed JAMB CBT questions for {JAMB_SUBJECT_INFO[subject].label}…</span>
                ) : availabilityError ? (
                  <span className="text-destructive">Could not check question availability. Refresh this page and try again.</span>
                ) : availableQuestions < preset.questionCount ? (
                  <span className="text-muted-foreground">
                    {availableQuestions} eligible A–D questions are published for {JAMB_SUBJECT_INFO[subject].label}. This preset needs {preset.questionCount}; practice will unlock after enough questions are reviewed and published.
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {availableQuestions} eligible A–D questions are available for {JAMB_SUBJECT_INFO[subject].label}.
                  </span>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold">Practice session, not a full UTME mock</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This is single-subject practice, not a complete UTME mock. Full-mock settings remain disabled pending official format verification.
                  </p>
                </div>
              </div>
            </section>

            <Button
              onClick={startPractice}
              disabled={starting || !enoughQuestions}
              size="lg"
              className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
            >
              {starting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing session…</>
              ) : availabilityLoading ? (
                "Checking question availability…"
              ) : availabilityError ? (
                "Availability unavailable"
              ) : availableQuestions < preset.questionCount ? (
                "Awaiting reviewed questions"
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" />Start timed practice</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
