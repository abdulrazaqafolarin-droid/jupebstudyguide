import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, Flame, Search, Star, Trophy, Award } from "lucide-react";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import AchievementBadge from "@/components/AchievementBadge";
import type { Achievement, AchievementStats } from "@/hooks/useAchievements";
import { Input } from "@/components/ui/input";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import { useJambDailyMissions } from "@/hooks/useJambDailyMissions";
import {
  getJambAchievementProgress,
  getJambActivityStats,
  type JambAchievementMetrics,
  type JambAchievementDefinition,
} from "@/lib/jamb-analytics";

type AchievementCategory = "all" | JambAchievementDefinition["category"];

const CATEGORY_FILTERS: { value: AchievementCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Practice", label: "Practice" },
  { value: "Consistency", label: "Consistency" },
  { value: "Organisation", label: "Organisation" },
];

export default function JambAchievementsPage() {
  const { savedAnswers, isReady: answersReady } = useJambPracticeProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();
  const { history: missionHistory, ready: missionsReady } = useJambDailyMissions();
  const [categoryFilter, setCategoryFilter] = useState<AchievementCategory>("all");
  const [search, setSearch] = useState("");
  const activity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);
  const completedMissionCount = missionHistory.filter((mission) => mission.status === "completed").length;
  const metrics: JambAchievementMetrics = { ...activity, bookmarkCount: bookmarks.length, completedMissionCount };
  const badgeStats: AchievementStats = {
    totalQuestionsAnswered: metrics.answerCount,
    totalCorrect: 0,
    currentStreak: metrics.currentStreak,
    longestStreak: metrics.longestStreak,
    totalDaysStudied: metrics.totalDaysStudied,
    questionsLearned: 0,
    subjectsStudied: 0,
  };
  const achievements = getJambAchievementProgress(metrics);
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const ready = answersReady && bookmarksReady && missionsReady;

  const categoryStats = useMemo(() => {
    return CATEGORY_FILTERS.slice(1).map((category) => ({
      ...category,
      total: achievements.filter((item) => item.category === category.value).length,
      unlocked: achievements.filter((item) => item.category === category.value && item.unlocked).length,
    }));
  }, [achievements]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return achievements.filter((achievement) => {
      if (categoryFilter !== "all" && achievement.category !== categoryFilter) return false;
      if (query && !achievement.label.toLowerCase().includes(query) && !achievement.description.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [achievements, categoryFilter, search]);

  const percentage = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader title="Achievements" backTo="/jamb" backLabel="Back to JAMB workspace" icon={Trophy} />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-10">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-2xl font-bold tabular-nums">{ready ? unlockedCount : "—"}</span>
              <span className="text-muted-foreground">/{achievements.length}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">Achievements unlocked</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {categoryStats.filter((category) => ready && category.unlocked > 0).map((category) => (
                <span
                  key={category.value}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {category.value === "Practice" ? <BookOpen className="h-3 w-3" />
                    : category.value === "Consistency" ? <Flame className="h-3 w-3" />
                      : <Bookmark className="h-3 w-3" />}
                  {ready ? `${category.unlocked}/${category.total}` : "—"}
                </span>
              ))}
            </div>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ready ? percentage : 0}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
            />
          </div>
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search achievements..."
            className="bg-background pl-9"
            aria-label="Search achievements"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter achievements by category">
          {CATEGORY_FILTERS.map((category) => {
            const count = category.value === "all"
              ? achievements.length
              : achievements.filter((item) => item.category === category.value).length;
            const active = categoryFilter === category.value;
            return (
              <button
                key={category.value}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryFilter(category.value)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                ].join(" ")}
              >
                {category.label} ({count})
              </button>
            );
          })}
        </div>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="JAMB achievements">
          {filtered.map((achievement, index) => (
            <motion.article
              key={achievement.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.025 }}
              whileHover={{ y: -2, transition: { type: "spring", stiffness: 300, damping: 22 } }}
              className={achievement.unlocked
                ? "rounded-xl border border-primary/25 bg-card p-4 transition-colors"
                : "rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-border"}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <AchievementBadge
                    achievement={{
                      id: achievement.id,
                      name: achievement.label,
                      description: achievement.description,
                      icon: achievement.category === "Consistency" ? "🔥" : achievement.category === "Organisation" ? "🔖" : "📘",
                      rarity: "common",
                      condition: () => achievement.unlocked,
                      getProgress: () => ({ current: achievement.current, max: achievement.target }),
                    } satisfies Achievement}
                    unlocked={ready && achievement.unlocked}
                    size="sm"
                    showDetails={false}
                    stats={badgeStats}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{achievement.label}</h3>
                    {achievement.unlocked
                      ? <span className="text-[10px] font-semibold text-primary">Unlocked</span>
                      : <span className="text-[10px] text-muted-foreground">{ready ? `${achievement.current}/${achievement.target}` : "—"}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ready ? achievement.percent : 0}%` }}
                      transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.025 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Star className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No achievements match your filters</p>
            {(categoryFilter !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => { setCategoryFilter("all"); setSearch(""); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Rutex practice milestones are not official JAMB awards or exam grades.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/jamb/past-questions" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <BookOpen className="h-4 w-4" /> Continue JAMB practice
          </Link>
          <Link to="/jamb/stats" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <Award className="h-4 w-4" /> View study stats
          </Link>
        </div>
      </main>
    </div>
  );
}
