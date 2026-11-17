import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Flag, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QuestionMath } from "@/components/QuestionMath";
import { QuestionImage } from "@/components/QuestionImage";
import { Button } from "@/components/ui/button";

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
  result?: { score: number | null; correct: number; wrong: number; ungraded: number; total: number };
}

export default function JambCbtPage() {
  const { attemptId } = useParams();
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setAnswers(restored);
    setMarked(flags);
    setSecondsLeft(Math.max(0, Math.floor((new Date(result.attempt.expires_at).getTime() - Date.now()) / 1000)));
  }, [attemptId]);

  useEffect(() => {
    let active = true;
    refreshAttempt()
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load attempt."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshAttempt]);

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

  const saveAnswer = async (sequence: number, selectedOption: string | null, markedForReview = marked[sequence] ?? false) => {
    if (!attemptId || !payload || payload.attempt.status !== "in_progress") return;
    setAnswers((previous) => {
      const next = { ...previous };
      if (selectedOption) next[sequence] = selectedOption; else delete next[sequence];
      return next;
    });
    setMarked((previous) => ({ ...previous, [sequence]: markedForReview }));
    setSaving(true);
    try {
      const { error: saveError } = await supabase.functions.invoke("exam-attempts", {
        body: { action: "save-answer", exam_program_id: "jamb", attempt_id: attemptId, sequence, selected_option: selectedOption, marked_for_review: markedForReview },
      });
      if (saveError) throw saveError;
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Answer could not be saved. Check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const submitAttempt = async (expired = false) => {
    if (!attemptId || submitting) return;
    if (!expired && !window.confirm("Submit this practice attempt? You will not be able to change your answers afterwards.")) return;
    setSubmitting(true);
    try {
      const { data, error: submitError } = await supabase.functions.invoke("exam-attempts", {
        body: { action: "submit", exam_program_id: "jamb", attempt_id: attemptId },
      });
      if (submitError) throw submitError;
      await refreshAttempt();
      if (data?.result) setPayload((previous) => previous ? { ...previous, attempt: { ...previous.attempt, status: "submitted" }, result: data.result } : previous);
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

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (error || !payload) return <main className="mx-auto max-w-xl px-4 py-16 text-center"><AlertTriangle className="mx-auto h-9 w-9 text-destructive" /><h1 className="mt-3 text-xl font-bold">Attempt unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "This attempt could not be found."}</p><Button asChild className="mt-5"><Link to="/jamb/cbt/setup">Back to CBT setup</Link></Button></main>;

  if (isSubmitted) return (
    <main className="min-h-screen bg-background px-4 py-8"><section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-3 text-2xl font-bold">Practice submitted</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your server-verified result is ready.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
        <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-bold">{result?.score === null || result?.score === undefined ? "—" : `${result.score}%`}</p><p className="text-xs text-muted-foreground">Scored questions only</p></div>
        <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-bold">{result?.ungraded ?? 0}</p><p className="text-xs text-muted-foreground">Ungraded questions</p></div>
        <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-bold">{result?.correct ?? 0}</p><p className="text-xs text-muted-foreground">Correct</p></div>
        <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-bold">{result?.wrong ?? 0}</p><p className="text-xs text-muted-foreground">Incorrect</p></div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Questions without reviewed answer keys are excluded from the score.</p>
      <Button asChild className="mt-5 w-full"><Link to="/jamb">Return to JAMB home</Link></Button>
    </section></main>
  );

  if (!question) return <main className="p-6 text-center">This attempt contains no questions.</main>;

  const selectedOption = answers[question.sequence] ?? "";
  const flagged = marked[question.sequence] ?? false;

  return (
    <main className="min-h-screen bg-background px-3 pb-6 pt-3 sm:px-5">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
          <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">JAMB · Subject practice</p><p className="truncate text-sm font-semibold">{question.subject.charAt(0).toUpperCase() + question.subject.slice(1)}</p></div>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-sm font-bold ${secondsLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}><Clock3 className="h-4 w-4" />{formatTime(secondsLeft)}</div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Question {current + 1} of {payload.questions.length}</span><span>{answeredCount} answered {saving ? "· Saving…" : "· Saved"}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((current + 1) / payload.questions.length) * 100}%` }} /></div>
          <div className="mt-5 text-base font-medium leading-relaxed"><QuestionMath content={question.question_snapshot.question} /></div>
          {question.question_snapshot.imageUrls?.map((imageUrl) => <QuestionImage key={imageUrl} imageUrl={imageUrl} alt="JAMB question illustration" />)}
          <div className="mt-5 space-y-2">
            {question.question_snapshot.options.map((option) => (
              <button key={option.label} onClick={() => void saveAnswer(question.sequence, option.label)} aria-pressed={selectedOption === option.label}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm ${selectedOption === option.label ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"}`}>
                <strong className="text-primary">{option.label}.</strong><QuestionMath content={option.text} inline />
              </button>
            ))}
          </div>
          <button onClick={() => void saveAnswer(question.sequence, selectedOption || null, !flagged)} className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${flagged ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}`}><Flag className="h-4 w-4" />{flagged ? "Marked for review" : "Mark for review"}</button>
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}><ArrowLeft className="mr-1 h-4 w-4" /> Previous</Button>
            {current < payload.questions.length - 1 ? <Button onClick={() => setCurrent((value) => value + 1)}>Next question <ArrowRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={() => void submitAttempt(false)} disabled={submitting}><Send className="mr-1 h-4 w-4" />Submit practice</Button>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Question navigator</h2><span className="text-xs text-muted-foreground">Tap to revisit</span></div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {payload.questions.map((item, index) => {
              const isAnswered = Boolean(answers[item.sequence]);
              return <button key={item.sequence} onClick={() => setCurrent(index)} aria-label={`Go to question ${index + 1}`} aria-current={current === index ? "step" : undefined}
                className={`aspect-square rounded-lg border text-xs font-semibold ${current === index ? "border-primary bg-primary text-primary-foreground" : marked[item.sequence] ? "border-amber-500 bg-amber-500/10" : isAnswered ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-muted"}`}>{index + 1}</button>;
            })}
          </div>
        </section>

        <Button variant="destructive" className="w-full" onClick={() => void submitAttempt(false)} disabled={submitting}>{submitting ? "Submitting…" : "Submit attempt"}</Button>
      </div>
    </main>
  );
}
