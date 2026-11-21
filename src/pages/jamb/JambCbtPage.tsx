import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QuestionMath } from "@/components/QuestionMath";
import { QuestionOptionButton } from "@/components/QuestionOptionButton";
import { QuestionImage } from "@/components/QuestionImage";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";

interface AttemptQuestion {
  sequence: number;
  question_id: string;
  subject: string;
  question_snapshot: {
    question: string;
    options: Array<{ label: string; text: string }>;
    imageUrls?: string[];
    year?: number;
  };
}
interface AttemptPayload {
  attempt: { id: string; status: string; expires_at: string; started_at: string; exam_year: number };
  questions: AttemptQuestion[];
  answers: Array<{ question_sequence: number; selected_option: string | null; marked_for_review: boolean }>;
  result?: { score: number | null; correct: number; wrong: number; ungraded: number; total: number; gradable: number };
}
interface ReviewQuestion {
  sequence: number;
  question_id: string;
  question_snapshot: AttemptQuestion["question_snapshot"];
  selected_option: string | null;
  marked_for_review: boolean;
  gradable: boolean;
  correct_answer: string | null;
  is_correct: boolean | null;
  explanation: string | null;
}

export default function JambCbtPage() {
  const { attemptId } = useParams();
  const shouldReduceMotion = useReducedMotion();
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewQuestion[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const pendingSavesRef = useRef(new Map<number, Promise<void>>());
  const answersRef = useRef<Record<number, string>>({});
  const markedRef = useRef<Record<number, boolean>>({});
  const question = payload?.questions[current];

  const refreshAttempt = useCallback(async () => {
    if (!attemptId) return;
    const { data, error: invokeError } = await supabase.functions.invoke("exam-attempts", {
      body: { action: "get", exam_program_id: "jamb", attempt_id: attemptId },
    });
    if (invokeError) throw invokeError;
    if (!data?.attempt) throw new Error(data?.error ?? "Attempt unavailable.");
    const result = data as AttemptPayload;
    setPayload(result);
    const restored: Record<number, string> = {};
    const flags: Record<number, boolean> = {};
    (result.answers ?? []).forEach((answer) => {
      if (answer.selected_option) restored[answer.question_sequence] = answer.selected_option;
      if (answer.marked_for_review) flags[answer.question_sequence] = true;
    });
    answersRef.current = restored;
    markedRef.current = flags;
    setAnswers(restored);
    setMarked(flags);
    setSecondsLeft(Math.max(0, Math.floor((new Date(result.attempt.expires_at).getTime() - Date.now()) / 1000)));
    return result;
  }, [attemptId]);

  const loadReview = useCallback(async () => {
    if (!attemptId) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("exam-attempts", {
        body: { action: "review", exam_program_id: "jamb", attempt_id: attemptId },
      });
      if (invokeError) throw invokeError;
      setReview((data?.review ?? []) as ReviewQuestion[]);
      if (data?.attempt) {
        setPayload((previous) => previous
          ? { ...previous, attempt: data.attempt, result: data.result ?? previous.result }
          : previous);
      }
    } catch (reason) {
      setReviewError(reason instanceof Error ? reason.message : "The answer review could not be loaded.");
    } finally {
      setReviewLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await refreshAttempt();
        if (active && (result.attempt.status === "submitted" || result.attempt.status === "expired")) {
          await loadReview();
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load attempt.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshAttempt, loadReview]);

  useEffect(() => {
    if (!payload?.attempt || payload.attempt.status !== "in_progress") return;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((new Date(payload.attempt.expires_at).getTime() - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [payload?.attempt?.expires_at, payload?.attempt?.status]);

  useEffect(() => {
    if (!payload?.attempt || payload.attempt.status !== "in_progress" || secondsLeft > 0 || submitting) return;
    void submitAttempt(true);
  // submitAttempt is intentionally stable through the callback below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, payload?.attempt?.status]);

  const persistAnswer = useCallback(async (sequence: number, selectedOption: string | null, markedForReview: boolean) => {
    if (!attemptId) throw new Error("Attempt is unavailable.");
    const { error: saveError } = await supabase.functions.invoke("exam-attempts", {
      body: {
        action: "save-answer",
        exam_program_id: "jamb",
        attempt_id: attemptId,
        sequence,
        selected_option: selectedOption,
        marked_for_review: markedForReview,
      },
    });
    if (saveError) throw saveError;
  }, [attemptId]);

  const saveAnswer = async (sequence: number, selectedOption: string | null, markedForReview = markedRef.current[sequence] ?? false) => {
    if (!attemptId || !payload || payload.attempt.status !== "in_progress" || submitting) return;
    const nextAnswers = { ...answersRef.current };
    if (selectedOption) nextAnswers[sequence] = selectedOption; else delete nextAnswers[sequence];
    answersRef.current = nextAnswers;
    const nextMarked = { ...markedRef.current, [sequence]: markedForReview };
    markedRef.current = nextMarked;
    setAnswers(nextAnswers);
    setMarked(nextMarked);

    // Serialize writes per question. Rapid option changes can no longer arrive
    // out of order and overwrite a newer selection on the server.
    const previous = pendingSavesRef.current.get(sequence) ?? Promise.resolve();
    const queued = previous.catch(() => undefined).then(() => persistAnswer(sequence, selectedOption, markedForReview));
    pendingSavesRef.current.set(sequence, queued);
    setSaving(true);
    try {
      await queued;
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Answer could not be saved. Check your connection.");
    } finally {
      if (pendingSavesRef.current.get(sequence) === queued) pendingSavesRef.current.delete(sequence);
      setSaving(pendingSavesRef.current.size > 0);
    }
  };


  const submitAttempt = async (expired = false) => {
    if (!attemptId || submitting) return;
    if (!expired && !window.confirm("Submit this practice attempt? You will not be able to change your answers afterwards.")) return;
    setSubmitting(true);
    try {
      if (!expired && payload) {
        // Wait for in-flight writes, then flush the latest local state for every
        // sequence before the server locks and scores the attempt.
        await Promise.all([...pendingSavesRef.current.values()].map((pending) => pending.catch(() => undefined)));
        await Promise.all(payload.questions.map((item) => persistAnswer(
          item.sequence,
          answersRef.current[item.sequence] ?? null,
          markedRef.current[item.sequence] ?? false,
        )));
      }
      const { data, error: submitError } = await supabase.functions.invoke("exam-attempts", {
        body: { action: "submit", exam_program_id: "jamb", attempt_id: attemptId },
      });
      if (submitError) throw submitError;
      await refreshAttempt();
      await loadReview();
      if (data?.result) setPayload((previous) => previous ? { ...previous, attempt: { ...previous.attempt, status: data.status ?? "submitted" }, result: data.result } : previous);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Submission failed. Your saved answers remain on the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const answeredCount = Object.keys(answers).length;
  const isSubmitted = payload?.attempt.status === "submitted" || payload?.attempt.status === "expired";
  const result = payload?.result;

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin text-primary" /><p className="text-sm">Loading your saved JAMB practice…</p></div></div>;
  if (error || !payload) return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center chalk-texture">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 text-xl font-bold">Attempt unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "This attempt could not be found."}</p>
        <Button asChild className="mt-5 w-full"><Link to="/jamb/cbt/setup">Back to CBT setup</Link></Button>
      </div>
    </main>
  );

  if (isSubmitted) return (
    <main className="min-h-screen bg-background px-4 py-8 pb-28">
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center chalk-texture md:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Attempt submitted
            </div>
            <h1 className="text-2xl font-bold">Practice submitted</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your server-verified JAMB result is ready.</p>

            <ProgressRing
              progress={result?.score ?? 0}
              size={160}
              strokeWidth={12}
              className="mx-auto my-6"
            >
              <div className="text-center">
                <span className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  {result?.score === null || result?.score === undefined ? "—" : `${result.score}%`}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">Score</p>
              </div>
            </ProgressRing>

            <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5 p-3.5 text-center">
                <p className="text-2xl font-bold text-primary tabular-nums">{result?.total ?? payload.questions.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-xl border border-accent/10 bg-gradient-to-br from-accent/10 to-accent/5 p-3.5 text-center">
                <p className="text-2xl font-bold text-accent tabular-nums">{result?.correct ?? 0}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="rounded-xl border border-destructive/10 bg-gradient-to-br from-destructive/10 to-destructive/5 p-3.5 text-center">
                <p className="text-2xl font-bold text-destructive tabular-nums">{result?.wrong ?? 0}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 text-center">
                <p className="text-2xl font-bold tabular-nums">{result?.ungraded ?? 0}</p>
                <p className="text-xs text-muted-foreground">Ungraded</p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Questions without independently reviewed answer keys are excluded from the score. Your ungraded answers are still available in the review below.
            </p>
            <Button asChild size="lg" className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
              <Link to="/jamb">Return to JAMB home</Link>
            </Button>
          </div>
        </motion.section>

        <section className="space-y-4">
          <header className="px-1">
            <h2 className="text-xl font-bold">Answer review</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compare your responses with reviewed answer keys. Unverified items remain ungraded.</p>
          </header>
          {reviewLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading answer review…
            </div>
          )}
          {reviewError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {reviewError}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => void loadReview()}>Retry</Button>
            </div>
          )}
          {review.map((item) => (
            <motion.article
              key={item.sequence}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, delay: shouldReduceMotion ? 0 : Math.min((item.sequence - 1) * 0.025, 0.2) }}
              className="rounded-2xl border border-border bg-card p-4 chalk-texture sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Question {item.sequence}</h3>
                <span className={item.gradable
                  ? item.is_correct
                    ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                  : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"}
                >
                  {item.gradable ? item.is_correct ? "Correct" : "Incorrect" : "Ungraded"}
                </span>
              </div>
              <div className="mt-3 text-sm font-medium leading-relaxed">
                <QuestionMath content={item.question_snapshot.question} />
              </div>
              {item.question_snapshot.imageUrls?.map((imageUrl) => (
                <QuestionImage key={imageUrl} imageUrl={imageUrl} alt="JAMB question illustration" />
              ))}
              <div className="mt-4 space-y-2">
                {item.question_snapshot.options.map((option) => {
                  const selected = item.selected_option === option.label;
                  const correct = item.correct_answer === option.label;
                  return (
                    <div
                      key={option.label}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 text-sm ${
                        correct
                          ? "border-emerald-500 bg-emerald-500/10"
                          : selected
                            ? "border-destructive bg-destructive/5"
                            : "border-border bg-secondary/20"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono font-semibold ${
                        correct
                          ? "bg-emerald-500 text-white"
                          : selected
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-secondary text-foreground"
                      }`}>{option.label}</span>
                      <div className="min-w-0 flex-1 pt-1"><QuestionMath content={option.text} inline /></div>
                      {selected && <span className="text-[10px] font-semibold uppercase text-muted-foreground">Your answer</span>}
                      {correct && <span className="text-[10px] font-semibold uppercase text-emerald-700">Approved key</span>}
                    </div>
                  );
                })}
              </div>
              {item.explanation && (
                <div className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</p>
                  <div className="text-sm leading-relaxed"><QuestionMath content={item.explanation} /></div>
                </div>
              )}
              {!item.gradable && <p className="mt-3 text-xs text-muted-foreground">No independently reviewed answer key is available for this question.</p>}
              {item.marked_for_review && <p className="mt-2 text-xs font-medium text-amber-700">You marked this question for review during the attempt.</p>}
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );

  if (!question) return <main className="p-6 text-center">This attempt contains no questions.</main>;

  const selectedOption = answers[question.sequence] ?? "";
  const flagged = marked[question.sequence] ?? false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">JAMB · Subject practice</p>
            <p className="truncate text-sm font-semibold">{question.subject.charAt(0).toUpperCase() + question.subject.slice(1)}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums ${secondsLeft < 60 ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-border/50 bg-secondary/70 text-muted-foreground"}`}>
            <Clock3 className="h-4 w-4" />{formatTime(secondsLeft)}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28">

        <div className="mb-6 animate-in-up">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-foreground">Question {current + 1}</span>
              <span className="ml-1.5 text-sm text-muted-foreground">of {payload.questions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary/50 px-2 py-1 text-xs tabular-nums text-muted-foreground">
                {Math.round(((current + 1) / payload.questions.length) * 100)}%
              </span>
              <span role="status" aria-live="polite" className="text-right text-[11px] text-muted-foreground">
                {answeredCount} answered · {saving ? "Saving…" : "Saved"}
              </span>
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={false}
              animate={{ width: `${((current + 1) / payload.questions.length) * 100}%` }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={question.sequence}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-2xl border border-border bg-card p-6 chalk-texture"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {question.subject} · {question.question_snapshot.year ?? "JAMB practice"}
              </span>
              <span className="text-[11px] text-muted-foreground">{saving ? "Saving answer…" : "Changes saved"}</span>
            </div>
            <div className="text-lg font-medium leading-relaxed">
              <QuestionMath content={question.question_snapshot.question} />
            </div>
            {question.question_snapshot.imageUrls?.map((imageUrl) => (
              <QuestionImage key={imageUrl} imageUrl={imageUrl} alt="JAMB question illustration" />
            ))}
            <div className="mt-6 space-y-3">
              {question.question_snapshot.options.map((option) => (
                <QuestionOptionButton
                  key={option.label}
                  label={option.label}
                  state={selectedOption === option.label ? "selected" : "default"}
                  selected={selectedOption === option.label}
                  disabled={submitting}
                  onClick={() => void saveAnswer(question.sequence, option.label)}
                >
                  <QuestionMath content={option.text} inline />
                </QuestionOptionButton>
              ))}
            </div>
            <motion.button
              type="button"
              disabled={submitting}
              onClick={() => void saveAnswer(question.sequence, selectedOption || null, !flagged)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${flagged ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
            >
              <Flag className="h-4 w-4" />{flagged ? "Marked for review" : "Mark for review"}
            </motion.button>
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button variant="outline" disabled={submitting || current === 0} onClick={() => setCurrent((value) => value - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              {current < payload.questions.length - 1 ? (
                <Button disabled={submitting} onClick={() => setCurrent((value) => value + 1)}>
                  Next question <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => void submitAttempt(false)} disabled={submitting}>
                  <Send className="mr-1 h-4 w-4" /> Submit practice
                </Button>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, delay: shouldReduceMotion ? 0 : 0.06 }}
          className="rounded-2xl border border-border bg-card p-5 chalk-texture"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Question navigator</h2>
            <span className="text-xs text-muted-foreground">Tap to revisit</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {payload.questions.map((item, index) => {
              const isAnswered = Boolean(answers[item.sequence]);
              return (
                <motion.button
                  key={item.sequence}
                  type="button"
                  disabled={submitting}
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={current === index ? "step" : undefined}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                  className={`aspect-square rounded-lg border-2 text-xs font-semibold transition-colors ${current === index ? "border-primary bg-primary text-primary-foreground" : marked[item.sequence] ? "border-amber-500 bg-amber-500/10 text-amber-700" : isAnswered ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"}`}
                >
                  {index + 1}
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        <Button variant="destructive" className="w-full" onClick={() => void submitAttempt(false)} disabled={submitting || saving}>{submitting ? "Submitting…" : "Submit attempt"}</Button>
      </main>
    </div>
  );
}
