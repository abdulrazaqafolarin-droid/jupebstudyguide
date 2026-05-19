import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Send, RotateCcw,
  Grid3X3, X, Check, Minus,
} from "lucide-react";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import type { Subject } from "@/types/question";
import { cn } from "@/lib/utils";
import { ImageAnswerInput } from "./ImageAnswerInput";

interface AnswerEntry {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

interface QuestionViewerProps {
  questions: StudyQuestion[];
  subject: Subject;
  timer?: { state: string; formatted: string; progress: number; remaining: number };
  onAnswer?: (questionId: string, answer: string) => void;
  onComplete?: (answers: AnswerEntry[]) => void;
  onBack?: () => void;
  isBookmarked?: (id: string) => boolean;
  onToggleBookmark?: (id: string) => void;
}

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

export function QuestionViewer({
  questions,
  subject,
  timer,
  onAnswer,
  onComplete,
  onBack,
  isBookmarked,
  onToggleBookmark,
}: QuestionViewerProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [theoryAnswers, setTheoryAnswers] = useState<Record<string, string>>({});
  const [submittedTheory, setSubmittedTheory] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<AnswerEntry[]>([]);
  const [showJumpGrid, setShowJumpGrid] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const question = questions[current];
  const category = question?.category ?? "objective";
  const total = questions.length;
  const answeredCount = Object.keys(answers).length + submittedTheory.size;
  const allAnswered = answeredCount >= total;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setCurrent(idx);
    setShowJumpGrid(false);
  }, []);

  const handleMCQSelect = useCallback((optionLabel: string) => {
    const q = questions[current];
    if (!q || submitted) return;
    const newAnswers = { ...answers, [q.id]: optionLabel };
    setAnswers(newAnswers);
    onAnswer?.(q.id, optionLabel);
  }, [current, questions, submitted, answers, onAnswer]);

  const handleTheoryAnswer = useCallback((qId: string, text: string) => {
    setTheoryAnswers((prev) => ({ ...prev, [qId]: text }));
  }, []);

  const handleSubmitTheory = useCallback((qId: string, text?: string) => {
    const answerText = text ?? theoryAnswers[qId] ?? "";
    if (!answerText.trim()) return;
    setSubmittedTheory((prev) => new Set(prev).add(qId));
    onAnswer?.(qId, answerText);
  }, [theoryAnswers, onAnswer]);

  const handleSubmitAll = useCallback(() => {
    const all: AnswerEntry[] = questions.map((q) => {
      const answer = answers[q.id] ?? theoryAnswers[q.id] ?? "";
      const isCorrect = q.correctAnswer
        ? answer.toUpperCase() === q.correctAnswer.toUpperCase()
        : true;
      return { questionId: q.id, answer, isCorrect };
    });
    setResults(all);
    setSubmitted(true);
    onComplete?.(all);
  }, [questions, answers, theoryAnswers, onComplete]);

  const handleRestart = useCallback(() => {
    setAnswers({});
    setTheoryAnswers({});
    setSubmittedTheory(new Set());
    setSubmitted(false);
    setResults([]);
    setCurrent(0);
    setDirection(0);
  }, []);

  const bookmark = isBookmarked?.(question?.id ?? "");

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">No questions available.</p>
      </div>
    );
  }

  if (submitted) {
    const correct = results.filter((r) => r.isCorrect).length;
    const score = Math.round((correct / results.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center py-8">
          <div className="text-4xl font-bold mb-2">
            {score}%
          </div>
          <p className="text-muted-foreground">
            {correct} of {results.length} correct
          </p>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {results.map((r, i) => {
            const q = questions[i];
            return (
              <div
                key={r.questionId}
                className={`p-4 rounded-xl border ${
                  r.isCorrect ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" : "border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  Q{i + 1}. {q.question}
                </p>
                <p className="text-xs text-muted-foreground">
                  Your answer: <span className="font-mono">{r.answer || "(skipped)"}</span>
                </p>
                {q.correctAnswer && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                  {r.isCorrect ? "Correct" : `Correct answer: ${q.correctAnswer}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </motion.div>
    );
  }

  const getQuestionStatus = (idx: number) => {
    const q = questions[idx];
    if (!q) return "unanswered";
    if (answers[q.id]) return "answered";
    if (submittedTheory.has(q.id)) return "answered";
    return "unanswered";
  };

  return (
    <>
      {/* Jump-to-question grid modal */}
      <AnimatePresence>
        {showJumpGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowJumpGrid(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border shadow-xl p-5 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Jump to Question</h3>
                <button
                  onClick={() => setShowJumpGrid(false)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(idx);
                  return (
                    <button
                      key={q.id}
                      onClick={() => goTo(idx, idx > current ? 1 : -1)}
                      className={cn(
                        "w-full aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all active:scale-[0.95]",
                        idx === current && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        status === "answered" && "bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30",
                        status === "unanswered" && idx !== current && "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary",
                        idx === current && status === "answered" && "bg-green-500/30",
                        idx === current && status === "unanswered" && "bg-primary/10 text-primary",
                      )}
                    >
                      {status === "answered" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" /> Answered
                </span>
                <span className="flex items-center gap-1">
                  <Minus className="h-3 w-3" /> Unanswered
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="space-y-4 pb-24 overflow-y-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-xs text-muted-foreground tabular-nums truncate">
                Q{current + 1}/{total}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                {answeredCount}/{total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={false}
                animate={{ width: `${((current + 1) / total) * 100}%` }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </div>
          <button
            onClick={() => setShowJumpGrid(true)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
            aria-label="Jump to question"
          >
            <Grid3X3 className="h-5 w-5 text-muted-foreground" />
          </button>
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(question.id)}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors active:scale-[0.97]"
            >
              {bookmark ? (
                <BookmarkCheck className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-5"
          >
            <div>
              {category === "practical" && (
                <div className="mb-4 p-4 rounded-xl bg-muted/50 border space-y-3">
                  <p className="font-semibold text-lg">{question.title}</p>
                  <p className="text-sm text-muted-foreground">{question.objective}</p>
                  {question.apparatus && question.apparatus.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Apparatus:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {question.apparatus.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-sm">{question.procedure}</p>
                </div>
              )}
              {category === "practical" && question.subQuestions ? (
                <div className="space-y-4">
                  {question.subQuestions.map((sq, i) => {
                    const isSubmitted = submittedTheory.has(sq.id);
                    return (
                      <div key={sq.id} className="space-y-2">
                        <p className="text-sm font-medium">
                          {i + 1}. {sq.text}
                        </p>
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" /> Submitted
                          </span>
                        ) : (
                          <ImageAnswerInput
                            question={{ ...question, id: sq.id, question: sq.text }}
                            questionId={sq.id}
                            subject={subject}
                            year={question.year}
                            onSubmit={(text) => handleSubmitTheory(sq.id, text)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : category === "objective" ? (
                <div className="space-y-3">
                  <p className="text-base font-medium leading-relaxed">{question.question}</p>
                  <div className="space-y-2">
                    {(question.options ?? []).map((opt) => {
                      const isSelected = answers[question.id] === opt.label;
                      const isCorrect = question.correctAnswer?.toUpperCase() === opt.label.toUpperCase();
                      const showFeedback = answers[question.id] !== undefined;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleMCQSelect(opt.label)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all active:scale-[0.97] ${
                            showFeedback && isCorrect
                              ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-medium"
                              : showFeedback && isSelected
                              ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-medium"
                              : isSelected
                              ? "border-primary/50 bg-primary/5 text-primary font-medium"
                              : "border-border bg-card hover:bg-accent/50"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              showFeedback && isCorrect
                                ? "bg-green-600 text-white"
                                : showFeedback && isSelected
                                ? "bg-red-600 text-white"
                                : isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                          {opt.label}
                            </span>
                          <span className="text-pretty break-words">{opt.text}</span>
                          {showFeedback && isCorrect && (
                            <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">Correct</span>
                          )}
                          {showFeedback && isSelected && !isCorrect && (
                            <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400">Wrong</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-base font-medium leading-relaxed">{question.question}</p>
                  {submittedTheory.has(question.id) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <Check className="h-3 w-3" /> Submitted
                    </span>
                  ) : (
                    <ImageAnswerInput
                      question={question}
                      questionId={question.id}
                      subject={subject}
                      year={question.year}
                      onSubmit={(text) => handleSubmitTheory(question.id)}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => goTo(current - 1, -1)}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent disabled:opacity-30 transition-colors active:scale-[0.97]"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {!allAnswered && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {answeredCount}/{total}
              </span>
            )}
            {allAnswered ? (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={handleSubmitAll}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25 transition-colors active:scale-[0.97]"
              >
                <Send className="h-4 w-4" />
                Submit All
              </motion.button>
            ) : (
              <button
                onClick={() => goTo(current + 1, 1)}
                disabled={current >= total - 1}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors active:scale-[0.97]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
