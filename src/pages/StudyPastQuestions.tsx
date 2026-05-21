import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Bookmark,
  BookmarkCheck,
  X,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  Search,
} from "lucide-react";
import type { Subject } from "@/types/question";
import type { StudyCategory, StudyQuestion } from "@/types/study-questions";
import { STUDY_SUBJECT_INFO, STUDY_YEARS } from "@/types/study-questions";
import { getStudyQuestionsBySubject } from "@/data/study-questions";
import { useStudyQuestions } from "@/hooks/study-questions/useStudyQuestions";
import { useQuestionTimer } from "@/hooks/study-questions/useQuestionTimer";
import { useBookmarks } from "@/hooks/study-questions/useBookmarks";
import { StudyCategoryTabs } from "@/components/study-past-questions/StudyCategoryTabs";
import { SubjectCardGrid } from "@/components/study-past-questions/SubjectCardGrid";
import { YearAccordion } from "@/components/study-past-questions/YearAccordion";
import { QuestionViewer } from "@/components/study-past-questions/QuestionViewer";
import { StudyTimer } from "@/components/study-past-questions/StudyTimer";
import { cn } from "@/lib/utils";

type View = "subjects" | "years" | "questions" | "bookmarks";

interface AnswerEntry {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

const SUBJECTS: Subject[] = ["physics", "chemistry", "biology", "math"];
const CATEGORIES: StudyCategory[] = ["objective", "theory", "practical"];

const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const PAGE_TRANSITION = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

function findQuestionById(id: string): StudyQuestion | null {
  for (const year of STUDY_YEARS) {
    for (const s of SUBJECTS) {
      for (const c of CATEGORIES) {
        const qs = getStudyQuestionsBySubject(s, year, c);
        const found = qs.find((q) => q.id === id);
        if (found) return found;
      }
    }
  }
  return null;
}

export default function StudyPastQuestions() {
  const navigate = useNavigate();
  const {
    selectedSubject,
    selectedYear,
    selectedCategory,
    questions,
    selectSubject,
    selectYear,
    selectCategory,
    reset,
  } = useStudyQuestions();
  const timer = useQuestionTimer();
  const { bookmarks, toggle, isBookmarked } = useBookmarks();

  const [view, setView] = useState<View>("subjects");
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<AnswerEntry[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudyQuestion[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { objective: 0, theory: 0, practical: 0 };
    for (const year of STUDY_YEARS) {
      for (const s of SUBJECTS) {
        for (const c of CATEGORIES) {
          counts[c] += getStudyQuestionsBySubject(s, year, c).length;
        }
      }
    }
    return counts as Record<StudyCategory, number>;
  }, []);

  const subjectCounts = useMemo(() => {
    const counts: Partial<Record<Subject, number>> = {};
    for (const s of SUBJECTS) {
      counts[s] = 0;
      for (const year of STUDY_YEARS) {
        counts[s]! += getStudyQuestionsBySubject(s, year, selectedCategory).length;
      }
    }
    return counts as Record<Subject, number>;
  }, [selectedCategory]);

  const yearCounts = useMemo(() => {
    if (!selectedSubject) return {} as Record<number, number>;
    const counts: Record<number, number> = {};
    for (const year of STUDY_YEARS) {
      counts[year] = getStudyQuestionsBySubject(selectedSubject, year, selectedCategory).length;
    }
    return counts;
  }, [selectedSubject, selectedCategory]);

  const yearCategoryCounts = useMemo(() => {
    if (!selectedSubject) return {} as Record<number, Record<StudyCategory, number>>;
    const result: Record<number, Record<StudyCategory, number>> = {};
    for (const year of STUDY_YEARS) {
      result[year] = { objective: 0, theory: 0, practical: 0 };
      for (const cat of CATEGORIES) {
        result[year][cat] = getStudyQuestionsBySubject(selectedSubject, year, cat).length;
      }
    }
    return result;
  }, [selectedSubject]);

  const bookmarkedQuestions = useMemo(() => {
    return bookmarks
      .map((b) => ({ bookmark: b, question: findQuestionById(b.questionId) }))
      .filter((entry) => entry.question !== null)
      .map((entry) => entry.question!) as StudyQuestion[];
  }, [bookmarks]);

  const selectedBookmarkQuestion = useMemo(() => {
    if (!selectedBookmarkId) return null;
    return bookmarkedQuestions.find((q) => q.id === selectedBookmarkId) ?? null;
  }, [selectedBookmarkId, bookmarkedQuestions]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results: StudyQuestion[] = [];
    for (const year of STUDY_YEARS) {
      for (const s of SUBJECTS) {
        for (const c of CATEGORIES) {
          for (const question of getStudyQuestionsBySubject(s, year, c)) {
            if (
              question.question.toLowerCase().includes(q) ||
              (question.topic && question.topic.toLowerCase().includes(q)) ||
              (question.explanation && question.explanation.toLowerCase().includes(q)) ||
              (question.correctAnswer && question.correctAnswer.toLowerCase().includes(q))
            ) {
              results.push(question);
              if (results.length >= 50) break;
            }
          }
          if (results.length >= 50) break;
        }
        if (results.length >= 50) break;
      }
      if (results.length >= 50) break;
    }
    setSearchResults(results);
  }, []);

  const handleSubjectSelect = (subject: Subject) => {
    selectSubject(subject);
    setView("years");
  };

  const handleYearSelect = (year: number) => {
    selectYear(year);
    setView("questions");
  };

  const handleBack = () => {
    if (view === "years") {
      setView("subjects");
      reset();
    } else if (view === "questions") {
      setView("years");
      timer.stop();
      setQuizComplete(false);
      setQuizResults([]);
      setUserAnswers({});
    } else if (view === "bookmarks") {
      setSelectedBookmarkId(null);
      setView("subjects");
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleComplete = (results: AnswerEntry[]) => {
    setQuizResults(results);
    setQuizComplete(true);
    timer.stop();
  };

  useEffect(() => {
    if (timer.state === "expired" && !quizComplete && questions.length > 0) {
      const results = questions.map((q) => {
        const answer = userAnswers[q.id] || "";
        const hasRealAnswer = !!q.correctAnswer && q.correctAnswer !== "TBD" && q.correctAnswer !== "tbd";
        const isCorrect = hasRealAnswer
          ? answer.toUpperCase() === q.correctAnswer.toUpperCase()
          : true;
        return { questionId: q.id, answer, isCorrect };
      });
      setQuizResults(results);
      setQuizComplete(true);
    }
  }, [timer.state, quizComplete, questions, userAnswers]);

  const handleRestartQuiz = () => {
    timer.stop();
    setQuizComplete(false);
    setQuizResults([]);
    setUserAnswers({});
    setView("years");
  };

  const correctCount = quizResults.filter((r) => r.isCorrect).length;
  const totalCount = quizResults.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const categoryLabel =
    selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
  const subjectLabel = selectedSubject
    ? STUDY_SUBJECT_INFO[selectedSubject].subject.charAt(0).toUpperCase() +
      STUDY_SUBJECT_INFO[selectedSubject].subject.slice(1)
    : "";

  const hasTimerRunning =
    timer.state === "running" || timer.state === "paused";

  return (
    <div className="min-h-screen bg-background">
      {view === "subjects" && (
        <>
           <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              {showSearch ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="flex-1 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex-shrink-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <h1 className="flex-1 text-center text-sm font-semibold truncate">Study Past Questions</h1>
                  <button
                    onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
                    aria-label="Search questions"
                  >
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setView("bookmarks")}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
                    aria-label="View bookmarked questions"
                  >
                    <Bookmark className="w-5 h-5 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence mode="wait">
              {showSearch && searchQuery.length >= 2 ? (
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <p className="text-xs text-muted-foreground mb-2">
                    {searchResults.length === 0 ? "No questions found" : `${searchResults.length} question(s) found`}
                  </p>
                  {searchResults.map((q) => {
                    const info = STUDY_SUBJECT_INFO[q.subject];
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          selectSubject(q.subject);
                          selectYear(q.year);
                          setShowSearch(false);
                          setSearchQuery("");
                          setSearchResults([]);
                          setView("questions");
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-xl bg-card border text-left hover:bg-accent/50 transition-colors active:scale-[0.97]"
                      >
                        <span className="text-lg mt-0.5">{info.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="tabular-nums">{q.year}</span>
                            <span className="capitalize">{q.category}</span>
                            {q.topic && <><span className="text-muted-foreground/40">&middot;</span><span className="truncate">{q.topic}</span></>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
              <motion.div
                key="subjects"
                initial={PAGE_VARIANTS.initial}
                animate={PAGE_VARIANTS.animate}
                exit={PAGE_VARIANTS.exit}
                transition={PAGE_TRANSITION}
                className="space-y-6"
              >
                <StudyCategoryTabs
                  value={selectedCategory}
                  onChange={selectCategory}
                  counts={tabCounts}
                />

                <SubjectCardGrid
                  onSelect={handleSubjectSelect}
                  counts={subjectCounts}
                />
              </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      )}

      {view === "years" && (
        <>
           <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              <button
                onClick={handleBack}
                className="flex-shrink-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                style={{ transitionProperty: "color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="flex-1 text-center text-sm font-semibold truncate">
                {categoryLabel}
              </h1>
              <div className="flex-shrink-0 w-9" />
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="years"
                initial={PAGE_VARIANTS.initial}
                animate={PAGE_VARIANTS.animate}
                exit={PAGE_VARIANTS.exit}
                transition={PAGE_TRANSITION}
                className="space-y-6"
              >
                <div className="rounded-2xl bg-card border p-4">
                  <StudyTimer
                    state={timer.state}
                    formatted={timer.formatted}
                    progress={timer.progress}
                    duration={timer.duration}
                    noTimer={timer.noTimer}
                    onStart={timer.start}
                    onPause={timer.pause}
                    onResume={timer.resume}
                    onStop={timer.stop}
                    onToggleNoTimer={timer.toggleNoTimer}
                  />
                </div>

                <div className="rounded-2xl bg-card border p-4">
                  <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Subject</h2>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {SUBJECTS.map((s) => {
                      const info = STUDY_SUBJECT_INFO[s];
                      const isActive = selectedSubject === s;
                      const subjCount = subjectCounts[s] ?? 0;
                      return (
                        <button
                          key={s}
                          onClick={() => selectSubject(s)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <span>{info.icon}</span>
                          <span className="tabular-nums">{subjCount}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold mb-3 text-muted-foreground">
                    Select Year
                  </h2>
                  <YearAccordion
                    years={STUDY_YEARS}
                    counts={yearCounts}
                    categoryCounts={yearCategoryCounts}
                    selectedYear={selectedYear}
                    onSelectYear={handleYearSelect}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}

      {view === "questions" && (
        <>
           <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              <button
                onClick={handleBack}
                className="flex-shrink-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                style={{ transitionProperty: "color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="flex-1 text-center text-sm font-semibold truncate">
                {subjectLabel} &mdash; {selectedYear}
              </h1>
              <div className="flex-shrink-0 flex items-center gap-2">
                {hasTimerRunning && (
                  <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{timer.formatted}</span>
                  </div>
                )}
                {timer.state === "expired" && (
                  <div className="flex items-center gap-1.5 text-xs tabular-nums text-destructive font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Time&rsquo;s up</span>
                  </div>
                )}
              </div>
            </div>
          </header>

           <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
            <AnimatePresence mode="wait">
              {!quizComplete ? (
                <motion.div
                  key="questions"
                  initial={PAGE_VARIANTS.initial}
                  animate={PAGE_VARIANTS.animate}
                  exit={PAGE_VARIANTS.exit}
                  transition={PAGE_TRANSITION}
                >
                  <QuestionViewer
                    questions={questions}
                    subject={selectedSubject!}
                    timer={{
                      state: timer.state,
                      formatted: timer.formatted,
                      progress: timer.progress,
                      remaining: timer.remaining,
                    }}
                    onAnswer={handleAnswer}
                    onComplete={handleComplete}
                    isBookmarked={(id) => isBookmarked(id)}
                    onToggleBookmark={(id) => toggle(id)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={PAGE_TRANSITION}
                  className="space-y-6"
                >
                  <div className="text-center py-8">
                    <div className="text-5xl font-bold mb-2">{score}%</div>
                    <p className="text-muted-foreground">
                      {correctCount} of {totalCount} correct
                    </p>
                    <div className="mt-4 mx-auto max-w-xs h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {quizResults.map((r, i) => {
                      const q = questions[i];
                      if (!q) return null;
                      return (
                        <div
                          key={r.questionId}
                          className={cn(
                            "p-4 rounded-xl border",
                            r.isCorrect
                              ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                              : "border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
                          )}
                        >
                          <p className="text-sm font-medium mb-1.5">
                            Q{i + 1}. {q.question}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your answer:{" "}
                            <span className="font-mono">
                              {r.answer || "(skipped)"}
                            </span>
                          </p>
                          {q.correctAnswer && (
                            <p className="text-xs mt-0.5">
                              {r.isCorrect ? (
                                <span className="text-green-600 dark:text-green-400">
                                  Correct
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  Correct answer: {q.correctAnswer}
                                </span>
                              )}
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={handleRestartQuiz}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]"
                      style={{ transitionProperty: "color, background-color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try Another Year
                    </button>
                    <button
                      onClick={() => setView("subjects")}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors active:scale-[0.97]"
                      style={{ transitionProperty: "color, background-color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                    >
                      <BookOpen className="h-4 w-4" />
                      All Subjects
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      )}

      {view === "bookmarks" && (
        <>
           <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
              {selectedBookmarkId ? (
                <button
                  onClick={() => setSelectedBookmarkId(null)}
                  className="flex-shrink-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  style={{ transitionProperty: "color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              ) : (
                <button
                  onClick={handleBack}
                  className="flex-shrink-0 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  style={{ transitionProperty: "color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              )}
              <h1 className="flex-1 text-center text-sm font-semibold truncate">
                {selectedBookmarkId ? "Question" : "Bookmarked Questions"}
              </h1>
              <div className="flex-shrink-0 w-9" />
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              {selectedBookmarkQuestion ? (
                <motion.div
                  key="bookmark-detail"
                  initial={PAGE_VARIANTS.initial}
                  animate={PAGE_VARIANTS.animate}
                  exit={PAGE_VARIANTS.exit}
                  transition={PAGE_TRANSITION}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {STUDY_SUBJECT_INFO[selectedBookmarkQuestion.subject].icon}{" "}
                      {selectedBookmarkQuestion.subject.charAt(0).toUpperCase() +
                        selectedBookmarkQuestion.subject.slice(1)}
                    </span>
                    <span className="tabular-nums">{selectedBookmarkQuestion.year}</span>
                    <span className="capitalize">{selectedBookmarkQuestion.category}</span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-base font-medium leading-relaxed">
                      {selectedBookmarkQuestion.question}
                    </p>

                    {selectedBookmarkQuestion.options && (
                      <div className="space-y-2">
                        {selectedBookmarkQuestion.options.map((opt) => {
                          const isCorrect =
                            opt.label === selectedBookmarkQuestion.correctAnswer;
                          return (
                            <div
                              key={opt.label}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
                                isCorrect
                                  ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                                  : "border-border bg-card"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                                  isCorrect
                                    ? "bg-green-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {opt.label}
                              </span>
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedBookmarkQuestion.correctAnswer && (
                      <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-500/30">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                          Correct Answer: {selectedBookmarkQuestion.correctAnswer}
                        </p>
                      </div>
                    )}

                    {selectedBookmarkQuestion.explanation && (
                      <div className="p-4 rounded-xl bg-card border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Explanation
                        </p>
                        <p className="text-sm leading-relaxed">
                          {selectedBookmarkQuestion.explanation}
                        </p>
                      </div>
                    )}

                    {selectedBookmarkQuestion.answerGuide && (
                      <div className="p-4 rounded-xl bg-card border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Answer Guide
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {selectedBookmarkQuestion.answerGuide}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => toggle(selectedBookmarkQuestion.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors active:scale-[0.97]"
                    style={{ transitionProperty: "color, background-color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                  >
                    <BookmarkCheck className="h-4 w-4" />
                    Remove Bookmark
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="bookmark-list"
                  initial={PAGE_VARIANTS.initial}
                  animate={PAGE_VARIANTS.animate}
                  exit={PAGE_VARIANTS.exit}
                  transition={PAGE_TRANSITION}
                  className="space-y-4"
                >
                  {bookmarkedQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Bookmark className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <p className="text-muted-foreground font-medium">
                        No bookmarked questions yet
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Bookmark questions while studying to review them later
                      </p>
                    </div>
                  ) : (
                    bookmarkedQuestions.map((q) => {
                      const info = STUDY_SUBJECT_INFO[q.subject];
                      return (
                        <motion.button
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setSelectedBookmarkId(q.id)}
                          className="w-full flex items-start gap-4 p-4 rounded-xl bg-card border text-left hover:bg-accent/50 transition-colors active:scale-[0.97]"
                          style={{ transitionProperty: "color, background-color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                        >
                          <span className="text-xl mt-0.5">{info.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {q.question}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span className="tabular-nums">{q.year}</span>
                              <span className="capitalize">{q.category}</span>
                              {q.topic && (
                                <>
                                  <span className="text-muted-foreground/40">&middot;</span>
                                  <span className="truncate">{q.topic}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(q.id);
                            }}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
                            style={{ transitionProperty: "color, background-color", transitionDuration: "160ms", transitionTimingFunction: "ease-out" }}
                            aria-label="Remove bookmark"
                          >
                            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </motion.button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}
