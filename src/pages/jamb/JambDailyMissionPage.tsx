import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  Clock3, Loader2, RefreshCw, ShieldCheck, Target, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionMath } from "@/components/QuestionMath";
import { QuestionImage } from "@/components/QuestionImage";
import { useJambDailyMissions } from "@/hooks/useJambDailyMissions";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { supabase } from "@/integrations/supabase/client";
import {
  getJambMissionQuestionOffset,
  getJambMissionSummary,
  jambLocalDateKey,
  createJambDailyMission,
  selectJambMissionAnswer,
  applyJambMissionAnswerCheck,
  type JambDailyMissionRecord,
  type JambMissionSubject,
} from "@/lib/jamb-daily-mission";
import {
  getJambSubjectSummaries,
  getJambPublishedQuestionById,
  searchJambQuestions,
  type JambQuestion,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function accuracyLabel(mission: JambDailyMissionRecord): string {
  const summary = getJambMissionSummary(mission);
  if (summary.accuracy === null) return mission.status === "completed" ? "No score" : "Not graded yet";
  return `${summary.accuracy}% · ${summary.gradableQuestions} graded`;
}

export default function JambDailyMissionPage() {
  const navigate = useNavigate();
  const { missionId } = useParams<{ missionId?: string }>();
  const { history, ready, remoteSupported, createMission, updateMission } = useJambDailyMissions();
  const { bookmarks, toggle: toggleBookmark, isReady: bookmarksReady } = useJambBookmarks();
  const { saveAnswer: savePracticeAnswer } = useJambPracticeProgress();
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);
  const [startingSubject, setStartingSubject] = useState<JambMissionSubject | null>(null);
  const [questions, setQuestions] = useState<JambQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const requestSequence = useRef<Record<string, number>>({});

  const today = jambLocalDateKey();
  const todayMissions = useMemo(
    () => history.filter((mission) => mission.localDate === today)
      .sort((a, b) => a.subject.localeCompare(b.subject)),
    [history, today],
  );
  const activeMission = useMemo(() => {
    if (missionId) return history.find((mission) => mission.id === missionId) ?? null;
    return todayMissions.find((mission) => mission.status === "in_progress") ?? todayMissions[0] ?? null;
  }, [history, missionId, todayMissions]);
  const activeMissionId = activeMission?.id ?? null;
  const questionIdsKey = activeMission?.questionIds.join("|") ?? "";

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (active) setPageError(reason instanceof Error ? reason.message : "JAMB question coverage could not be loaded.");
      })
      .finally(() => { if (active) setLoadingBank(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!activeMissionId || !questionIdsKey) {
      setQuestions([]);
      setLoadingQuestions(false);
      return;
    }
    let active = true;
    setLoadingQuestions(true);
    const ids = questionIdsKey.split("|").filter(Boolean);
    Promise.all(ids.map((id) => getJambPublishedQuestionById(id)))
      .then((rows) => {
        if (active) setQuestions(rows.filter((question): question is JambQuestion => Boolean(question)));
      })
      .catch((reason: unknown) => {
        if (active) setPageError(reason instanceof Error ? reason.message : "This saved JAMB mission could not be restored.");
      })
      .finally(() => { if (active) setLoadingQuestions(false); });
    return () => { active = false; };
  }, [activeMissionId, questionIdsKey]);

  const startMission = async (subject: JambMissionSubject) => {
    const existing = history.find((mission) => mission.localDate === today && mission.subject === subject);
    if (existing) {
      navigate(`/jamb/daily-mission/${existing.id}`);
      return;
    }

    const coverage = summaries.find((row) => row.subject === subject);
    const count = coverage?.count ?? 0;
    const pageSize = Math.min(10, count);
    if (pageSize < 3) {
      setPageError(`A ${JAMB_SUBJECT_INFO[subject].label} mission needs at least three reviewed and published JAMB questions. This subject currently has ${count}.`);
      return;
    }

    setStartingSubject(subject);
    setPageError(null);
    try {
      const offset = getJambMissionQuestionOffset(today, subject, count, pageSize);
      const result = await searchJambQuestions({ subject, offset, limit: pageSize });
      if (result.questions.length < 3) {
        setPageError("There are not enough published questions available to create this mission yet.");
        return;
      }
      const candidate = createJambDailyMission(today, subject, result.questions.map((question) => question.id));
      if (!candidate) {
        setPageError("The daily mission could not be created from this question set.");
        return;
      }
      const saved = await createMission(candidate);
      navigate(`/jamb/daily-mission/${saved.id}`);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not prepare today's JAMB mission.");
    } finally {
      setStartingSubject(null);
    }
  };

  const checkAnswer = async (mission: JambDailyMissionRecord, questionId: string, option: string) => {
    const requestKey = `${mission.id}:${questionId}`;
    const sequence = (requestSequence.current[requestKey] ?? 0) + 1;
    requestSequence.current[requestKey] = sequence;
    updateMission(mission.id, (current) => selectJambMissionAnswer(current, questionId, option));
    savePracticeAnswer(questionId, option);
    setChecking((previous) => ({ ...previous, [questionId]: true }));
    setAnswerErrors((previous) => ({ ...previous, [questionId]: "" }));

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
      if (requestSequence.current[requestKey] !== sequence) return;
      updateMission(mission.id, (current) => applyJambMissionAnswerCheck(current, questionId, {
        gradable: data?.gradable === true,
        isCorrect: data?.gradable === true ? data.is_correct === true : undefined,
      }));
      if (data?.gradable !== true && data?.message) {
        setAnswerErrors((previous) => ({ ...previous, [questionId]: String(data.message) }));
      }
    } catch (reason) {
      if (requestSequence.current[requestKey] !== sequence) return;
      setAnswerErrors((previous) => ({
        ...previous,
        [questionId]: reason instanceof Error
          ? reason.message
          : "Answer checking is unavailable. Your selection is saved; retry the check when connected.",
      }));
    } finally {
      if (requestSequence.current[requestKey] === sequence) {
        setChecking((previous) => ({ ...previous, [questionId]: false }));
      }
    }
  };

  const activeSummary = activeMission ? getJambMissionSummary(activeMission) : null;
  const historyRows = [...history]
    .sort((a, b) => b.localDate.localeCompare(a.localDate) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">JAMB Daily Mission</h1>
            <p className="text-[10px] text-muted-foreground">Practice-only · JAMB activity and history</p>
          </div>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-12">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">Build a daily practice habit</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Choose a subject and complete a short set from the reviewed JAMB question bank. Your answers and mission history are separate from JUPEB.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Answers checked by the JAMB service</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" /> Up to 10 questions</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Syllabus-led lessons are not enabled until the applicable official JAMB syllabus is verified. A question is included in accuracy only when the JAMB answer-check service confirms it is gradable.
          </p>
        </section>

        {!remoteSupported && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            Cloud mission history is not enabled on the connected backend yet. This device still saves your JAMB missions under your signed-in account; cloud sync will activate after the included database migration is released.
          </div>
        )}

        {pageError && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {pageError}
          </div>
        )}

        {!activeMission && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Choose today's subject</h2>
              <span className="text-xs text-muted-foreground">{today}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {JAMB_SUBJECTS.map((subject) => {
                const info = JAMB_SUBJECT_INFO[subject];
                const count = summaries.find((row) => row.subject === subject)?.count ?? 0;
                const existing = todayMissions.find((mission) => mission.subject === subject);
                const disabled = loadingBank || count < 3 || Boolean(startingSubject);
                return (
                  <div key={subject} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{info.label}</h3>
                        <p className="text-xs text-muted-foreground">{loadingBank ? "Loading…" : `${count.toLocaleString()} published questions`}</p>
                      </div>
                    </div>
                    {existing ? (
                      <Button className="mt-4 w-full" variant="outline" onClick={() => navigate(`/jamb/daily-mission/${existing.id}`)}>
                        Resume / review
                      </Button>
                    ) : (
                      <Button className="mt-4 w-full" disabled={disabled} onClick={() => void startMission(subject)}>
                        {startingSubject === subject ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…</> : count < 3 && !loadingBank ? "Awaiting reviewed questions" : "Start mission"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {!loadingBank && summaries.every((row) => row.count === 0) && (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                The mission workflow is ready, but no JAMB questions have been approved and published yet. Source candidates are not used directly. Once reviewed questions are published, the subject missions will become available automatically.
              </div>
            )}
          </section>
        )}

        {activeMission && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{JAMB_SUBJECT_INFO[activeMission.subject].label}</span>
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{formatDate(activeMission.localDate)}</span>
                <span className={activeMission.status === "completed" ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600" : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"}>
                  {activeMission.status === "completed" ? "Completed" : "In progress"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Today's practice set</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{activeSummary?.checkedQuestions ?? 0} of {activeSummary?.totalQuestions ?? activeMission.questionIds.length} answer checks completed</p>
                </div>
                {activeSummary?.accuracy !== null && activeSummary?.accuracy !== undefined && (
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums">{activeSummary.accuracy}%</p>
                    <p className="text-[10px] text-muted-foreground">of {activeSummary.gradableQuestions} gradable</p>
                  </div>
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${activeSummary ? (activeSummary.checkedQuestions / Math.max(1, activeSummary.totalQuestions)) * 100 : 0}%` }} />
              </div>
              {activeMission.status === "completed" && activeSummary?.accuracy === null && (
                <p className="mt-3 text-xs text-muted-foreground">This mission is complete, but no accuracy score is shown because the checked questions did not have approved answer keys.</p>
              )}
            </div>

            {loadingQuestions ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Restoring mission questions…</div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">The saved question set is no longer available in the published JAMB bank. Your mission record is retained; return to the hub to view other missions.</div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const answer = activeMission.answers[question.id];
                  const canChange = activeMission.status !== "completed" || (answer?.checked && !answer.gradable);
                  return (
                    <article key={question.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-muted-foreground">Question {index + 1} of {questions.length} · {question.year}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!bookmarksReady}
                            onClick={() => void toggleBookmark(question.id)}
                            aria-label={bookmarks.includes(question.id) ? "Remove bookmark" : "Bookmark question"}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:opacity-40"
                          >
                            {bookmarks.includes(question.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                          </button>
                          {answer?.checked && answer.gradable && (
                            <span className={answer.isCorrect ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600" : "rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive"}>
                              {answer.isCorrect ? "Correct" : "Review"}
                            </span>
                          )}
                          {answer?.checked && !answer.gradable && (
                            <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">Not graded</span>
                          )}
                        </div>
                      </div>
                      <div className="mb-4 text-sm leading-relaxed"><QuestionMath content={question.question} /></div>
                      {question.imageUrls.map((url) => <QuestionImage key={url} imageUrl={url} alt={JAMB_SUBJECT_INFO[question.subject].label + " question illustration"} />)}
                      <div className="space-y-2">
                        {question.options.map((option) => {
                          const selected = answer?.selectedOption === option.label;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              disabled={!canChange || Boolean(checking[question.id])}
                              onClick={() => void checkAnswer(activeMission, question.id, option.label)}
                              aria-pressed={selected}
                              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:cursor-default ${selected ? "border-primary/50 bg-primary/5" : "border-border hover:bg-accent/50"}`}
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold">{option.label}</span>
                              <span className="pt-1"><QuestionMath inline content={option.text} /></span>
                              {selected && answer?.checked && answer.gradable && (
                                <CheckCircle2 className={`ml-auto mt-1 h-4 w-4 shrink-0 ${answer.isCorrect ? "text-emerald-600" : "text-destructive"}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {checking[question.id] && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking with the JAMB answer service…</p>}
                      {answerErrors[question.id] && <p role="alert" className="mt-3 text-xs text-amber-600">{answerErrors[question.id]}</p>}
                      {answer && !answer.checked && !checking[question.id] && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5" /> Choose an option to save it and request a secure answer check.</p>
                      )}
                      {answer?.checked && !answer.gradable && (
                        <p className="mt-3 text-xs text-muted-foreground">This answer is saved, but it is excluded from accuracy because an approved key is not available.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/jamb/daily-mission")}>Mission hub & history</Button>
              <Button variant="outline" onClick={() => navigate("/jamb/past-questions")}>Browse past questions</Button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Mission history</h2>
            <span className="text-xs text-muted-foreground">{history.length} saved</span>
          </div>
          {historyRows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Your completed and in-progress JAMB daily practice sessions will appear here.</div>
          ) : (
            <div className="space-y-2">
              {historyRows.map((mission) => {
                const summary = getJambMissionSummary(mission);
                const selected = mission.id === activeMissionId;
                return (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => navigate(`/jamb/daily-mission/${mission.id}`)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-accent/40"}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">{JAMB_SUBJECT_INFO[mission.subject].icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{JAMB_SUBJECT_INFO[mission.subject].label} · {formatDate(mission.localDate)}</span>
                      <span className="block text-xs text-muted-foreground">{summary.checkedQuestions}/{summary.totalQuestions} checked · {mission.status === "completed" ? "Completed" : "In progress"}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">{accuracyLabel(mission)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!ready && <p className="text-center text-xs text-muted-foreground">Restoring your saved mission history…</p>}
        <p className="text-center text-[10px] text-muted-foreground">
          JAMB missions are stored separately from JUPEB. <Trophy className="inline h-3 w-3" /> Mission completion is a Rutex study activity, not an official JAMB result.
        </p>
      </main>
    </div>
  );
}
