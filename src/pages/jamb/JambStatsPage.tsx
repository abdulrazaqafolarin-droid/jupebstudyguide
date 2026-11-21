import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BarChart3, BookOpen, Bookmark, CalendarDays, Clock3, Brain, Trophy } from "lucide-react";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambReviewProgress } from "@/hooks/useJambReviewProgress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getJambActivityStats, getJambRecentDailyActivity } from "@/lib/jamb-analytics";
import { getJambCbtAnalytics, mapJambCbtHistoryPayload, type JambCbtAttemptSummary } from "@/lib/jamb-cbt-analytics";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import {
  getJambQuestionMetadataByIds,
  getJambSubjectSummaries,
  type JambQuestionMetadata,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import { StatsOverviewCards } from "@/components/StatsOverviewCards";
import { StatsStreakPanel } from "@/components/StatsStreakPanel";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";

export default function JambStatsPage() {
  const { user } = useAuth();
  const { savedAnswers, isReady: answersReady } = useJambPracticeProgress();
  const { progress: reviewProgress, getStats: getRevisionStats, isReady: reviewReady } = useJambReviewProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();
  const questionIds = useMemo(() => Object.keys(savedAnswers), [savedAnswers]);
  const [subjectSummaries, setSubjectSummaries] = useState<JambSubjectSummary[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<JambQuestionMetadata[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cbtHistory, setCbtHistory] = useState<JambCbtAttemptSummary[]>([]);
  const [cbtHistoryOwnerId, setCbtHistoryOwnerId] = useState<string | null>(null);
  const [cbtHistorySupported, setCbtHistorySupported] = useState<boolean | null>(null);
  const [loadingCbtHistory, setLoadingCbtHistory] = useState(true);

  useEffect(() => {
    if (!answersReady) return;
    let active = true;
    setLoadingBank(true);
    Promise.all([
      getJambSubjectSummaries(),
      getJambQuestionMetadataByIds(questionIds),
    ])
      .then(([summaries, metadata]) => {
        if (!active) return;
        setSubjectSummaries(summaries);
        setAnsweredQuestions(metadata);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "JAMB analytics could not be loaded.");
      })
      .finally(() => { if (active) setLoadingBank(false); });
    return () => { active = false; };
  }, [answersReady, questionIds]);

  useEffect(() => {
    if (!answersReady || !user?.id) {
      setCbtHistory([]);
      setCbtHistoryOwnerId(null);
      setCbtHistorySupported(null);
      setLoadingCbtHistory(false);
      return;
    }
    const ownerId = user.id;
    let active = true;
    setCbtHistory([]);
    setCbtHistoryOwnerId(null);
    setCbtHistorySupported(null);
    setLoadingCbtHistory(true);
    supabase.functions.invoke("exam-attempts", {
      body: { action: "history", exam_program_id: "jamb" },
    })
      .then(({ data, error: invokeError }) => {
        if (invokeError) throw invokeError;
        if (!active) return;
        setCbtHistory(mapJambCbtHistoryPayload(data?.history));
        setCbtHistoryOwnerId(ownerId);
        setCbtHistorySupported(true);
      })
      .catch(() => {
        if (!active) return;
        // History is served by the authenticated, owner-filtered JAMB endpoint.
        // Never query service-role tables directly or substitute JUPEB scores.
        setCbtHistory([]);
        setCbtHistoryOwnerId(ownerId);
        setCbtHistorySupported(false);
      })
      .finally(() => { if (active) setLoadingCbtHistory(false); });
    return () => { active = false; };
  }, [answersReady, user?.id]);

  const activity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);
  const revisionStats = getRevisionStats(Object.keys(reviewProgress));
  const cbtHistoryForUser = cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistory : [];
  const cbtHistorySupportedForUser = cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistorySupported : null;
  const cbtHistoryLoadingForUser = loadingCbtHistory || Boolean(user?.id && cbtHistoryOwnerId !== user.id);
  const cbtAnalytics = useMemo(() => getJambCbtAnalytics(cbtHistoryForUser), [cbtHistoryForUser]);
  const dailyActivity = useMemo(() => getJambRecentDailyActivity(savedAnswers), [savedAnswers]);
  const publishedQuestionCount = subjectSummaries.reduce((total, row) => total + row.count, 0);
  const subjectRows = JAMB_SUBJECTS.map((subject) => {
    const total = subjectSummaries.find((row) => row.subject === subject)?.count ?? 0;
    const answered = answeredQuestions.filter((question) => question.subject === subject).length;
    return {
      subject,
      total,
      answered,
      percent: total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0,
    };
  });
  const maxDailyCount = Math.max(1, ...dailyActivity.map((day) => day.count));
  const lastActivity = activity.lastActivityAt
    ? new Date(activity.lastActivityAt).toLocaleString()
    : "No JAMB practice recorded yet";

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader title="Study Stats" backTo="/jamb" backLabel="Back to JAMB workspace" subtitle="Your learning analytics" compact />

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-10">
        {error && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {error} Your local JAMB practice totals remain available where loaded.
          </div>
        )}

        <StatsOverviewCards
          items={[
            { label: "Published questions", value: loadingBank ? "—" : publishedQuestionCount.toLocaleString(), icon: BookOpen, color: "text-blue-500" },
            { label: "Questions practised", value: answersReady ? activity.answerCount.toLocaleString() : "—", icon: BarChart3, color: "text-emerald-500" },
            { label: "Bookmarks", value: bookmarksReady ? bookmarks.length.toLocaleString() : "—", icon: Bookmark, color: "text-violet-500" },
            { label: "Study days", value: answersReady ? activity.totalDaysStudied.toLocaleString() : "—", icon: CalendarDays, color: "text-amber-500" },
          ]}
        />

        <StatsStreakPanel
          currentStreak={activity.currentStreak}
          longestStreak={activity.longestStreak}
          totalDaysStudied={activity.totalDaysStudied}
          questionsAnswered={activity.answerCount}
          hasStudiedToday={activity.hasStudiedToday}
          ready={answersReady}
          footer={<p className="text-xs text-muted-foreground">Last JAMB activity: {answersReady ? lastActivity : "Loading…"}</p>}
        />

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">JAMB revision progress</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary/5 p-4">
              <p className="text-2xl font-bold tabular-nums">{reviewReady ? revisionStats.mastered : "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cards mastered</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-2xl font-bold tabular-nums">{reviewReady ? revisionStats.due : "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Scheduled cards due</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A card is mastered only after an approved answer key is confirmed.</p>
          <Link to="/jamb/study" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open Revision Cards <Brain className="h-3.5 w-3.5" /></Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Questions practised by subject</h2>
          </div>
          <div className="space-y-5">
            {subjectRows.map((row) => {
              const info = JAMB_SUBJECT_INFO[row.subject];
              return (
                <div key={row.subject}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium"><span>{info.icon}</span>{info.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{loadingBank ? "—" : row.answered + " / " + row.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: row.percent + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {publishedQuestionCount === 0 && !loadingBank && (
            <p className="mt-4 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              No JAMB questions have been published yet. Subject progress will populate as reviewed questions are approved and published.
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Recent practice · 7 days</h2>
          </div>
          <div className="grid h-36 grid-cols-7 items-end gap-2">
            {dailyActivity.map((day) => (
              <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <span className="text-[10px] tabular-nums text-muted-foreground">{day.count || ""}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-secondary">
                  <div className="w-full rounded-md bg-primary transition-all" style={{ height: day.count > 0 ? Math.max(8, (day.count / maxDailyCount) * 100) + "%" : "0%" }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Activity counts reflect each question's latest saved practice answer.</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Timed CBT results · JAMB only</h2>
          </div>
          {cbtHistoryLoadingForUser ? (
            <p className="text-sm text-muted-foreground">Loading your completed JAMB attempts…</p>
          ) : cbtHistorySupportedForUser === false ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
              We could not load your JAMB CBT history from the connected backend. Check your connection or study-session access and reopen this page. Your result after each completed CBT remains available on its results screen.
            </p>
          ) : cbtHistoryForUser.length === 0 ? (
            <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">No completed JAMB timed attempts yet. Submit a practice CBT to build your personal score history.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Attempts", value: cbtAnalytics.attemptCount.toLocaleString() },
                  { label: "Scored average", value: cbtAnalytics.averageScore === null ? "—" : cbtAnalytics.averageScore + "%" },
                  { label: "Best score", value: cbtAnalytics.bestScore === null ? "—" : cbtAnalytics.bestScore + "%" },
                  { label: "Ungraded attempts", value: cbtAnalytics.ungradedAttemptCount.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-xl font-bold tabular-nums">{item.value}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-semibold">Recent CBT activity · 7 days</h3>
                <div className="grid h-32 grid-cols-7 items-end gap-2">
                  {cbtAnalytics.weekly.map((day) => (
                    <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground">{day.averageScore === null ? (day.attemptCount || "") : day.averageScore + "%"}</span>
                      <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-secondary">
                        <div className="w-full rounded-md bg-primary" style={{ height: day.attemptCount ? Math.max(8, day.attemptCount / Math.max(1, ...cbtAnalytics.weekly.map((row) => row.attemptCount)) * 100) + "%" : "0%" }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <h3 className="text-sm font-semibold">Latest attempts</h3>
                {cbtHistoryForUser.slice(0, 10).map((attempt) => {
                  const subject = JAMB_SUBJECTS.includes(attempt.subject as (typeof JAMB_SUBJECTS)[number])
                    ? JAMB_SUBJECT_INFO[attempt.subject as (typeof JAMB_SUBJECTS)[number]].label
                    : attempt.subject;
                  const when = attempt.submittedAt ?? attempt.startedAt;
                  return (
                    <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{subject} · {attempt.examYear}</p>
                        <p className="text-[10px] text-muted-foreground">{when ? new Date(when).toLocaleString() : "Date unavailable"} · {attempt.durationMinutes} min · {attempt.status}</p>
                        <p className="text-[10px] text-muted-foreground">{attempt.correct} correct · {attempt.wrong} wrong · {attempt.ungraded} ungraded</p>
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums">{attempt.score === null ? "—" : attempt.score + "%"}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-amber-500/5 p-5"
        >
          <h2 className="mb-2 font-semibold">Score details</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only independently approved answer keys contribute to accuracy. Saved-answer activity and timed CBT results are reported separately.
          </p>
        </motion.section>

        <div className="flex flex-wrap gap-3">
          <Link to="/jamb/past-questions" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Continue practice</Link>
          <Link to="/jamb/cbt/setup" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">Timed CBT</Link>
        </div>
      </main>
    </div>
  );
}
