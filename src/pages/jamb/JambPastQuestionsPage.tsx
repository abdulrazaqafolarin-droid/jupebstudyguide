import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, Bot,
  CalendarDays, ChevronLeft, ChevronRight, GraduationCap, Loader2,
  Search, ShieldAlert, X,
} from "lucide-react";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
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
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 chalk-texture transition-all hover:border-primary/40 hover:shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-3xl">{info.icon}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <h2 className="text-xl font-semibold group-hover:text-primary">{info.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>
          <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3 text-xs">
            <span className="text-muted-foreground">Published questions</span>
            <span className="font-semibold tabular-nums text-primary">{summary?.count.toLocaleString() ?? "—"}</span>
          </div>
        </div>
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
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [bookmarkQuestions, setBookmarkQuestions] = useState<JambQuestion[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
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

  // Load JAMB-only subject totals for the first screen.
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

  // Subject selection opens the JUPEB-style year selection stage.
  useEffect(() => {
    if (view !== "years") return;
    let active = true;
    setLoadingYears(true);
    setError(null);
    getJambQuestionYears(subject)
      .then((available) => { if (active) { setYears(available); setSchemaUnavailable(false); } })
      .catch((reason: unknown) => {
        if (!active) return;
        setYears([]);
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load available years.");
      })
      .finally(() => { if (active) setLoadingYears(false); });
    return () => { active = false; };
  }, [subject, view]);

  // Question requests remain scoped to the selected JAMB subject and year.
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
        setSchemaUnavailable(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setQuestions([]);
        setCount(0);
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load JAMB questions.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subject, year, search, offset, view]);

  // Bookmarks are resolved through the JAMB-only published-question projection.
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
  const visibleCount = view === "bookmarks" ? bookmarkQuestions.length : count;
  const empty = !loading && visibleQuestions.length === 0;

  const chooseSubject = (nextSubject: JambSubject) => {
    setSubject(nextSubject);
    setYear(null);
    setSearch("");
    setOffset(0);
    setSelected({});
    setView("years");
  };

  const chooseYear = (nextYear: number | null) => {
    setYear(nextYear);
    setSearch("");
    setOffset(0);
    setSelected({});
    setView("questions");
  };

  const handleBack = () => {
    if (view === "subjects") return;
    if (view === "years") {
      setView("subjects");
      setYear(null);
      return;
    }
    if (view === "questions") {
      if (search) { setSearch(""); setOffset(0); return; }
      setView("years");
      setYear(null);
      return;
    }
    setView("subjects");
  };

  const saveAnswer = async (questionId: string, answer: string) => {
    setSelected((previous) => ({ ...previous, [questionId]: answer }));
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
      setFeedbacks((previous) => ({
        ...previous,
        [questionId]: {
          gradable: false,
          message: reason instanceof Error ? reason.message : "Answer checking is temporarily unavailable.",
        },
      }));
    } finally {
      setChecking((previous) => ({ ...previous, [questionId]: false }));
    }
  };

  const renderQuestionCards = (items: JambQuestion[]) => items.map((question) => {
    const bookmarked = bookmarksReady && bookmarks.includes(question.id);
    const saved = savedAnswers[question.id]?.selected;
    const current = selected[question.id] ?? saved ?? "";
    const feedback = feedbacks[question.id];
    return (
      <article key={question.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 chalk-texture transition-all hover:border-primary/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-primary">{question.year}</span>
            <span>{JAMB_SUBJECT_INFO[question.subject].label}</span>
            {question.topic && <><span className="text-muted-foreground/40">·</span><span>{question.topic}</span></>}
            {question.sourceQuestionNumber && <span>· Source Q{question.sourceQuestionNumber}</span>}
          </div>
          <button
            type="button"
            onClick={() => toggleJambBookmark(question.id)}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent"
          >
            {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        <div className="mb-4 text-sm font-medium leading-relaxed sm:text-base">
          <QuestionMath content={question.question} />
        </div>
        {question.imageUrls.map((url) => (
          <QuestionImage key={url} imageUrl={url} alt={`${JAMB_SUBJECT_INFO[question.subject].label} question illustration`} />
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => void saveAnswer(question.id, option.label)}
              aria-pressed={current === option.label}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${current === option.label ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"}`}
            >
              <span className="font-bold text-primary">{option.label}.</span>
              <QuestionMath content={option.text} inline />
            </button>
          ))}
        </div>

        {current && (
          <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
            {checking[question.id] ? (
              <span className="text-muted-foreground">Checking reviewed answer key…</span>
            ) : feedback?.gradable ? (
              <div className={feedback.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                <strong>{feedback.isCorrect ? "Correct" : `Not quite. Correct option: ${feedback.correctOption}`}</strong>
                {feedback.explanation && <p className="mt-1 text-foreground">{feedback.explanation}</p>}
              </div>
            ) : (
              <span className="text-muted-foreground">
                Your choice ({current}) is saved. Select an option to request a check against the reviewed JAMB answer key. {feedback?.message ?? ""}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link
            to={`/jamb/ai?subject=${question.subject}&questionId=${encodeURIComponent(question.id)}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Bot className="h-4 w-4" /> Ask the JAMB tutor
          </Link>
        </div>
      </article>
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
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
            <h1 className="truncate text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {view === "subjects" ? "Study Past Questions"
                : view === "years" ? `${subjectInfo.label} · Select Year`
                  : view === "bookmarks" ? "Bookmarked Questions"
                    : year ? `${subjectInfo.label} · ${year}` : `${subjectInfo.label} Questions`}
            </h1>
            <p className="text-[10px] text-muted-foreground/70">
              {view === "subjects" ? "JAMB UTME Exam Prep"
                : view === "bookmarks" ? "Saved JAMB questions"
                  : "JAMB workspace · Objective practice"}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setView("bookmarks")}
              className="relative rounded-xl p-2 transition-colors hover:bg-accent"
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
              <div className="rounded-2xl border border-border bg-card p-4 chalk-texture">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">Choose a JAMB subject</h2>
                    <p className="text-xs text-muted-foreground">Select a subject, then choose an available examination year.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-primary">{totalPublished.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">published</p>
                  </div>
                </div>
              </div>

              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div><p className="font-semibold">JAMB database unavailable</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The JAMB page does not fall back to JUPEB questions. The JAMB programme data source must be available before content can appear.</p></div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Subjects</h2>
                <span className="text-xs text-muted-foreground">3 science subjects</span>
              </div>
              <motion.div
                className="grid gap-4 sm:grid-cols-2"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                animate="show"
              >
                {JAMB_SUBJECTS.map((item) => (
                  <motion.div key={item} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                    <SubjectCard
                      subject={item}
                      summary={summaries.find((row) => row.subject === item)}
                      onClick={() => chooseSubject(item)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-semibold">A note about complete UTME mocks</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      The initial supplied pack covers Physics, Chemistry and Biology. Use of English is compulsory in UTME,
                      so this question collection is not presented as a complete official-format mock.
                    </p>
                    <Link to="/jamb/syllabus" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      Check syllabus status <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {view === "years" && (
            <motion.section
              key={`years-${subject}`}
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-6"
            >
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">{subjectInfo.icon}</span>
                  <div><h2 className="font-semibold">{subjectInfo.label}</h2><p className="text-xs text-muted-foreground">Choose an available year or search across all years.</p></div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {JAMB_SUBJECTS.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => chooseSubject(item)}
                      aria-pressed={subject === item}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${subject === item ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    >
                      <span>{JAMB_SUBJECT_INFO[item].icon}</span>{JAMB_SUBJECT_INFO[item].label}
                    </button>
                  ))}
                </div>
              </div>

              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div><p className="font-semibold">JAMB database unavailable</p><p className="mt-1 text-xs text-muted-foreground">Available years cannot be loaded until the JAMB question schema is reachable.</p></div>
                </div>
              )}
              {error && !schemaUnavailable && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Select Year</h2>
                <button type="button" onClick={() => chooseYear(null)} className="text-xs font-semibold text-primary hover:underline">All available years</button>
              </div>

              {loadingYears ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : years.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                  <h3 className="font-semibold">No published {subjectInfo.label} years yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Years appear here after their JAMB questions have been reviewed and published.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setView("subjects")}>Back to subjects</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {years.map((item, index) => (
                    <motion.button
                      key={item}
                      type="button"
                      onClick={() => chooseYear(item)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                      className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                      <p className="mt-3 text-2xl font-bold tabular-nums">{item}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Past questions</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {view === "questions" && (
            <motion.section
              key={`questions-${subject}-${year ?? "all"}`}
              initial={PAGE_VARIANTS.initial}
              animate={PAGE_VARIANTS.animate}
              exit={PAGE_VARIANTS.exit}
              transition={PAGE_TRANSITION}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{subjectInfo.icon}</span>
                    <div className="min-w-0"><h2 className="font-semibold">{subjectInfo.label}</h2><p className="text-xs text-muted-foreground">{year ?? "All available years"} · Objective questions</p></div>
                  </div>
                  <button type="button" onClick={() => setView("years")} className="text-xs font-semibold text-primary hover:underline">Change year</button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search questions..." className="pl-9 bg-secondary/30 border-border/50" />
                  {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>}
                </div>
              </div>

              {schemaUnavailable && (
                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                  <div><p className="font-semibold">JAMB database unavailable</p><p className="mt-1 text-xs text-muted-foreground">This screen never substitutes JUPEB questions.</p></div>
                </div>
              )}
              {error && !schemaUnavailable && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : empty ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <BookOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                  <h3 className="font-semibold">No published {subjectInfo.label} questions yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Imported questions appear here after review and publication.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setView("years")}>Back to years</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{count.toLocaleString()} published questions</span><span>Page {pageNumber} of {totalPages}</span>
                  </div>
                  <div className="space-y-4">{renderQuestionCards(questions)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - JAMB_INITIAL_QUESTION_PAGE_SIZE))}><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
                    <Button variant="outline" disabled={offset + JAMB_INITIAL_QUESTION_PAGE_SIZE >= count} onClick={() => setOffset((value) => value + JAMB_INITIAL_QUESTION_PAGE_SIZE)}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                </>
              )}
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
                <div><h2 className="text-xl font-bold">Bookmarked Questions</h2><p className="text-xs text-muted-foreground">Your saved JAMB questions only</p></div>
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
                  <p className="mt-1 text-sm text-muted-foreground">Save questions with the bookmark icon and they will appear here.</p>
                  <Button className="mt-4" onClick={() => setView("subjects")}>Browse subjects</Button>
                </div>
              ) : (
                <div className="space-y-4">{renderQuestionCards(bookmarkQuestions)}</div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          JAMB question-bank answers and explanations are shown only after independent review. Your saved choices and bookmarks remain programme-specific.
        </p>
      </main>
    </div>
  );
}
