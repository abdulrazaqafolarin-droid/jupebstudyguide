import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, Bookmark, BookOpen, Flame, LockKeyhole, Star, Trophy } from "lucide-react";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import {
  getJambAchievementProgress,
  getJambActivityStats,
  type JambAchievementMetrics,
} from "@/lib/jamb-analytics";

export default function JambAchievementsPage() {
  const { savedAnswers, isReady: answersReady } = useJambPracticeProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const activity = useMemo(() => getJambActivityStats(savedAnswers), [savedAnswers]);
  const metrics: JambAchievementMetrics = { ...activity, bookmarkCount: bookmarks.length };
  const achievements = getJambAchievementProgress(metrics);
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const visible = achievements.filter((item) =>
    filter === "all" || (filter === "unlocked" ? item.unlocked : !item.unlocked),
  );
  const ready = answersReady && bookmarksReady;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">JAMB Achievements</h1>
            <p className="text-[10px] text-muted-foreground">Milestones earned through JAMB activity only</p>
          </div>
          <Link to="/jamb/stats" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Study stats
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-10">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Trophy className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">Your JAMB progress milestones</h2>
                <p className="text-xs text-muted-foreground">Practice, consistency and saved questions</p>
              </div>
            </div>
            <p className="text-right text-lg font-bold tabular-nums">{ready ? unlockedCount : "—"}<span className="text-sm font-normal text-muted-foreground">/{achievements.length}</span></p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: (ready ? (unlockedCount / achievements.length) * 100 : 0) + "%" }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{ready ? activity.answerCount + " questions practised · " + activity.longestStreak + "-day best streak · " + bookmarks.length + " bookmarks" : "Loading JAMB activity…"}</p>
        </section>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter achievements">
          {(["all", "unlocked", "locked"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={filter === value ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground" : "rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"}
            >
              {value === "all" ? "All (" + achievements.length + ")" : value === "unlocked" ? "Unlocked (" + unlockedCount + ")" : "Locked (" + (achievements.length - unlockedCount) + ")"}
            </button>
          ))}
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          {visible.map((achievement) => (
            <article key={achievement.id} className={achievement.unlocked ? "rounded-xl border border-primary/25 bg-card p-4" : "rounded-xl border border-border bg-card/70 p-4"}>
              <div className="flex items-start gap-3">
                <div className={achievement.unlocked ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"}>
                  {achievement.category === "Consistency"
                    ? <Flame className="h-5 w-5" />
                    : achievement.category === "Organisation"
                      ? <Bookmark className="h-5 w-5" />
                      : achievement.unlocked
                        ? <Star className="h-5 w-5 fill-current" />
                        : <LockKeyhole className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{achievement.label}</h3>
                    {achievement.unlocked
                      ? <span className="text-[10px] font-semibold text-primary">Unlocked</span>
                      : <span className="text-[10px] text-muted-foreground">{ready ? achievement.current + "/" + achievement.target : "—"}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: (ready ? achievement.percent : 0) + "%" }} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          These are Rutex JAMB practice milestones, not official JAMB awards or exam grades.
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
