import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Bot,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  Grid3X3, Loader2, Search, Shield, ShieldAlert, X,
} from "lucide-react";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useActivation } from "@/hooks/useActivation";
import { supabase } from "@/integrations/supabase/client";
import {
  JAMB_SUBJECTS, JAMB_SUBJECT_INFO, JAMB_INITIAL_QUESTION_PAGE_SIZE,
} from "@/lib/jamb-config";
import {
  getJambQuestionYears, getJambPublishedQuestionById, getJambSubjectSummaries,
  JambSchemaUnavailableError, searchJambQuestions,
  type JambQuestion, type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import { QuestionMath } from "@/components/QuestionMath";
import { QuestionImage } from "@/components/QuestionImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JambSubject = (typeof JAMB_SUBJECTS)[number];
type View = "subjects" | "years" | "questions" | "bookmarks";

const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};
const PAGE_TRANSITION = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

const SUBJECT_CARD_COLORS: Record<JambSubject, { gradient: string; light: string; accent: string }> = {
  physics: { gradient: "from-blue-600/40 to-cyan-400/40", light: "bg-blue-500/10", accent: "border-blue-500/30" },
  chemistry: { gradient: "from-emerald-600/40 to-teal-400/40", light: "bg-emerald-500/10", accent: "border-emerald-500/30" },
  biology: { gradient: "from-green-600/40 to-lime-400/40", light: "bg-green-500/10", accent: "border-green-500/30" },
};

function isJambSubject(value: string | null | undefined): value is JambSubject {
  return Boolean(value && JAMB_SUBJECTS.includes(value as JambSubject));
}

function SubjectCard({
  subject,
  summary,
  onClick,
}: {
  subject: JambSubject;
  summary?: JambSubjectSummary;
  onClick: () => void;
}) {
  const info = JAMB_SUBJECT_INFO[subject];
  const colors = SUBJECT_CARD_COLORS[subject];
  const count = summary?.count;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className="relative group flex min-h-[210px] flex-col items-start overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-left"
    >
      <div className={"absolute inset-0 bg-gradient-to-br " + colors.gradient + " opacity-20 transition-opacity duration-500 group-hover:opacity-30"} />
      <div className={"absolute inset-0 " + colors.light + " opacity-0 transition-opacity duration-500 group-hover:opacity-100"} />
      <div className={"relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border text-2xl " + colors.light + " " + colors.accent}>
        {info.icon}
      </div>
      <div className="relative z-10 mt-3 w-full">
        <h2 className="text-base font-semibold">{info.label}</h2>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{info.description}</p>
        <span className="mt-3 block text-xs tabular-nums text-muted-foreground/70">
          {count === undefined ? "Loading question coverage…" : count.toLocaleString() + " published questions"}
        </span>
      </div>
      <div className="relative z-10 mt-auto flex w-full items-center justify-between pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          Start Practice
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </motion.button>
  );
}

export default function JambPastQuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams();
  const requestedSubject = routeParams.subject?.toLowerCase() ?? searchParams.get("subject")?.toLowerCase();
  const requestedYear = Number(searchParams.get("year")) || null;
  const [subject, setSubject] = useState<JambSubject>(isJambSubject(requestedSubject) ? requestedSubject : "physics");
  const [view, setView] = useState<View>(
    isJambSubject(requestedSubject) ? (requestedYear ? "questions" : "years") : "subjects",
  );
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(requestedYear);
  const [expandedYear, setExpandedYear] = useState<number | null>(requestedYear);
  const [search, setSearch] = useState("");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<JambQuestion[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [bookmarkQuestions, setBookmarkQuestions] = useState<JambQuestion[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const pendingQuestionIndexRef = useRef(0);
  const answerCheckSequenceRef = useRef<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, {
    gradable: boolean; isCorrect?: boolean; correctOption?: string; explanation?: string; message?: string;
  }>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const { bookmarks, toggle: toggleJambBookmark, isReady: bookmarksReady } = useJambBookmarks();
  const { savedAnswers, saveAnswer: savePracticeAnswer } = useJambPracticeProgress();
  const { status: activationStatus } = useActivation();
  const isAdmin = activationStatus.is_admin;

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (!active) return;
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load JAMB subject coverage.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (view !== "years") return;
    let active = true;
    setLoadingYears(true);
    setError(null);
    getJambQuestionYears(subject)
      .then((available) => {
        if (active) {
          setYears(available);
          setSchemaUnavailable(false);
          setExpandedYear((previous) => previous !== null && available.includes(previous) ? previous : null);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setYears([]);
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load available years.");
      })
      .finally(() => { if (active) setLoadingYears(false); });
    return () => { active = false; };
  }, [subject, view]);

  useEffect(() => {
    if (view !== "questions") return;
    let active = true;
    setLoading(true);
    setError(null);
    searchJambQuestions({
      subject,
      year,
      search,
      offset,
      limit: JAMB_INITIAL_QUESTION_PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;
        setQuestions(result.questions);
        setCount(result.count);
        setActiveQuestionIndex(Math.min(pendingQuestionIndexRef.current, Math.max(0, result.questions.length - 1)));
        pendingQuestionIndexRef.current = 0;
        setSchemaUnavailable(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setQuestions([]);
        setCount(0);
        setActiveQuestionIndex(0);
        pendingQuestionIndexRef.current = 0;
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load JAMB questions.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject, year, search, offset, view]);

  useEffect(() => {
    if (view !== "bookmarks" || !bookmarksReady) return;
    let active = true;
    setLoading(true);
    setError(null);
    if (bookmarks.length === 0) {
      setBookmarkQuestions([]);
      setLoading(false);
      return () => { active = false; };
    }
    Promise.all(bookmarks.map((id) => getJambPublishedQuestionById(id)))
      .then((rows) => {
        if (active) setBookmarkQuestions(rows.filter((row): row is JambQuestion => Boolean(row)));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load JAMB bookmarks.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [view, bookmarks, bookmarksReady]);

  useEffect(() => {
    if (!showGlobalSearch || globalSearchTerm.trim().length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setGlobalSearchLoading(true);
      Promise.all(JAMB_SUBJECTS.map((searchSubject) =>
        searchJambQuestions({ subject: searchSubject, search: globalSearchTerm.trim(), limit: 25 }),
      ))
        .then((results) => {
          if (active) setGlobalSearchResults(results.flatMap((result) => result.questions));
        })
        .catch((reason: unknown) => {
          if (active) setGlobalSearchResults([]);
          if (active) setError(reason instanceof Error ? reason.message : "Unable to search JAMB questions.");
        })
        .finally(() => { if (active) setGlobalSearchLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [showGlobalSearch, globalSearchTerm]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (view === "subjects") {
      next.delete("subject");
      next.delete("year");
    } else {
      next.set("subject", subject);
      if (view === "questions" && year) next.set("year", String(year));
      else next.delete("year");
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [view, subject, year, searchParams, setSearchParams]);

  const subjectInfo = JAMB_SUBJECT_INFO[subject];
  const pageNumber = Math.floor(offset / JAMB_INITIAL_QUESTION_PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(count / JAMB_INITIAL_QUESTION_PAGE_SIZE));
  const totalPublished = summaries.reduce((sum, row) => sum + row.count, 0);
  const visibleQuestions = view === "bookmarks" ? bookmarkQuestions : questions;
  const empty = !loading && visibleQuestions.length === 0;
  const activeQuestion = questions[activeQuestionIndex];
  const answeredOnPage = questions.filter((question) =>
    Boolean(selected[question.id] ?? savedAnswers[question.id]?.selected),
  ).length;

  const chooseSubject = (nextSubject: JambSubject) => {
    setSubject(nextSubject);
    setYear(null);
    setExpandedYear(null);
    setSearch("");
    setOffset(0);
    setActiveQuestionIndex(0);
    pendingQuestionIndexRef.current = 0;
    setSelected({});
    setView("years");
  };

  const chooseYear = (nextYear: number | null) => {
    setYear(nextYear);
    setSearch("");
    setOffset(0);
    setActiveQuestionIndex(0);
    pendingQuestionIndexRef.current = 0;
    setSelected({});
    setShowQuestionGrid(false);
    setView("questions");
  };

  const handleBack = () => {
    if (view === "subjects") return;
    if (view === "years") {
      setView("subjects");
      setYear(null);
      setExpandedYear(null);
      return;
    }
    if (view === "questions") {
      if (search) {
        setSearch("");
        setOffset(0);
        setActiveQuestionIndex(0);
        return;
      }
      setView("years");
      setYear(null);
      setExpandedYear(null);
      setShowQuestionGrid(false);
      return;
    }
    setView("subjects");
  };

  const saveAnswer = async (questionId: string, answer: string) => {
    const requestSequence = (answerCheckSequenceRef.current[questionId] ?? 0) + 1;
    answerCheckSequenceRef.current[questionId] = requestSequence;
    setSelected((previous) => ({ ...previous, [questionId]: answer }));
    setFeedbacks((previous) => {
      const next = { ...previous };
      delete next[questionId];
      return next;
    });
    savePracticeAnswer(questionId, answer);
    setChecking((previous) => ({ ...previous, [questionId]: true }));
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("exam-practice", {
        body: {
          action: "check-answer",
          exam_program_id: "jamb",
          question_id: questionId,
          selected_option: answer,
        },
      });
      if (invokeError) throw invokeError;
      if (answerCheckSequenceRef.current[questionId] !== requestSequence) return;
      setFeedbacks((previous) => ({
        ...previous,
        [questionId]: {
          gradable: data?.gradable === true,
          isCorrect: data?.gradable === true ? data.is_correct === true : undefined,
          correctOption: data?.gradable === true ? data.correct_option : undefined,
          explanation: data?.gradable === true ? data.explanation : undefined,
          message: data?.message,
        },
      }));
    } catch (reason) {
      if (answerCheckSequenceRef.current[questionId] !== requestSequence) return;
      setFeedbacks((previous) => ({
        ...previous,
        [questionId]: {
          gradable: false,
          message: reason instanceof Error ? reason.message : "Answer checking is temporarily unavailable.",
        },
      }));
    } finally {
      if (answerCheckSequenceRef.current[questionId] === requestSequence) {
        setChecking((previous) => ({ ...previous, [questionId]: false }));
      }
    }
  };

  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setActiveQuestionIndex(index);
    setShowQuestionGrid(false);
  };

  const goToNextQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex((value) => value + 1);
      return;
    }
    if (offset + JAMB_INITIAL_QUESTION_PAGE_SIZE < count) {
      pendingQuestionIndexRef.current = 0;
      setOffset((value) => value + JAMB_INITIAL_QUESTION_PAGE_SIZE);
    }
  };

  const goToPreviousQuestion = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex((value) => value - 1);
      return;
    }
    if (offset > 0) {
      pendingQuestionIndexRef.current = JAMB_INITIAL_QUESTION_PAGE_SIZE - 1;
      setOffset((value) => Math.max(0, value - JAMB_INITIAL_QUESTION_PAGE_SIZE));
    }
  };

  const renderQuestionCard = (question: JambQuestion) => {
    const bookmarked = bookmarksReady && bookmarks.includes(question.id);
    const current = selected[question.id] ?? savedAnswers[question.id]?.selected ?? "";
    const feedback = feedbacks[question.id];

    return (
      <article key={question.id} className="rounded-2xl border border-border bg-card p-4 chalk-texture sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{question.year}</span>
            <span>{JAMB_SUBJECT_INFO[question.subject].label}</span>
            {question.topic && <><span className="text-muted-foreground/40">·</span><span>{question.topic}</span></>}
            {question.sourceQuestionNumber && <span>· Source Q{question.sourceQuestionNumber}</span>}
          </div>
          <button
            type="button"
            onClick={() => toggleJambBookmark(question.id)}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent active:scale-95"
          >
            {bookmarked
              ? <BookmarkCheck className="h-5 w-5 text-primary" />
              : <Bookmark className="h-5 w-5 text-muted-foreground" />}
          </button>
        </div>

        <div className="mb-4 max-h-[42vh] overflow-y-auto overscroll-contain pr-1 text-sm font-medium leading-relaxed sm:text-base">
          <QuestionMath content={question.question} />
        </div>
        {question.imageUrls.map((url) => (
          <QuestionImage key={url} imageUrl={url} alt={JAMB_SUBJECT_INFO[question.subject].label + " question illustration"} />
        ))}
        <div className="space-y-2">
          {question.options.map((option) => {
            const isSelected = current === option.label;
            const isApproved = feedback?.gradable === true && feedback.correctOption === option.label;
            const isWrongSelection = feedback?.gradable === true && isSelected && feedback.isCorrect === false;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => void saveAnswer(question.id, option.label)}
                aria-pressed={isSelected}
                className={[
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all active:scale-[0.97]",
                  isApproved
                    ? "border-green-500/50 bg-green-50/50 font-medium text-green-700 dark:bg-green-950/20 dark:text-green-300"
                    : isWrongSelection
                      ? "border-red-500/50 bg-red-50/50 font-medium text-red-700 dark:bg-red-950/20 dark:text-red-300"
                      : isSelected
                        ? "border-primary/50 bg-primary/5 font-medium text-primary"
                        : "border-border bg-card hover:bg-accent/50",
                ].join(" ")}
              >
                <span className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  isApproved
                    ? "bg-green-600 text-white"
                    : isWrongSelection
                      ? "bg-red-600 text-white"
                      : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                ].join(" ")}>
                  {option.label}
                </span>
                <span className="min-w-0 flex-1 break-words text-pretty">
                  <QuestionMath content={option.text} inline />
                </span>
                {feedback?.gradable === true && isApproved && (
                  <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">Correct</span>
                )}
                {feedback?.gradable === true && isWrongSelection && (
                  <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400">Wrong</span>
                )}
              </button>
            );
          })}
        </div>

        {current && (
          <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed" aria-live="polite">
            {checking[question.id] ? (
              <span className="text-muted-foreground">Checking reviewed answer key…</span>
            ) : feedback?.gradable ? (
              <div className={feedback.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                <strong>{feedback.isCorrect ? "Correct!" : "Not quite. Correct option: " + feedback.correctOption}</strong>
                {feedback.explanation && <p className="mt-1 text-foreground"><QuestionMath content={feedback.explanation} /></p>}
              </div>
            ) : (
              <span className="text-muted-foreground">
                Your choice ({current}) is saved. {feedback?.message ?? "This question has no independently reviewed answer key yet, so it remains ungraded."}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link
            to={"/jamb/ai?subject=" + question.subject + "&questionId=" + encodeURIComponent(question.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Bot className="h-4 w-4" />
            Need a deeper explanation?
            <span aria-hidden="true">✦</span>
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          {view === "subjects" ? (
            <Link
              to="/jamb"
              aria-label="Back to JAMB home"
              className="flex-shrink-0 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="flex-shrink-0 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-sm font-bold">
              {view === "subjects" ? "Study Past Questions"
                : view === "years" ? subjectInfo.label + " · Select Year"
                  : view === "bookmarks" ? "Bookmarked Questions"
                    : subjectInfo.label + " · " + (year ?? "All Years")}
            </h1>
            <p className="text-[10px] text-muted-foreground/70">JAMB UTME Exam Prep</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => { setShowGlobalSearch((value) => !value); setGlobalSearchTerm(""); setGlobalSearchResults([]); }}
              className="rounded-xl p-2 transition-colors hover:bg-accent active:scale-95"
              aria-label="Search questions"
              title="Search questions"
            >
              <Search className="h-[18px] w-[18px] text-muted-foreground" />
            </button>
            {isAdmin && (
              <Link to="/admin/jamb-questions" className="rounded-xl p-2 transition-colors hover:bg-accent active:scale-95" aria-label="Admin: Manage questions" title="Admin: Manage questions">
                <Shield className="h-[18px] w-[18px] text-muted-foreground" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setView("bookmarks")}
              className="relative rounded-xl p-2 transition-colors hover:bg-accent active:scale-95"
              aria-label="View bookmarked questions"
            >
              <Bookmark className="h-[18px] w-[18px] text-muted-foreground" />
              {bookmarks.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {bookmarks.length > 99 ? "99+" : bookmarks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28">
        {showGlobalSearch && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={globalSearchTerm} onChange={(event) => setGlobalSearchTerm(event.target.value)} placeholder="Search JAMB questions..." className="border-border/50 bg-secondary/30 pl-9 pr-10" />
              <button type="button" onClick={() => { setShowGlobalSearch(false); setGlobalSearchTerm(""); setGlobalSearchResults([]); }} aria-label="Close search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            {globalSearchTerm.trim().length >= 2 && (globalSearchLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : globalSearchResults.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">No questions found</p>
            ) : (
              <div className="space-y-2">
                {globalSearchResults.map((question) => (
                  <button key={question.id} type="button" onClick={() => {
                    const inYear = globalSearchResults.filter((item) => item.subject === question.subject && item.year === question.year);
                    pendingQuestionIndexRef.current = Math.max(0, inYear.findIndex((item) => item.id === question.id));
                    setSubject(question.subject); setYear(question.year); setExpandedYear(question.year);
                    setSearch(globalSearchTerm.trim()); setOffset(0); setSelected({}); setView("questions"); setShowGlobalSearch(false);
                  }} className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-primary">{JAMB_SUBJECT_INFO[question.subject].icon} {JAMB_SUBJECT_INFO[question.subject].label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{question.year}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{question.question}</p>
                  </button>
                ))}
              </div>
            ))}
          </motion.section>
        )}
        <AnimatePresence mode="wait">
          {view === "subjects" && (
            <motion.section
              key="subjects"
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-6"
            >
              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">JAMB database unavailable</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">JAMB questions are temporarily unavailable.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Subjects</h2>
                <span className="text-xs text-muted-foreground">{totalPublished.toLocaleString()} questions total</span>
              </div>
              <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                animate="show"
              >
                {JAMB_SUBJECTS.map((item) => (
                  <motion.div
                    key={item}
                    variants={{ hidden: { opacity: 0, y: 24, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } } }}
                  >
                    <SubjectCard subject={item} summary={summaries.find((row) => row.subject === item)} onClick={() => chooseSubject(item)} />
                  </motion.div>
                ))}
              </motion.div>

            </motion.section>
          )}

          {view === "years" && (
            <motion.section
              key={"years-" + subject}
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">{subjectInfo.icon}</span>
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground">Subject</h2>
                    <p className="font-semibold">{subjectInfo.label}</p>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {JAMB_SUBJECTS.map((item) => {
                    const isActive = subject === item;
                    const subjectCount = summaries.find((row) => row.subject === item)?.count;
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => chooseSubject(item)}
                        aria-pressed={isActive}
                        className={[
                          "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                          isActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                        ].join(" ")}
                      >
                        <span>{JAMB_SUBJECT_INFO[item].icon}</span>
                        <span>{JAMB_SUBJECT_INFO[item].label}</span>
                        <span className="opacity-70 tabular-nums">{subjectCount === undefined ? "…" : subjectCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">JAMB database unavailable</p>
                    <p className="mt-1 text-xs text-muted-foreground">JAMB questions are temporarily unavailable.</p>
                  </div>
                </div>
              )}
              {error && !schemaUnavailable && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">Select Year</h2>
                <button type="button" onClick={() => chooseYear(null)} className="text-xs font-semibold text-primary hover:underline">All available years</button>
              </div>

              {loadingYears ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : years.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                  <h3 className="font-semibold">No published {subjectInfo.label} years yet</h3>
                  
                  <Button variant="outline" className="mt-4" onClick={() => setView("subjects")}>Back to subjects</Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {years.map((item, index) => {
                    const expanded = expandedYear === item;
                    return (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedYear(expanded ? null : item)}
                          aria-expanded={expanded}
                          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50 active:scale-[0.97]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold tabular-nums">{item}</span>
                            
                          </div>
                          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-3 px-4 py-3">
                                <Button size="sm" onClick={() => chooseYear(item)}>
                                  View Questions
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {view === "questions" && (
            <motion.section
              key={"questions-" + subject + "-" + (year ?? "all")}
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-2xl">{subjectInfo.icon}</span>
                    <div className="min-w-0">
                      <h2 className="font-semibold">{subjectInfo.label}</h2>
                      <p className="text-xs text-muted-foreground">{year ?? "All available years"}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setView("years")} className="text-xs font-semibold text-primary hover:underline">Change year</button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setOffset(0); setActiveQuestionIndex(0); pendingQuestionIndexRef.current = 0; }}
                    placeholder="Search questions..."
                    className="border-border/50 bg-secondary/30 pl-9"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => { setSearch(""); setOffset(0); setActiveQuestionIndex(0); pendingQuestionIndexRef.current = 0; }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div><p className="font-semibold">JAMB database unavailable</p><p className="mt-1 text-xs text-muted-foreground">JAMB questions are temporarily unavailable.</p></div>
                </div>
              )}
              {error && !schemaUnavailable && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : empty ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <BookOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                  <h3 className="font-semibold">No published {subjectInfo.label} questions yet</h3>
                  
                  <Button variant="outline" className="mt-4" onClick={() => setView("years")}>Back to years</Button>
                </div>
              ) : activeQuestion ? (
                <>
                  <AnimatePresence>
                    {showQuestionGrid && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={() => setShowQuestionGrid(false)}
                      >
                        <motion.div
                          initial={{ scale: 0.94, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.94, opacity: 0 }}
                          transition={PAGE_TRANSITION}
                          role="dialog"
                          aria-modal="true"
                          aria-label="Jump to question"
                          onClick={(event) => event.stopPropagation()}
                          className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Jump to Question</h3>
                            <button
                              type="button"
                              onClick={() => setShowQuestionGrid(false)}
                              aria-label="Close question navigator"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {questions.map((item, index) => {
                              const isAnswered = Boolean(selected[item.id] ?? savedAnswers[item.id]?.selected);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => goToQuestion(index)}
                                  aria-label={"Jump to question " + (offset + index + 1)}
                                  aria-current={activeQuestionIndex === index ? "step" : undefined}
                                  className={[
                                    "flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-all",
                                    activeQuestionIndex === index
                                      ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/20"
                                      : isAnswered
                                        ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50",
                                  ].join(" ")}
                                >
                                  {offset + index + 1}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Current</span>
                            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Answered</span>
                            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-border bg-secondary/40" /> Unanswered</span>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs tabular-nums text-muted-foreground">
                          Question {offset + activeQuestionIndex + 1} of {count.toLocaleString()}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {answeredOnPage}/{questions.length} on this page
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          initial={false}
                          animate={{ width: count > 0 ? ((offset + activeQuestionIndex + 1) / count) * 100 + "%" : "0%" }}
                          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuestionGrid(true)}
                      className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent active:scale-95"
                      aria-label="Jump to question"
                    >
                      <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{count.toLocaleString()} published questions</span>
                    <span>Page {pageNumber} of {totalPages}</span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeQuestion.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={PAGE_TRANSITION}
                    >
                      {renderQuestionCard(activeQuestion)}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" onClick={goToPreviousQuestion} disabled={activeQuestionIndex === 0 && offset === 0}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      onClick={goToNextQuestion}
                      disabled={activeQuestionIndex === questions.length - 1 && offset + JAMB_INITIAL_QUESTION_PAGE_SIZE >= count}
                    >
                      {activeQuestionIndex === questions.length - 1 && offset + JAMB_INITIAL_QUESTION_PAGE_SIZE < count ? "Next page" : "Next question"}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{answeredOnPage} of {questions.length} loaded questions answered</span>
                    <span>Page {pageNumber}/{totalPages}</span>
                  </div>
                </>
              ) : null}
            </motion.section>
          )}

          {view === "bookmarks" && (
            <motion.section
              key="bookmarks"
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Bookmarked Questions</h2>
                  <p className="text-xs text-muted-foreground">Your saved JAMB questions only</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{bookmarks.length} saved</span>
              </div>
              {!bookmarksReady ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : empty ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <Bookmark className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                  <h3 className="font-semibold">No JAMB bookmarks yet</h3>
                  
                  <Button className="mt-4" onClick={() => setView("subjects")}>Browse subjects</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookmarkQuestions.map((question) => renderQuestionCard(question))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
