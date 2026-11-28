import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Bot, Brain, Check, Flame,
  Loader2, RefreshCw, Shuffle, Sparkles, Target, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionMath } from "@/components/QuestionMath";
import { StudyFlashcardSurface } from "@/components/StudyFlashcardSurface";
import { SelectableSubjectCard } from "@/components/SelectableSubjectCard";
import { getJambActivityStats } from "@/lib/jamb-analytics";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambReviewProgress } from "@/hooks/useJambReviewProgress";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_QUESTION_BANK_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import {
  getJambSubjectSummaries,
  searchJambQuestions,
  JambSchemaUnavailableError,
  type JambQuestion,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import type { JambReviewQuality } from "@/lib/jamb-review";

type JambSubject = (typeof JAMB_QUESTION_BANK_SUBJECTS)[number];
type StudyMode = "learn" | "review";
type AnswerFeedback = {
  gradable: boolean;
  isCorrect?: boolean;
  correctOption?: string;
  explanation?: string;
  message?: string;
};

const PAGE_SIZE = 30;
const RATINGS: Array<{ value: JambReviewQuality; label: string; className: string }> = [
  { value: 1, label: "Didn't know", className: "px-4 py-2.5 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive transition-all duration-200 text-sm font-medium border border-destructive/20 hover:border-destructive/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" },
  { value: 3, label: "Hard", className: "px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary transition-all duration-200 text-sm font-medium border border-primary/20 hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" },
  { value: 4, label: "Good", className: "px-4 py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent transition-all duration-200 text-sm font-medium border border-accent/20 hover:border-accent/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" },
  { value: 5, label: "Easy!", className: "px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground transition-all duration-200 text-sm font-bold shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" },
];

function isJambSubject(value: string | null): value is JambSubject {
  return Boolean(value && JAMB_QUESTION_BANK_SUBJECTS.includes(value as JambSubject));
}

export default function JambStudyPage() {
  const [searchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
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
  const answerCheckSequence = useRef(0);
  const initialLoadStarted = useRef(false);

  const { bookmarks, toggle: toggleBookmark, isReady: bookmarksReady } = useJambBookmarks();
  const { savedAnswers, saveAnswer } = useJambPracticeProgress();
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
      answerCheckSequence.current += 1;
      setChecking(false);
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
      if (requestSequence.current !== sequence) return [];
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
  const activityStats = getJambActivityStats(savedAnswers);
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
    const sequence = ++answerCheckSequence.current;
    const questionId = question.id;
    const option = selectedOption;
    setChecking(true);
    setPageError(null);
    saveAnswer(questionId, option);
    try {
      const { data, error } = await supabase.functions.invoke("exam-practice", {
        body: {
          action: "check-answer",
          exam_program_id: "jamb",
          question_id: questionId,
          selected_option: option,
        },
      });
      if (error) throw error;
      if (answerCheckSequence.current !== sequence) return;
      setFeedback({
        gradable: data?.gradable === true,
        isCorrect: data?.gradable === true ? data.is_correct === true : undefined,
        correctOption: typeof data?.correct_option === "string" ? data.correct_option : undefined,
        explanation: typeof data?.explanation === "string" ? data.explanation : undefined,
        message: typeof data?.message === "string" ? data.message : undefined,
      });
    } catch (reason) {
      if (answerCheckSequence.current === sequence) {
        setPageError(reason instanceof Error
          ? reason.message
          : "Answer checking is unavailable. Your choice is saved; reconnect and try again.");
      }
    } finally {
      if (answerCheckSequence.current === sequence) setChecking(false);
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
      {selectedSubject && subjectInfo ? (
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject(null);
                  setQuestions([]);
                  setMode("learn");
                  setCurrentIndex(0);
                  setReviewQueueIds([]);
                  setSelectedOption(null);
                  setFeedback(null);
                }}
                className="flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="flex min-w-0 items-center justify-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-sm font-medium subject-${selectedSubject}`}>
                  {subjectInfo.icon} {subjectInfo.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {activityStats.currentStreak > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-sm text-primary">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="font-bold">{activityStats.currentStreak}</span>
                  </div>
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {queue.length > 0 ? Math.min(currentIndex + 1, queue.length) : 0} / {queue.length}
                </span>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <WorkspacePageHeader
          title="Revision Cards"
          backTo="/jamb"
          backLabel="Back to JAMB workspace"
          compact
          wide
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-6">
        {!selectedSubject ? (
          <>
            <section className="space-y-3">
              <h2 className="font-semibold">Choose a subject</h2>
              <div className="grid grid-cols-2 gap-3">
                {JAMB_QUESTION_BANK_SUBJECTS.map((subject) => {
                  const info = JAMB_SUBJECT_INFO[subject];
                  const summary = summaries.find((row) => row.subject === subject);
                  return (
                    <SelectableSubjectCard
                      key={subject}
                      icon={info.icon}
                      label={info.label}
                      description="JAMB objective revision"
                      meta={loadingSubjects ? "Loading…" : (summary?.count ?? 0).toLocaleString() + " reviewed questions"}
                      selected={false}
                      onSelect={() => selectSubject(subject)}
                    />
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            <p className="text-center text-xs text-muted-foreground">
              {questions.length.toLocaleString()} of {totalCount.toLocaleString()} published questions loaded
            </p>

            <div className="mb-8 flex justify-center gap-2">
              <Button
                variant={mode === "learn" ? "default" : "outline"}
                onClick={() => { setMode("learn"); setCurrentIndex(0); setSelectedOption(null); setFeedback(null); }}
                className={mode === "learn" ? "gap-2 bg-primary text-primary-foreground shadow-md" : "gap-2"}
              >
                <BookOpen className="h-4 w-4" /> Learn All
              </Button>
              <Button
                variant={mode === "review" ? "default" : "outline"}
                onClick={startReview}
                disabled={!reviewReady || dueCount === 0}
                className={mode === "review" ? "gap-2 bg-primary text-primary-foreground shadow-md" : "gap-2"}
              >
                <Brain className="h-4 w-4" /> Review Due ({dueCount})
              </Button>
              <Button variant="outline" onClick={handleShuffle} size="icon" disabled={questions.length < 2} aria-label="Shuffle revision cards">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-center">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-xl" />
                <BookOpen className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-3xl font-bold text-primary tabular-nums">{reviewReady ? stats.studied : "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Studied</p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-accent/10 bg-gradient-to-br from-accent/10 to-accent/5 p-5 text-center">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-xl" />
                <Target className="mx-auto mb-2 h-5 w-5 text-accent" />
                <p className="text-3xl font-bold text-accent tabular-nums">{reviewReady ? stats.mastered : "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Mastered</p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-destructive/10 bg-gradient-to-br from-destructive/10 to-destructive/5 p-5 text-center">
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/10 blur-xl" />
                <Flame className="mx-auto mb-2 h-5 w-5 text-destructive" />
                <p className="text-3xl font-bold text-destructive tabular-nums">{reviewReady ? dueCount : "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Due Today</p>
              </div>
            </div>

            {loadingQuestions && questions.length === 0 ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : question ? (
              <>
                <div className="mx-auto mb-4 flex w-full max-w-2xl justify-end">
                  <Button
                    asChild
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary hover:bg-primary/20 transition-all"
                  >
                    <Link to={`/jamb/ai?subject=${question.subject}&questionId=${encodeURIComponent(question.id)}`}>
                      <Bot className="h-4 w-4 text-primary" />
                      <span>Ask AI Tutor</span>
                      <Sparkles className="h-3 w-3 text-accent" />
                    </Link>
                  </Button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={question.id}
                    className="mx-auto w-full max-w-2xl"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, x: -24 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <StudyFlashcardSurface
                      ariaLabel="JAMB revision question"
                      className="min-h-[320px]"
                      contentClassName="flex min-h-[320px] flex-col space-y-4 p-6"
                    >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium",
                      selectedSubject === "use_of_english"
                        ? "bg-primary/10 text-primary"
                        : "subject-" + selectedSubject,
                    )}>
                      {subjectInfo?.icon} {subjectInfo?.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {question.year}{question.topic ? " · " + question.topic : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{currentIndex + 1} / {queue.length}</span>
                  </div>
                  <button type="button" onClick={() => toggleBookmark(question.id)} disabled={!bookmarksReady} aria-label={currentBookmark ? "Remove bookmark" : "Bookmark question"} aria-pressed={currentBookmark} className="rounded-lg p-2 hover:bg-accent disabled:opacity-50">
                    {currentBookmark ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </div>

                <div className="space-y-3">
                  <QuestionMath content={question.question} className="text-lg font-medium leading-relaxed" />
                  {question.imageUrls.map((imageUrl) => <QuestionImage key={imageUrl} imageUrl={imageUrl} />)}
                </div>

                <div className="flashcard-scroll-region max-h-[min(32dvh,280px)] flex-1 space-y-2.5 overflow-y-auto overscroll-contain touch-pan-y pr-1 scrollbar-thin">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedOption === option.label;
                    const hasApprovedResult = feedback?.gradable === true;
                    const isCorrectOption = feedback?.gradable === true && feedback.correctOption === option.label;
                    const isWrongSelection = feedback?.gradable === true && isSelected && feedback.isCorrect === false;
                    const isUngradableResult = feedback !== null && feedback.gradable === false;
                    const isPendingSelection = isSelected && feedback === null;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => !feedback && !checking && setSelectedOption(option.label)}
                        disabled={Boolean(feedback) || checking}
                        style={{ animationDelay: shouldReduceMotion ? "0ms" : `${optionIndex * 0.06}s` }}
                        className={cn(
                          "w-full p-3.5 rounded-xl text-left transition-all duration-300 flex items-start gap-3 border-2 active:scale-[0.99]",
                          !feedback && !isSelected && "border-border/60 bg-background/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0",
                          isPendingSelection && "border-primary bg-primary/10 shadow-md shadow-primary/5",
                          hasApprovedResult && isCorrectOption && "border-accent bg-accent/15 shadow-lg shadow-accent/20",
                          hasApprovedResult && isWrongSelection && "border-destructive bg-destructive/15 shadow-lg shadow-destructive/10",
                          hasApprovedResult && !isSelected && !isCorrectOption && "border-border/30 opacity-50 scale-[0.98]",
                          isUngradableResult && isSelected && "border-primary bg-primary/10 shadow-md shadow-primary/5",
                          isUngradableResult && !isSelected && "border-border/30 opacity-50 scale-[0.98]",
                          !shouldReduceMotion && "animate-in-up",
                          shouldReduceMotion && "motion-reduce:animate-none",
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm transition-all duration-200",
                          !feedback && !isSelected && "bg-secondary/80 text-foreground",
                          isPendingSelection && "bg-primary text-primary-foreground",
                          hasApprovedResult && isCorrectOption && "bg-accent text-accent-foreground scale-110",
                          hasApprovedResult && isWrongSelection && "bg-destructive text-destructive-foreground scale-110",
                          hasApprovedResult && !isSelected && !isCorrectOption && "bg-secondary/50 text-muted-foreground",
                          isUngradableResult && isSelected && "bg-primary text-primary-foreground",
                          isUngradableResult && !isSelected && "bg-secondary/50 text-muted-foreground",
                        )}>
                          {isCorrectOption ? <Check className="h-4 w-4" />
                            : isWrongSelection ? <X className="h-4 w-4" />
                              : option.label}
                        </span>
                        <span className={cn(
                          "text-sm leading-relaxed pt-1 flex-1 min-w-0 transition-opacity duration-200",
                          (hasApprovedResult || isUngradableResult) && !isSelected && "opacity-60",
                        )}>
                          <QuestionMath content={option.text} inline />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!feedback ? (
                  <Button className="w-full" onClick={() => void checkAnswer()} disabled={!selectedOption || checking}>
                    {checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking with JAMB answer service…</> : "Check answer"}
                  </Button>
                ) : feedback.gradable ? (
                  <div className={cn(
                    "mt-6 p-5 rounded-2xl border-2 animate-scale-in",
                    feedback.isCorrect
                      ? "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/40"
                      : "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/40",
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        feedback.isCorrect ? "bg-accent/20" : "bg-destructive/20",
                      )}>
                        {feedback.isCorrect
                          ? <Check className="h-6 w-6 text-accent" />
                          : <X className="h-6 w-6 text-destructive" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "font-bold text-lg mb-2",
                          feedback.isCorrect ? "text-accent" : "text-destructive",
                        )}>
                          {feedback.isCorrect ? "Correct!" : "Not quite right"}
                        </p>
                        {feedback.explanation && (
                          <div className="text-sm leading-relaxed text-foreground/90 mb-4 bg-background/50 rounded-xl p-3 border border-border/30">
                            <QuestionMath content={feedback.explanation} />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium mb-3">How well did you know this?</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {RATINGS.map((rating) => (
                        <button key={rating.value} type="button" onClick={() => rateCard(rating.value)} className={rating.className}>
                          {rating.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-5 animate-scale-in">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-lg font-bold text-amber-700 dark:text-amber-400">This question is not gradable yet</p>
                        <p className="text-sm leading-relaxed text-foreground/90">{feedback.message ?? "Its answer key has not passed independent review. Your selection is saved, but no answer will be revealed and the card will not be marked as mastered."}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="mt-4 w-full" onClick={nextCard}>Skip this card without scheduling</Button>
                  </div>
                )}

                {feedback?.gradable && (
                  <div className="flex justify-end border-t border-border pt-3">
                    <Button size="sm" variant="outline" onClick={nextCard}>Next card <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                  </div>
                )}
                    </StudyFlashcardSurface>
                  </motion.div>
                </AnimatePresence>
              </>
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
            <p className="text-center text-[11px] text-muted-foreground">Only approved answer keys can mark a card as mastered.</p>
          </>
        )}
        {pageError && !selectedSubject && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pageError}</p>}
      </main>
    </div>
  );
}
