import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, BarChart3, BookOpen, Brain,
  Target, Trophy, Zap,
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
import { JAMB_SUBJECT_INFO, JAMB_QUESTION_BANK_SUBJECTS } from "@/lib/jamb-config";
import { StatsOverviewCards } from "@/components/StatsOverviewCards";
import { StatsStreakPanel } from "@/components/StatsStreakPanel";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import {
  getJambPublishedQuestionMetadata,
  getJambSubjectSummaries,
  type JambQuestionMetadata,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";

interface SubjectPerformance {
  subject: (typeof JAMB_QUESTION_BANK_SUBJECTS)[number];
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

  const subjectRows: SubjectPerformance[] = useMemo(() => JAMB_QUESTION_BANK_SUBJECTS.map((subject) => {
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

  const cbtHistoryForUser = useMemo(
    () => cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistory : [],
    [cbtHistoryOwnerId, cbtHistory, user?.id],
  );
  const cbtHistorySupportedForUser = cbtHistoryOwnerId === (user?.id ?? null) ? cbtHistorySupported : null;
  const cbtHistoryLoadingForUser = loadingCbtHistory || Boolean(user?.id && cbtHistoryOwnerId !== user.id);
  const cbtAnalytics = useMemo(() => getJambCbtAnalytics(cbtHistoryForUser), [cbtHistoryForUser]);
  const weeklyCbtScores = useMemo(() => {
    const today = new Date();
    const currentWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const weeks: Array<{ week: string; averageScore: number | null; count: number }> = [];
    for (let index = 11; index >= 0; index -= 1) {
      const start = new Date(currentWeek);
      start.setDate(currentWeek.getDate() - index * 7);
      const week = start.getFullYear() + "-" +
        String(start.getMonth() + 1).padStart(2, "0") + "-" +
        String(start.getDate()).padStart(2, "0");
      const scores = cbtHistoryForUser.flatMap((attempt) => {
        const timestamp = attempt.submittedAt ?? attempt.startedAt;
        const date = new Date(timestamp);
        if (!Number.isFinite(date.getTime())) return [];
        const attemptWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        attemptWeek.setDate(attemptWeek.getDate() - attemptWeek.getDay());
        const attemptKey = attemptWeek.getFullYear() + "-" +
          String(attemptWeek.getMonth() + 1).padStart(2, "0") + "-" +
          String(attemptWeek.getDate()).padStart(2, "0");
        return attemptKey === week && typeof attempt.score === "number" &&
          Number.isFinite(attempt.score) && attempt.score >= 0 && attempt.score <= 100
          ? [attempt.score]
          : [];
      });
      weeks.push({
        week,
        averageScore: scores.length
          ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
          : null,
        count: scores.length,
      });
    }
    return weeks;
  }, [cbtHistoryForUser]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <WorkspacePageHeader title="Study Stats" onBack={() => navigate(-1)} backLabel="Go back" subtitle="Your learning analytics" compact />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {bankError && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {bankError} Your saved JAMB activity remains available where loaded.
          </div>
        )}

        <StatsOverviewCards
          items={[
            { label: "Total Questions", value: loadingBank ? "—" : publishedQuestionCount.toLocaleString(), icon: BookOpen, color: "text-blue-500" },
            { label: "Studied", value: answersReady && !loadingBank ? studiedPercentage + "%" : "—", sub: answersReady && !loadingBank ? studiedQuestionCount + "/" + publishedQuestionCount : undefined, icon: Brain, color: "text-emerald-500" },
            { label: "Mastered", value: reviewReady && !loadingBank ? masteredPercentage + "%" : "—", sub: reviewReady && !loadingBank ? revisionStats.mastered + "/" + publishedQuestionCount : undefined, icon: Target, color: "text-violet-500" },
            { label: "Due Today", value: reviewReady && !loadingBank ? revisionStats.due.toLocaleString() : "—", icon: Zap, color: revisionStats.due > 0 ? "text-amber-500" : "text-muted-foreground" },
          ]}
        />

        <StatsStreakPanel
          currentStreak={activity.currentStreak}
          longestStreak={activity.longestStreak}
          totalDaysStudied={activity.totalDaysStudied}
          questionsAnswered={activity.answerCount}
          hasStudiedToday={activity.hasStudiedToday}
          ready={answersReady}
        />

        {/* Same score-card layout as JUPEB, using only this user's JAMB CBT results. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Average CBT Score
            </h2>
            <span className="text-2xl font-bold text-amber-500 tabular-nums">
              {cbtHistoryLoadingForUser ? "—" : cbtAnalytics.averageScore === null ? "—" : cbtAnalytics.averageScore + "%"}
            </span>
          </div>
          {cbtHistoryLoadingForUser ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading your JAMB score history…</p>
          ) : cbtHistorySupportedForUser === false ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Your JAMB CBT score history could not be loaded. Check your connection and reopen this page.
            </p>
          ) : cbtAnalytics.scoredAttemptCount > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyCbtScores}>
                  <defs>
                    <linearGradient id="jambCbtScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tickFormatter={formatScoreDate} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    labelFormatter={formatScoreDate}
                    formatter={(value: number | null) => [value === null ? "No graded attempt" : value + "%", "Average score"]}
                  />
                  <Area type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" fill="url(#jambCbtScoreGradient)" strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Complete a JAMB timed practice session to start building your score history.
            </p>
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

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Only server-approved JAMB answer keys are graded.
          {publishedQuestionCount === 0 && !loadingBank ? " No questions are published yet." : ""}
        </p>
      </main>
    </div>
  );
}
