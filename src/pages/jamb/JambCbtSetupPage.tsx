import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock3, Info, Loader2, ShieldCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_CBT_PRACTICE_PRESETS, JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import type { Subject } from "@/types/question";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function JambCbtSetupPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Exclude<Subject, "math">>("physics");
  const [presetIndex, setPresetIndex] = useState(1);
  const [starting, setStarting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const preset = JAMB_CBT_PRACTICE_PRESETS[presetIndex];

  const startPractice = async () => {
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
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to JAMB workspace
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
                <h1 className="text-xl font-bold">Set up your CBT practice</h1>
                <p className="text-sm text-muted-foreground">Choose a JAMB subject and a focused practice length.</p>
              </div>
            </div>

            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Subject</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {JAMB_SUBJECTS.map((item) => {
                  const selected = subject === item;
                  const info = JAMB_SUBJECT_INFO[item];
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={starting}
                      onClick={() => {
                        idempotencyKeyRef.current = null;
                        setSubject(item);
                      }}
                      aria-pressed={selected}
                      className={cn(
                        "relative flex min-h-28 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50",
                        starting && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="text-3xl" aria-hidden="true">{info.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{info.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{info.description}</span>
                      </span>
                      {selected && (
                        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">JAMB question selection is isolated from the JUPEB question bank.</p>
            </section>

            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Practice length</h2>
              <div className="grid gap-3 sm:grid-cols-3">
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
                        "rounded-xl border-2 p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/20 hover:border-primary/50",
                        starting && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="block text-2xl font-bold tabular-nums">{item.questionCount}</span>
                      <span className="mt-1 block text-sm font-semibold">{item.label.split(" · ")[0]}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" /> {item.durationMinutes} minutes
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <Clock3 className="h-4 w-4 shrink-0 text-primary" />
                The {preset.questionCount}-question session runs for {preset.durationMinutes} minutes. The timer starts on the server when the attempt is created and will not restart if you refresh.
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold">Practice session, not a full UTME mock</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This is a single-subject timed practice session, not a complete official UTME mock. Use of English is compulsory in UTME and is not part of the initial supplied question set. The current official manual and syllabus must be verified before full-mock settings are enabled.
                  </p>
                </div>
              </div>
            </section>

            <Button
              onClick={startPractice}
              disabled={starting}
              size="lg"
              className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
            >
              {starting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing session…</>
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
