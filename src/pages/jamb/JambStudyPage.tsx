import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Brain,
  Check, Clock3, Loader2, RefreshCw, Shuffle, Sparkles, Target, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionMath } from "@/components/QuestionMath";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambReviewProgress } from "@/hooks/useJambReviewProgress";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import {
  getJambSubjectSummaries,
  searchJambQuestions,
  JambSchemaUnavailableError,
  type JambQuestion,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import type { JambReviewQuality } from "@/lib/jamb-review";

type JambSubject = (typeof JAMB_SUBJECTS)[number];
type StudyMode = "learn" | "review";
type AnswerFeedback = {
  gradable: boolean;
  isCorrect?: boolean;
  correctOption?: string;
  explanation?: string;
  message?: string;
};

const PAGE_SIZE = 30;
const RATINGS: Array<{ value: JambReviewQuality; label: string; detail: string; className: string }> = [
  { value: 1, label: "Again", detail: "I did not recall it", className: "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15" },
  { value: 3, label: "Hard", detail: "Needed effort", className: "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10" },
  { value: 4, label: "Good", detail: "Recalled it", className: "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15" },
  { value: 5, label: "Easy", detail: "Knew it well", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15" },
];

function isJambSubject(value: string | null): value is JambSubject {
  return Boolean(value && JAMB_SUBJECTS.includes(value as JambSubject));
}

export default function JambStudyPage() {
  const [searchParams] = useSearchParams();
  const requestedSubject = searchParams.get("subject")?.toLowerCase() ?? null;
  const initialSubject = isJambSubject(requestedSubject) ? requestedSubject : null;
  const [selectedSubject, setSelectedSubject] = useState<JambSubject | null>(initialSubject);
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [mode, setMode] = useState<StudyMode>("learn");
  const [reviewQueueIds, setReviewQueueIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const initialLoadStarted = useRef(false);

  const { bookmarks, toggle: toggleBookmark, isReady: bookmarksReady } = useJambBookmarks();
  const { saveAnswer } = useJambPracticeProgress();
  const {
    rateQuestion, dueQuestionIds, getStats, isReady: reviewReady,
  } = useJambReviewProgress();

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (active) setPageError(reason instanceof Error ? reason.message : "JAMB question coverage could not be loaded.");
      })
      .finally(() => { if (active) setLoadingSubjects(false); });
    return () => { active = false; };
  }, []);

  const loadQuestions = useCallback(async (subject: JambSubject, append = false): Promise<JambQuestion[]> => {
    const sequence = ++requestSequence.current;
    const offset = append ? questions.length : 0;
    setLoadingQuestions(true);
    setPageError(null);
    if (!append) {
      setQuestions([]);
      setTotalCount(0);
      setReviewQueueIds([]);
      setCurrentIndex(0);
      setSelectedOption(null);
      setFeedback(null);
    }
    try {
      const result = await searchJambQuestions({ subject, offset, limit: PAGE_SIZE });
      if (requestSequence.current !== sequence) return [];
      setQuestions((previous) => {
        if (!append) return result.questions;
        const seen = new Set(previous.map((question) => question.id));
        return [...previous, ...result.questions.filter((question) => !seen.has(question.id))];
      });
      setTotalCount(result.count);
      return result.questions;
    } catch (reason) {
      if (requestSequence.current !== sequence) return;
      setPageError(reason instanceof JambSchemaUnavailableError
        ? "The JAMB question database is not available yet."
        : reason instanceof Error ? reason.message : "Could not load JAMB revision cards.");
      return [];
    } finally {
      if (requestSequence.current === sequence) setLoadingQuestions(false);
    }
  }, [questions.length]);

  useEffect(() => {
    if (!initialSubject || initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void loadQuestions(initialSubject);
  }, [initialSubject, loadQuestions]);

  const queue = useMemo(() => {
    if (mode === "learn") return questions;
    const byId = new Map(questions.map((question) => [question.id, question]));
    return reviewQueueIds.map((id) => byId.get(id)).filter((question): question is JambQuestion => Boolean(question));
  }, [mode, questions, reviewQueueIds]);
  const question = queue[currentIndex] ?? null;
  const questionIds = useMemo(() => questions.map((item) => item.id), [questions]);
  const stats = getStats(questionIds);
  const dueCount = dueQuestionIds(questionIds).length;
  const subjectInfo = selectedSubject ? JAMB_SUBJECT_INFO[selectedSubject] : null;
  const currentBookmark = Boolean(question && bookmarks.includes(question.id));

  useEffect(() => {
    setSelectedOption(null);
    setFeedback(null);
  }, [question?.id]);

  const selectSubject = (subject: JambSubject) => {
    setSelectedSubject(subject);
    setMode("learn");
    initialLoadStarted.current = true;
    void loadQuestions(subject);
  };

  const startReview = () => {
    setReviewQueueIds(dueQuestionIds(questionIds));
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setMode("review");
  };

  const nextCard = () => {
    if (mode === "review" && question) {
      setReviewQueueIds((previous) => previous.filter((id) => id !== question.id));
      setCurrentIndex(0);
    } else {
      setCurrentIndex((previous) => queue.length > 0 ? (previous + 1) % queue.length : 0);
    }
    setSelectedOption(null);
    setFeedback(null);
  };

  const checkAnswer = async () => {
    if (!question || !selectedOption || checking || feedback) return;
    setChecking(true);
    setPageError(null);
    saveAnswer(question.id, selectedOption);
    try {
      const { data, error } = await supabase.functions.invoke("exam-practice", {
        body: {
          action: "check-answer",
          exam_program_id: "jamb",
          question_id: question.id,
          selected_option: selectedOption,
        },
      });
      if (error) throw error;
      setFeedback({
        gradable: data?.gradable === true,
        isCorrect: data?.gradable === true ? data.is_correct === true : undefined,
        correctOption: typeof data?.correct_option === "string" ? data.correct_option : undefined,
        explanation: typeof data?.explanation === "string" ? data.explanation : undefined,
        message: typeof data?.message === "string" ? data.message : undefined,
      });
    } catch (reason) {
      setPageError(reason instanceof Error
        ? reason.message
        : "Answer checking is unavailable. Your choice is saved; reconnect and try again.");
    } finally {
      setChecking(false);
    }
  };

  const rateCard = (quality: JambReviewQuality) => {
    if (!question || !feedback?.gradable) return;
    rateQuestion(question.id, quality);
    nextCard();
  };

  const loadMore = async () => {
    if (!selectedSubject || loadingQuestions || questions.length >= totalCount) return;
    const newlyLoaded = await loadQuestions(selectedSubject, true);
    if (mode === "review" && newlyLoaded.length > 0) {
      const newlyDue = dueQuestionIds(newlyLoaded.map((item) => item.id));
      setReviewQueueIds((previous) => [...previous, ...newlyDue.filter((id) => !previous.includes(id))]);
    }
  };

  const handleShuffle = () => {
    setQuestions((previous) => [...previous].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    if (mode === "review") setReviewQueueIds(dueQuestionIds(questionIds));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link to="/jamb" aria-label="Back to JAMB workspace" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">JAMB Revision Cards</h1>
            <p className="text-[10px] text-muted-foreground">Learn all · Review due · JAMB-only progress</p>
          </div>
          {selectedSubject && (
            <Button size="sm" variant="ghost" onClick={() => { setSelectedSubject(null); setQuestions([]); setMode("learn"); setCurrentIndex(0); }}>
              Change subject
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-24">
        {!selectedSubject ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Build long-term recall</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Study objective JAMB questions, rate how well you recalled each answer, and revisit cards when they are due.</p>
                </div>
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="font-semibold">Choose a subject</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {JAMB_SUBJECTS.map((subject) => {
                  const info = JAMB_SUBJECT_INFO[subject];
                  const summary = summaries.find((row) => row.subject === subject);
                  return (
                    <button key={subject} type="button" onClick={() => selectSubject(subject)} className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-accent/20">
                      <span className="text-3xl">{info.icon}</span>
                      <h3 className="mt-3 font-semibold">{info.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{loadingSubjects ? "Loading…" : (summary?.count ?? 0).toLocaleString() + " reviewed questions"}</p>
                      <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">Start revision <ArrowRight className="h-3.5 w-3.5" /></span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">JAMB objective revision</p>
                <h2 className="text-xl font-bold">{subjectInfo?.icon} {subjectInfo?.label}</h2>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{questions.length} / {totalCount} loaded</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-center">
                <BookOpen className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold tabular-nums">{reviewReady ? stats.studied : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Studied</p>
              </div>
              <div className="rounded-xl border border-accent/15 bg-accent/5 p-3 text-center">
                <Target className="mx-auto mb-1 h-4 w-4 text-accent" />
                <p className="text-2xl font-bold tabular-nums">{reviewReady ? stats.mastered : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Mastered</p>
              </div>
              <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-3 text-center">
                <Clock3 className="mx-auto mb-1 h-4 w-4 text-destructive" />
                <p className="text-2xl font-bold tabular-nums">{reviewReady ? dueCount : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Due now</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant={mode === "learn" ? "default" : "outline"} onClick={() => { setMode("learn"); setCurrentIndex(0); setSelectedOption(null); setFeedback(null); }} className="gap-2">
                <BookOpen className="h-4 w-4" /> Learn All
              </Button>
              <Button variant={mode === "review" ? "default" : "outline"} onClick={startReview} disabled={!reviewReady || dueCount === 0} className="gap-2">
                <Brain className="h-4 w-4" /> Review Due ({dueCount})
              </Button>
              <Button variant="outline" size="icon" onClick={handleShuffle} disabled={questions.length < 2} aria-label="Shuffle revision cards">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>

            {loadingQuestions && questions.length === 0 ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : question ? (
              <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{subjectInfo?.label} · {question.year}</span>
                    <span className="text-xs text-muted-foreground">{currentIndex + 1} / {queue.length}</span>
                  </div>
                  <button type="button" onClick={() => toggleBookmark(question.id)} disabled={!bookmarksReady} aria-label={currentBookmark ? "Remove bookmark" : "Bookmark question"} aria-pressed={currentBookmark} className="rounded-lg p-2 hover:bg-accent disabled:opacity-50">
                    {currentBookmark ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </div>

                <div className="space-y-3">
                  <QuestionMath content={question.question} className="text-base font-medium leading-relaxed" />
                  {question.imageUrls.map((imageUrl) => <QuestionImage key={imageUrl} imageUrl={imageUrl} />)}
                </div>

                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isSelected = selectedOption === option.label;
                    const isCorrect = feedback?.gradable && feedback.correctOption === option.label;
                    const isWrongSelection = feedback?.gradable && isSelected && !feedback.isCorrect;
                    return (
                      <button key={option.label} type="button" onClick={() => !feedback && setSelectedOption(option.label)} disabled={Boolean(feedback) || checking} aria-pressed={isSelected} className={[
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                        isCorrect ? "border-emerald-500/50 bg-emerald-500/10" :
                        isWrongSelection ? "border-destructive/50 bg-destructive/10" :
                        isSelected ? "border-primary bg-primary/10" :
                        "border-border bg-background hover:border-primary/40 hover:bg-accent/20",
                      ].join(" ")}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-semibold">{option.label}</span>
                        <QuestionMath content={option.text} inline className="min-w-0" />
                        {isCorrect && <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />}
                        {isWrongSelection && <X className="ml-auto h-4 w-4 shrink-0 text-destructive" />}
                      </button>
                    );
                  })}
                </div>

                {!feedback ? (
                  <Button className="w-full" onClick={() => void checkAnswer()} disabled={!selectedOption || checking}>
                    {checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking with JAMB answer service…</> : "Check answer"}
                  </Button>
                ) : feedback.gradable ? (
                  <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center gap-2">
                      {feedback.isCorrect ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-destructive" />}
                      <p className="font-semibold">{feedback.isCorrect ? "Correct answer" : "Not quite — review the explanation"}</p>
                    </div>
                    {feedback.explanation && <QuestionMath content={feedback.explanation} className="text-sm leading-relaxed" />}
                    <p className="text-sm font-medium">How well did you recall it?</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {RATINGS.map((rating) => (
                        <button key={rating.value} type="button" onClick={() => rateCard(rating.value)} className={"rounded-xl border p-3 text-left transition-colors " + rating.className}>
                          <span className="block text-sm font-semibold">{rating.label}</span>
                          <span className="mt-1 block text-[10px] opacity-80">{rating.detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold">This question is not gradable yet</p>
                    <p className="text-xs text-muted-foreground">{feedback.message ?? "Its answer key has not passed independent review. Your selection is saved, but no answer will be revealed and the card will not be marked as mastered."}</p>
                    <Button variant="outline" className="w-full" onClick={nextCard}>Skip this card without scheduling</Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Link to={"/jamb/ai?subject=" + question.subject + "&questionId=" + encodeURIComponent(question.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <Sparkles className="h-3.5 w-3.5" /> Ask JAMB AI tutor
                  </Link>
                  {feedback?.gradable && <Button size="sm" variant="outline" onClick={nextCard}>Next card <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>}
                </div>
              </section>
            ) : loadingQuestions ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
              <section className="rounded-2xl border border-dashed border-border p-8 text-center">
                <Brain className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                <h3 className="font-semibold">{mode === "review" ? "All due questions reviewed" : "No reviewed questions available yet"}</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {mode === "review"
                    ? "You have completed this review queue. Return later when more questions are due, or switch to Learn All."
                    : "Revision cards use only published JAMB questions. New source candidates will not appear until an administrator has reviewed and published them."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {mode === "review" && <Button variant="outline" onClick={() => { setMode("learn"); setCurrentIndex(0); }}>Learn All</Button>}
                  {questions.length < totalCount && <Button onClick={loadMore} disabled={loadingQuestions}>Load more questions</Button>}
                  {mode === "learn" && questions.length > 0 && <Button variant="outline" onClick={startReview}>Review Due</Button>}
                </div>
              </section>
            )}

            {pageError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pageError}</p>}
            {questions.length < totalCount && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingQuestions}>
                  {loadingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Load more questions ({questions.length}/{totalCount})
                </Button>
              </div>
            )}
            <p className="text-center text-[11px] text-muted-foreground">Answer checking uses reviewed JAMB keys only. Spaced-repetition progress is stored locally for this signed-in account and remains separate from JUPEB.</p>
          </>
        )}
        {pageError && !selectedSubject && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pageError}</p>}
      </main>
    </div>
  );
}
