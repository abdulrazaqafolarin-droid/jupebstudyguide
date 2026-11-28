import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";
import { Link, useNavigate } from "react-router-dom";
import { motion, type Variants, type Transition } from "framer-motion";
import {
  ArrowRight, BookOpen, Brain, Bookmark, CalendarDays, Clock3,
  CheckCircle2, Flame, GraduationCap, Library, ShieldAlert, ShieldCheck, Sparkles, Target, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkspaceHomeHero from "@/components/WorkspaceHomeHero";
import { DashboardProgressPanel } from "@/components/DashboardProgressPanel";
import StreakDisplay from "@/components/StreakDisplay";
import { SubjectCard } from "@/components/SubjectCard";
import AchievementsPanel from "@/components/AchievementsPanel";
import { LeaderboardPanelFrame } from "@/components/LeaderboardPanelFrame";
import type { Achievement, AchievementStats } from "@/hooks/useAchievements";
import { getJambAchievementProgress, getJambActivityStats as getJambAchievementActivity } from "@/lib/jamb-analytics";
import type { JambAchievementMetrics } from "@/lib/jamb-analytics";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambReviewProgress } from "@/hooks/useJambReviewProgress";
import { useJambDailyMissions } from "@/hooks/useJambDailyMissions";
import { JambDailyMissionCard } from "@/components/jamb/JambDailyMissionCard";
import { useJamb30DaySessions } from "@/hooks/useJamb30DaySessions";
import {
  JAMB_SUBJECT_INFO, JAMB_QUESTION_BANK_SUBJECTS, JAMB_TARGET_EXAM_YEAR,
} from "@/lib/jamb-config";
import {
  getJambQuestionMetadataByIds,
  getJambSubjectSummaries, JambSchemaUnavailableError,
  type JambQuestionMetadata,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";
import { getJambReviewStats } from "@/lib/jamb-review";
import { fetchOnboardingStatus, getCachedOnboardingStatus } from "@/lib/onboardingStatus";
import rutexLogo from "@/assets/rutex-logo.jpg";

const springBounce: Transition = { type: "spring", stiffness: 300, damping: 12, mass: 0.8 };
const fastSpring: Transition = { type: "spring", stiffness: 400, damping: 15, mass: 0.6 };
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: springBounce },
};

function getJambActivityStats(savedAnswers: Record<string, { selected: string; savedAt: number }>) {
  const toKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const days = new Set(
    Object.values(savedAnswers)
      .filter((answer) => Number.isFinite(answer.savedAt) && answer.savedAt > 0)
      .map((answer) => toKey(new Date(answer.savedAt))),
  );
  const today = new Date();
  const todayKey = toKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toKey(yesterday);

  let currentStreak = 0;
  if (days.has(todayKey) || days.has(yesterdayKey)) {
    const cursor = new Date(days.has(todayKey) ? today : yesterday);
    while (days.has(toKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const sorted = [...days].sort();
  let run = 0;
  let longestStreak = 0;
  let previousDay: number | null = null;
  for (const key of sorted) {
    const [year, month, day] = key.split("-").map(Number);
    const currentDay = Date.UTC(year, month - 1, day);
    run = previousDay !== null && currentDay - previousDay === 86_400_000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previousDay = currentDay;
  }

  return {
    currentStreak,
    longestStreak,
    totalDaysStudied: days.size,
    hasStudiedToday: days.has(todayKey),
  };
}

type JambAchievementProgress = ReturnType<typeof getJambAchievementProgress>[number];

function toJambPanelAchievement(item: JambAchievementProgress): Achievement {
  return {
    id: item.id,
    name: item.label,
    description: item.description,
    icon: item.category === "Consistency" ? "🔥" : item.category === "Organisation" ? "🔖" : "📘",
    rarity: "common",
    condition: () => item.unlocked,
    getProgress: () => ({ current: item.current, max: item.target }),
  };
}

function JambMilestonesPanel({ metrics, ready }: { metrics: JambAchievementMetrics; ready: boolean }) {
  const progress = getJambAchievementProgress(metrics);
  const stats: AchievementStats = {
    totalQuestionsAnswered: metrics.answerCount,
    totalCorrect: 0,
    currentStreak: metrics.currentStreak,
    longestStreak: metrics.longestStreak,
    totalDaysStudied: metrics.totalDaysStudied,
    questionsLearned: 0,
    subjectsStudied: 0,
  };
  const unlocked = ready ? progress.filter((item) => item.unlocked).map(toJambPanelAchievement) : [];
  const locked = ready ? progress.filter((item) => !item.unlocked).map(toJambPanelAchievement) : [];

  return (
    <AchievementsPanel
      title="JAMB Achievements"
      linkTo="/jamb/achievements"
      unlockedAchievements={unlocked}
      lockedAchievements={locked}
      totalCount={progress.length}
      stats={stats}
      loading={!ready}
    />
  );
}

export default function JambHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions: jambStudySessions } = useJamb30DaySessions();
  const [programmeOnboarding, setProgrammeOnboarding] = useState<{ completedAt: string | null; finalized: boolean } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useUserStorage<boolean>("onboarding-nudge-dismissed:jamb", false);
  const showSetupNudge = !nudgeDismissed && Boolean(programmeOnboarding?.completedAt) && !programmeOnboarding?.finalized;

  useEffect(() => {
    if (!user) { setProgrammeOnboarding(null); return; }
    let cancelled = false;
    const cached = getCachedOnboardingStatus(user.id, "jamb");
    if (cached?.loaded) setProgrammeOnboarding({ completedAt: cached.completedAt, finalized: cached.finalized });
    fetchOnboardingStatus(user.id, "jamb")
      .then((status) => {
        if (!cancelled) setProgrammeOnboarding({ completedAt: status.completedAt, finalized: status.finalized });
      })
      .catch((reason) => {
        if (!cancelled) console.error("[JAMB onboarding] dashboard reminder check failed:", reason);
      });
    return () => { cancelled = true; };
  }, [user?.id]);
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedAnswers, isReady: progressReady } = useJambPracticeProgress();
  const { progress: reviewProgress, isReady: reviewProgressReady } = useJambReviewProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();
  const reviewQuestionIds = useMemo(
    () => Object.keys(reviewProgress).sort(),
    [reviewProgress],
  );
  const [reviewQuestionMetadata, setReviewQuestionMetadata] = useState<JambQuestionMetadata[]>([]);
  const [reviewMetadataReady, setReviewMetadataReady] = useState(false);
  const [reviewMetadataError, setReviewMetadataError] = useState(false);
  const { history: dailyMissionHistory, ready: missionHistoryReady } = useJambDailyMissions();
  const achievementMetrics = useMemo<JambAchievementMetrics>(() => ({
    ...getJambAchievementActivity(savedAnswers),
    bookmarkCount: bookmarks.length,
    completedMissionCount: dailyMissionHistory.filter((mission) => mission.status === "completed").length,
  }), [savedAnswers, bookmarks, dailyMissionHistory]);
  const achievementsReady = progressReady && bookmarksReady && missionHistoryReady;


  useEffect(() => {
    if (!reviewProgressReady) return;
    let active = true;
    setReviewMetadataReady(false);
    setReviewMetadataError(false);
    getJambQuestionMetadataByIds(reviewQuestionIds)
      .then((rows) => {
        if (active) setReviewQuestionMetadata(rows);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        console.warn("JAMB subject-card progress could not be restored:", reason);
        setReviewQuestionMetadata([]);
        setReviewMetadataError(true);
      })
      .finally(() => {
        if (active) setReviewMetadataReady(true);
      });
    return () => { active = false; };
  }, [reviewProgressReady, reviewQuestionIds]);

  const subjectReviewStats = useMemo(
    () => JAMB_QUESTION_BANK_SUBJECTS.map((subject) => {
      const questionIds = reviewQuestionMetadata
        .filter((question) => question.subject === subject)
        .map((question) => question.id);
      const stats = getJambReviewStats(questionIds, reviewProgress);
      return {
        subject,
        studiedCount: stats.studied,
        learnedCount: stats.mastered,
      };
    }),
    [reviewQuestionMetadata, reviewProgress],
  );

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof JambSchemaUnavailableError
          ? "The JAMB question bank is unavailable."
          : reason instanceof Error ? reason.message : "Could not load JAMB question coverage.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalQuestions = summaries.reduce((total, row) => total + row.count, 0);
  const totalAnswered = Object.keys(savedAnswers).length;
  const totalBookmarked = bookmarks.length;
  const practicePercent = totalQuestions > 0
    ? Math.min(100, Math.round((totalAnswered / totalQuestions) * 100))
    : 0;
  const availableYears = useMemo(
    () => [...new Set(summaries.flatMap((row) => row.years))].sort((a, b) => b - a),
    [summaries],
  );
  const jambActivity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — shares the JUPEB dashboard's visual language and proportions. */}
      <WorkspaceHomeHero>
          <div className="text-center">
            <div className="flex justify-center mb-6 animate-in-up stagger-1">
              <StreakDisplay
                currentStreak={progressReady ? jambActivity.currentStreak : 0}
                longestStreak={progressReady ? jambActivity.longestStreak : 0}
                totalDaysStudied={progressReady ? jambActivity.totalDaysStudied : 0}
                hasStudiedToday={progressReady && jambActivity.hasStudiedToday}
                compact
              />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-in-up stagger-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">JAMB Past Questions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-[1.1] animate-in-up stagger-3">
              Master Your Exams with
              <span className="text-gradient-gold block mt-2">Spaced Repetition</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in-up stagger-4">
              Study your JAMB past questions with scientifically proven learning techniques. Never forget what you've learned.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-in-up stagger-5">
              <Button
                size="lg"
                onClick={() => navigate("/jamb/30-day-syllabus")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 glow-gold animate-pulse-glow shadow-lg shadow-primary/25"
              >
                <CalendarDays className="w-5 h-5 mr-2" />
                {jambStudySessions.length > 0 ? "Continue 30-Day Syllabus" : "30-Day Syllabus Plan"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/jamb/cbt/setup")}
                className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Target className="w-5 h-5 mr-2" />
                CBT Practice
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/jamb/past-questions")}
                className="border-accent/40 text-accent hover:bg-accent/10 hover:border-accent hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Past Questions
              </Button>
            </div>
          </div>
      </WorkspaceHomeHero>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        {showSetupNudge && (
          <section className="mb-6 animate-in-up">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Finish setting up</p>
                <p className="text-xs text-muted-foreground">Theme, study plan & chat — about 1 minute.</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/jamb/onboarding")}
                className="h-9 shrink-0 rounded-lg bg-gradient-to-r from-primary to-accent px-3 text-xs text-primary-foreground transition-opacity hover:opacity-90"
              >
                Finish
              </Button>
              <button
                type="button"
                onClick={() => setNudgeDismissed(true)}
                aria-label="Dismiss setup reminder"
                className="shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
        {error && (
          <section className="mb-6 animate-in-up">
            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">JAMB question bank</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </section>
        )}

        <JambDailyMissionCard history={dailyMissionHistory} ready={missionHistoryReady} />

        {/* Programme-specific values inside the shared progress panel — never reads JUPEB data. */}
        <DashboardProgressPanel
          progress={practicePercent}
          progressLabel="Practised"
          metrics={[
            { label: "Published Questions", value: loading ? "—" : totalQuestions.toLocaleString(), icon: BookOpen, palette: "primary" },
            { label: "Answers Saved", value: progressReady ? totalAnswered.toLocaleString() : "—", icon: Brain, palette: "physics" },
            { label: "Bookmarks", value: bookmarksReady ? totalBookmarked.toLocaleString() : "—", icon: Bookmark, palette: "accent" },
            { label: "Available Years", value: availableYears.length, icon: Library, palette: "destructive" },
          ]}
          ariaLabel="JAMB overall practice progress"
        />

        {/* JAMB-only streak and milestone panels mirror JUPEB's personal progress row. */}
        <section className="mb-12 grid gap-4 md:grid-cols-2 animate-in-up stagger-2">
          <StreakDisplay
            currentStreak={progressReady ? jambActivity.currentStreak : 0}
            longestStreak={progressReady ? jambActivity.longestStreak : 0}
            totalDaysStudied={progressReady ? jambActivity.totalDaysStudied : 0}
            hasStudiedToday={progressReady && jambActivity.hasStudiedToday}
          />
          <JambMilestonesPanel metrics={achievementMetrics} ready={achievementsReady} />
        </section>

        {/* JAMB rankings share the leaderboard card shell but remain gated from JUPEB scores. */}
        <section className="mb-12 animate-in-up stagger-3">
          <LeaderboardPanelFrame statusLabel="Pending verification">
            <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No verified JAMB scores yet</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                JAMB rankings appear after scores are verified.
              </p>
              <Link
                to="/jamb/leaderboard"
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                View JAMB leaderboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </LeaderboardPanelFrame>
        </section>

        {/* Subject cards preserve the JUPEB card treatment with JAMB-only content. */}
        <section className="animate-in-up stagger-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Subjects</h2>
            <motion.span
              className="text-sm text-muted-foreground inline-flex items-center gap-1"
              key={totalQuestions}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <span className="tabular-nums font-semibold text-foreground">{loading ? "—" : totalQuestions.toLocaleString()}</span>
              <span>questions total</span>
            </motion.span>
          </div>
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {JAMB_QUESTION_BANK_SUBJECTS.map((subject) => (
              <motion.div key={subject} variants={cardVariants}>
                <SubjectCard
                  subject={subject}
                  infoOverride={{ name: JAMB_SUBJECT_INFO[subject].label, icon: JAMB_SUBJECT_INFO[subject].icon }}
                  questionCount={summaries.find((row) => row.subject === subject)?.count ?? 0}
                  questionCountReady={!loading}
                  studiedCount={subjectReviewStats.find((row) => row.subject === subject)?.studiedCount ?? 0}
                  learnedCount={subjectReviewStats.find((row) => row.subject === subject)?.learnedCount ?? 0}
                  statsReady={reviewProgressReady && reviewMetadataReady && !reviewMetadataError}
                  onClick={() => navigate(`/jamb/past-questions?subject=${subject}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.button
              type="button"
              onClick={() => navigate("/jamb/study")}
              className="p-4 rounded-xl border border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:bg-primary/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <Brain className="w-7 h-7 mx-auto text-primary" />
              <p className="font-medium mt-2">Revision Cards</p>
              <p className="text-xs text-muted-foreground">Review due questions</p>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate("/jamb/cbt/setup")}
              className="p-4 rounded-xl border border-accent/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent hover:bg-accent/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <Clock3 className="w-7 h-7 mx-auto text-accent" />
              <p className="font-medium mt-2">Timed CBT</p>
              <p className="text-xs text-muted-foreground">Exam-time practice</p>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate("/jamb/daily-mission")}
              className="p-4 rounded-xl border border-biology/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-biology hover:bg-biology/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <CalendarDays className="w-7 h-7 mx-auto text-biology" />
              <p className="font-medium mt-2">Daily Mission</p>
              <p className="text-xs text-muted-foreground">Daily practice set</p>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate("/jamb/syllabus")}
              className="p-4 rounded-xl border border-physics/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-physics hover:bg-physics/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <BookOpen className="w-7 h-7 mx-auto text-physics" />
              <p className="font-medium mt-2">JAMB Syllabus</p>
              <p className="text-xs text-muted-foreground">Browse subjects</p>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => navigate("/jamb/ai")}
              className="p-4 rounded-xl border border-chemistry/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-chemistry hover:bg-chemistry/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <Sparkles className="w-7 h-7 mx-auto text-chemistry" />
              <p className="font-medium mt-2">AI Tutor</p>
              <p className="text-xs text-muted-foreground">Study any topic</p>
            </motion.button>
          </motion.div>
        </section>

        <section className="mt-12 bg-card rounded-2xl border border-border p-6 chalk-texture">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Study Tips
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">1.</span><span><strong>Study daily</strong> — consistency beats cramming.</span></li>
            <li className="flex gap-2"><span className="text-primary">2.</span><span><strong>Review difficult questions</strong> — revisit saved answers.</span></li>
            <li className="flex gap-2"><span className="text-primary">3.</span><span><strong>Practise with the timer</strong> — build exam-day pacing.</span></li>
            <li className="flex gap-2"><span className="text-primary">4.</span><span><strong>Use verified answers</strong> — unreviewed keys are not official scores.</span></li>
          </ul>
        </section>

      </main>

      <footer className="border-t border-border py-8">
        <div className="flex flex-col items-center gap-3">
          <img src={rutexLogo} alt="Rutex Logo" className="w-10 h-10 rounded-lg object-cover" />
          <p className="text-xs text-muted-foreground">Built by <span className="font-semibold text-foreground">Rutex</span></p>
          <p className="text-xs text-muted-foreground">JAMB UTME Preparation · {JAMB_TARGET_EXAM_YEAR}</p>
        </div>
      </footer>
    </div>
  );
}
