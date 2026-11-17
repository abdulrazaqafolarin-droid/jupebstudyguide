import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Bot, ChevronLeft, ChevronRight, Loader2, Search, ShieldAlert } from "lucide-react";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO, JAMB_INITIAL_QUESTION_PAGE_SIZE } from "@/lib/jamb-config";
import { getJambQuestionYears, JambSchemaUnavailableError, searchJambQuestions, type JambQuestion } from "@/lib/jamb-question-service";
import type { Subject } from "@/types/question";
import { QuestionMath } from "@/components/QuestionMath";
import { QuestionImage } from "@/components/QuestionImage";
import { Button } from "@/components/ui/button";

export default function JambPastQuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams();
  const routeSubject = routeParams.subject?.toLowerCase();
  const requestedSubject = routeSubject ?? searchParams.get("subject");
  const initialSubject = JAMB_SUBJECTS.includes(requestedSubject as Exclude<Subject, "math">)
    ? requestedSubject as Exclude<Subject, "math">
    : "physics";
  const [subject, setSubject] = useState<Exclude<Subject, "math">>(initialSubject);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);
  const { bookmarks, toggle: toggleJambBookmark, isReady: bookmarksReady } = useJambBookmarks();
  const [feedbacks, setFeedbacks] = useState<Record<string, { gradable: boolean; isCorrect?: boolean; correctOption?: string; explanation?: string; message?: string }>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const { savedAnswers, saveAnswer: savePracticeAnswer } = useJambPracticeProgress();

  useEffect(() => {
    let active = true;
    getJambQuestionYears(subject)
      .then((available) => { if (active) { setYears(available); setYear(null); setOffset(0); } })
      .catch((reason: unknown) => {
        if (!active) return;
        setSchemaUnavailable(reason instanceof JambSchemaUnavailableError);
        setError(reason instanceof Error ? reason.message : "Unable to load years.");
      });
    return () => { active = false; };
  }, [subject]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchJambQuestions({ subject, year, search, offset, limit: JAMB_INITIAL_QUESTION_PAGE_SIZE })
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
  }, [subject, year, search, offset]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("subject", subject);
    if (year) next.set("year", String(year)); else next.delete("year");
    setSearchParams(next, { replace: true });
  }, [subject, year, searchParams, setSearchParams]);

  const toggleBookmark = (id: string) => toggleJambBookmark(id);

  const saveAnswer = async (questionId: string, answer: string) => {
    setSelected((previous) => ({ ...previous, [questionId]: answer }));
    savePracticeAnswer(questionId, answer);
    setChecking((previous) => ({ ...previous, [questionId]: true }));
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("exam-practice", {
        body: { action: "check-answer", exam_program_id: "jamb", question_id: questionId, selected_option: answer },
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
      setFeedbacks((previous) => ({ ...previous, [questionId]: { gradable: false, message: reason instanceof Error ? reason.message : "Answer checking is temporarily unavailable." } }));
    } finally {
      setChecking((previous) => ({ ...previous, [questionId]: false }));
    }
  };

  const pageNumber = Math.floor(offset / JAMB_INITIAL_QUESTION_PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(count / JAMB_INITIAL_QUESTION_PAGE_SIZE));
  const subjectInfo = JAMB_SUBJECT_INFO[subject];
  const empty = !loading && questions.length === 0;
  const bookmarksReadyForUi = bookmarksReady;

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex items-center gap-3">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg border border-border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Rutex Master / JAMB</p><h1 className="text-2xl font-bold">Past questions</h1></div>
          <span className="text-2xl" aria-hidden="true">{subjectInfo.icon}</span>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {JAMB_SUBJECTS.map((item) => (
            <button key={item} onClick={() => { setSubject(item); setYear(null); setSearch(""); setOffset(0); setSelected({}); }}
              aria-pressed={subject === item}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${subject === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent"}`}>
              {JAMB_SUBJECT_INFO[item].icon} {JAMB_SUBJECT_INFO[item].label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Search this subject…" className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <select value={year ?? ""} onChange={(event) => { setYear(event.target.value ? Number(event.target.value) : null); setOffset(0); }} className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
            <option value="">All available years</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {schemaUnavailable && (
          <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
            <div><p className="font-semibold">JAMB database not connected yet</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The JAMB data migration has not been applied to the shared Rutex Supabase project. This page deliberately does not fall back to the JUPEB question bank.</p></div>
          </div>
        )}
        {error && !schemaUnavailable && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">No published {subjectInfo.label} questions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Imported questions appear here after review and publication.</p>
            <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary" to="/jamb">Back to JAMB home <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{count.toLocaleString()} published questions</span><span>Page {pageNumber} of {totalPages}</span></div>
            {questions.map((question) => {
              const bookmarked = bookmarksReadyForUi && bookmarks.includes(question.id);
              const saved = savedAnswers[question.id]?.selected;
              const current = selected[question.id] ?? saved ?? "";
              return (
                <article key={question.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-1">{question.year}</span>
                      <span>{subjectInfo.label}</span>
                      {question.topic && <span>· {question.topic}</span>}
                      {question.sourceQuestionNumber && <span>· Source Q{question.sourceQuestionNumber}</span>}
                    </div>
                    <button onClick={() => toggleBookmark(question.id)} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"} className="rounded-lg p-2 hover:bg-accent">
                      {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="mb-4 text-sm font-medium leading-relaxed"><QuestionMath content={question.question} /></div>
                  {question.imageUrls.map((url) => <QuestionImage key={url} imageUrl={url} alt={`${subjectInfo.label} question illustration`} />)}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <button key={option.label} onClick={() => saveAnswer(question.id, option.label)} aria-pressed={current === option.label}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${current === option.label ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"}`}>
                        <span className="font-bold text-primary">{option.label}.</span><QuestionMath content={option.text} inline />
                      </button>
                    ))}
                  </div>
                  {current && (
                    <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
                      {checking[question.id] ? (
                        <span className="text-muted-foreground">Checking reviewed answer key…</span>
                      ) : feedbacks[question.id]?.gradable ? (
                        <div className={feedbacks[question.id].isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                          <strong>{feedbacks[question.id].isCorrect ? "Correct" : `Not quite. Correct option: ${feedbacks[question.id].correctOption}`}</strong>
                          {feedbacks[question.id].explanation && <p className="mt-1 text-foreground">{feedbacks[question.id].explanation}</p>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Your choice ({current}) is saved. This question is ungraded until its answer key has been verified. {feedbacks[question.id]?.message ?? ""}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Link to={`/jamb/ai?subject=${subject}&questionId=${encodeURIComponent(question.id)}`} className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">
                      <Bot className="h-4 w-4" /> Ask the JAMB tutor
                    </Link>
                  </div>
                </article>
              );
            })}
            <div className="flex items-center justify-between">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - JAMB_INITIAL_QUESTION_PAGE_SIZE))}><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
              <Button variant="outline" disabled={offset + JAMB_INITIAL_QUESTION_PAGE_SIZE >= count} onClick={() => setOffset((value) => value + JAMB_INITIAL_QUESTION_PAGE_SIZE)}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </div>
        )}
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Question-bank answers and explanations are shown only after verification. Your saved choices are private to your Rutex account on this device.</p>
      </div>
    </main>
  );
}
