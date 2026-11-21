import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Award, BarChart3, BookOpen, Brain,
  Flame, Target, Trophy, TrendingUp, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambReviewProgress } from "@/hooks/useJambReviewProgress";
import { supabase } from "@/integrations/supabase/client";
import { getJambActivityStats } from "@/lib/jamb-analytics";
import {
  getJambCbtAnalytics,
  mapJambCbtHistoryPayload,
  type JambCbtAttemptSummary,
} from "@/lib/jamb-cbt-analytics";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import {
  getJambPublishedQuestionMetadata,
  getJambSubjectSummaries,
  type JambQuestionMetadata,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";

interface SubjectPerformance {
  subject: (typeof JAMB_SUBJECTS)[number];
  total: number;
  studied: number;
  mastered: number;
  due: number;
  label: string;
}

function formatScoreDate(value: string) {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JambStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savedAnswers, isReady: answersReady } = useJambPracticeProgress();
  const {
    progress: reviewProgress,
    getStats: getRevisionStats,
    isReady: reviewReady,
  } = useJambReviewProgress();

  const [subjectSummaries, setSubjectSummaries] = useState<JambSubjectSummary[]>([]);
  const [publishedMetadata, setPublishedMetadata] = useState<JambQuestionMetadata[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);
  const [bankError, setBankError] = useState<string | null>(null);
  const [cbtHistory, setCbtHistory] = useState<JambCbtAttemptSummary[]>([]);
  const [cbtHistoryOwnerId, setCbtHistoryOwnerId] = useState<string | null>(null);
  const [cbtHistorySupported, setCbtHistorySupported] = useState<boolean | null>(null);
  const [loadingCbtHistory, setLoadingCbtHistory] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingBank(true);
    Promise.all([
      getJambSubjectSummaries(),
      getJambPublishedQuestionMetadata(),
    ])
      .then(([summaries, metadata]) => {
        if (!active) return;
        setSubjectSummaries(summaries);
        setPublishedMetadata(metadata);
        setBankError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setBankError(reason instanceof Error ? reason.message : "JAMB question statistics could not be loaded.");
      })
      .finally(() => { if (active) setLoadingBank(false); });
    return () => { active = false; };
  }, []);

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
        setCbtHistory([]);
        setCbtHistoryOwnerId(ownerId);
        setCbtHistorySupported(false);
      })
      .finally(() => { if (active) setLoadingCbtHistory(false); });

    return () => { active = false; };
  }, [answersReady, user?.id]);

  const activity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);
  const allQuestionIds = useMemo(
    () => publishedMetadata.map((question) => question.id),
    [publishedMetadata],
  );
  const publishedQuestionCount = subjectSummaries.reduce((total, row) => total + row.count, 0);
  const revisionStats = getRevisionStats(allQuestionIds);
  const studiedQuestionCount = allQuestionIds.filter((id) => Boolean(savedAnswers[id])).length;
  const studiedPercentage = publishedQuestionCount > 0
    ? Math.min(100, Math.round((studiedQuestionCount / publishedQuestionCount) * 100))
    : 0;
  const masteredPercentage = publishedQuestionCount > 0
    ? Math.min(100, Math.round((revisionStats.mastered / publishedQuestionCount) * 100))
    : 0;

  const subjectRows: SubjectPerformance[] = useMemo(() => JAMB_SUBJECTS.map((subject) => {
    const questionIds = publishedMetadata
      .filter((question) => question.subject === subject)
      .map((question) => question.id);
    const revision = getRevisionStats(questionIds);
    return {
      subject,
      total: subjectSummaries.find((row) => row.subject === subject)?.count ?? questionIds.length,
      studied: questionIds.filter((id) => Boolean(savedAnswers[id])).length,
      mastered: revision.mastered,
      due: revision.due,
      label: JAMB_SUBJECT_INFO[subject].label,
    };
  }), [publishedMetadata, subjectSummaries, savedAnswers, reviewProgress, getRevisionStats]);

  const cbtHistoryForUser = cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistory : [];
  const cbtHistorySupportedForUser = cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistorySupported : null;
  const cbtHistoryLoadingForUser = loadingCbtHistory || Boolean(user?.id && cbtHistoryOwnerId !== user.id);
  const cbtAnalytics = useMemo(() => getJambCbtAnalytics(cbtHistoryForUser), [cbtHistoryForUser]);
  const lastActivity = activity.lastActivityAt
    ? new Date(activity.lastActivityAt).toLocaleString()
    : "No JAMB practice recorded yet";
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ x: -3 }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-1 -ml-1 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="font-semibold text-sm">Study Stats</h1>
            <p className="text-[10px] text-muted-foreground">Your JAMB learning analytics</p>
          </div>
        </div>
      </motion.header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {bankError && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {bankError} Your saved JAMB activity remains available where loaded.
          </div>
        )}

        {/* Overview cards: same four-card arrangement and hierarchy as JUPEB. */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Questions", value: loadingBank ? "—" : publishedQuestionCount.toLocaleString(), icon: BookOpen, color: "text-blue-500" },
            { label: "Studied", value: answersReady && !loadingBank ? studiedPercentage + "%" : "—", sub: answersReady && !loadingBank ? studiedQuestionCount + "/" + publishedQuestionCount : undefined, icon: Brain, color: "text-emerald-500" },
            { label: "Mastered", value: reviewReady && !loadingBank ? masteredPercentage + "%" : "—", sub: reviewReady && !loadingBank ? revisionStats.mastered + "/" + publishedQuestionCount : undefined, icon: Target, color: "text-violet-500" },
            { label: "Due Today", value: reviewReady && !loadingBank ? revisionStats.due.toLocaleString() : "—", icon: Zap, color: revisionStats.due > 0 ? "text-amber-500" : "text-muted-foreground" },
          ].map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-card rounded-2xl border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <card.icon className={"w-4 h-4 " + card.color} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              {card.sub && <p className="text-[10px] text-muted-foreground -mt-1">{card.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> Streak
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" /> {activity.totalDaysStudied} total days
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500 tabular-nums">{activity.currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">Current streak</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{activity.longestStreak}</p>
              <p className="text-[10px] text-muted-foreground">Best streak</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{answersReady ? activity.answerCount : "—"}</p>
              <p className="text-[10px] text-muted-foreground">Questions answered</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Today:</span>
            {activity.hasStudiedToday ? (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Studied
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted" /> Not studied yet
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Last JAMB activity: {answersReady ? lastActivity : "Loading…"}</p>
        </motion.div>

        {/* JAMB CBT replaces the JUPEB XP score chart; no JUPEB score feed is reused. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Timed CBT performance
            </h2>
            <span className="text-xl font-bold text-amber-500 tabular-nums">
              {cbtHistoryLoadingForUser ? "—" : cbtAnalytics.averageScore === null ? "—" : cbtAnalytics.averageScore + "%"}
            </span>
          </div>
          {cbtHistoryLoadingForUser ? (
            <p className="text-xs text-muted-foreground">Loading your completed JAMB attempts…</p>
          ) : cbtHistorySupportedForUser === false ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
              We could not load your JAMB CBT history. Check your connection or study-session access and reopen this page. No JUPEB scores are substituted.
            </p>
          ) : cbtHistoryForUser.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Complete a JAMB timed practice session to start building your score history.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Attempts", value: cbtAnalytics.attemptCount.toLocaleString() },
                  { label: "Best score", value: cbtAnalytics.bestScore === null ? "—" : cbtAnalytics.bestScore + "%" },
                  { label: "Ungraded", value: cbtAnalytics.ungradedAttemptCount.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-lg font-bold tabular-nums">{item.value}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cbtAnalytics.weekly}>
                    <defs>
                      <linearGradient id="jambCbtScoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={formatScoreDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      labelFormatter={formatScoreDate}
                      formatter={(value: number | null) => [value === null ? "Ungraded" : value + "%", "Average score"]}
                    />
                    <Area type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" fill="url(#jambCbtScoreGradient)" strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Latest attempts</h3>
                {cbtHistoryForUser.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {JAMB_SUBJECT_INFO[JAMB_SUBJECTS.includes(attempt.subject as (typeof JAMB_SUBJECTS)[number])
                          ? attempt.subject as (typeof JAMB_SUBJECTS)[number]
                          : "physics"].label} · {attempt.examYear}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(attempt.submittedAt ?? attempt.startedAt) ? new Date(attempt.submittedAt ?? attempt.startedAt).toLocaleString() : "Date unavailable"}
                        {" · "}{attempt.durationMinutes} min
                      </p>
                      <p className="text-[10px] text-muted-foreground">{attempt.correct} correct · {attempt.wrong} wrong · {attempt.ungraded} ungraded</p>
                    </div>
                    <p className="shrink-0 text-lg font-bold tabular-nums">{attempt.score === null ? "—" : attempt.score + "%"}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Performance by subject */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Performance by Subject
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subjectRows.map((row) => ({ label: row.label, studied: row.studied, mastered: row.mastered }))}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="studied" name="Studied" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" maxBarSize={32} />
                <Bar dataKey="mastered" name="Mastered" radius={[4, 4, 0, 0]} fill="hsl(var(--accent))" maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Studied</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent" /> Mastered</span>
          </div>
        </motion.div>

        {/* Subject detail cards */}
        <div className="grid grid-cols-2 gap-3">
          {subjectRows.map((row, index) => {
            const info = JAMB_SUBJECT_INFO[row.subject];
            const percent = row.total > 0 ? Math.round((row.mastered / row.total) * 100) : 0;
            return (
              <motion.div
                key={row.subject}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.17 + index * 0.03 }}
                className="bg-card rounded-2xl border p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="text-sm font-semibold">{info.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.studied}/{row.total} studied</span>
                  <span className="font-medium text-foreground">{percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: percent + "%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{row.mastered} mastered · {row.due} due</p>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3">
          <Award className="w-4 h-4 mt-0.5 text-primary" />
          <div>
            <p className="text-xs font-semibold">About your JAMB stats</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Practice activity, spaced-repetition mastery and timed CBT scores are measured separately. Only server-approved answer keys can grade a question or contribute to a CBT score.
            </p>
            {publishedQuestionCount === 0 && !loadingBank && (
              <p className="mt-1 text-[11px] text-muted-foreground">The JAMB bank has no published questions yet. Statistics will fill in as reviewed questions are approved and published.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/jamb/past-questions" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Continue practice
          </Link>
          <Link to="/jamb/cbt/setup" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            Timed CBT
          </Link>
        </div>
      </main>
    </div>
  );
}
