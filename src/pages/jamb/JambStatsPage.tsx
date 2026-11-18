import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, BarChart3, BookOpen, Bookmark, CalendarDays, Clock3, Flame } from "lucide-react";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { getJambActivityStats, getJambRecentDailyActivity } from "@/lib/jamb-analytics";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import {
  getJambQuestionMetadataByIds,
  getJambSubjectSummaries,
  type JambQuestionMetadata,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import StreakDisplay from "@/components/StreakDisplay";

export default function JambStatsPage() {
  const { savedAnswers, isReady: answersReady } = useJambPracticeProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();
  const questionIds = useMemo(() => Object.keys(savedAnswers), [savedAnswers]);
  const [subjectSummaries, setSubjectSummaries] = useState<JambSubjectSummary[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<JambQuestionMetadata[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const activity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">JAMB Study Stats</h1>
            <p className="text-[10px] text-muted-foreground">Your JAMB practice activity only</p>
          </div>
          <Link to="/jamb/achievements" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Award className="h-4 w-4" /> Achievements
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-10">
        {error && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            {error} Your local JAMB practice totals remain available where loaded.
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Published questions", value: loadingBank ? "—" : publishedQuestionCount.toLocaleString(), icon: BookOpen },
            { label: "Questions practised", value: answersReady ? activity.answerCount.toLocaleString() : "—", icon: BarChart3 },
            { label: "Bookmarks", value: bookmarksReady ? bookmarks.length.toLocaleString() : "—", icon: Bookmark },
            { label: "Study days", value: answersReady ? activity.totalDaysStudied.toLocaleString() : "—", icon: CalendarDays },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <item.icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold">JAMB consistency</h2>
          </div>
          <StreakDisplay
            currentStreak={answersReady ? activity.currentStreak : 0}
            longestStreak={answersReady ? activity.longestStreak : 0}
            totalDaysStudied={answersReady ? activity.totalDaysStudied : 0}
            hasStudiedToday={answersReady && activity.hasStudiedToday}
          />
          <p className="mt-4 text-xs text-muted-foreground">Last JAMB activity: {answersReady ? lastActivity : "Loading…"}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
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
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
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
        </section>

        <section className="rounded-2xl border border-border bg-amber-500/5 p-5">
          <h2 className="mb-2 font-semibold">How JAMB results are reported</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Saved-answer activity and server-scored JAMB CBT results are reported separately. A practice question is not marked correct or incorrect here unless its answer key has been independently reviewed and approved. JAMB activity and CBT scores come from JAMB-only records; JUPEB question totals, revision progress and score history are never substituted.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/jamb/past-questions" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Continue practice</Link>
          <Link to="/jamb/cbt/setup" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">Timed CBT</Link>
        </div>
      </main>
    </div>
  );
}
