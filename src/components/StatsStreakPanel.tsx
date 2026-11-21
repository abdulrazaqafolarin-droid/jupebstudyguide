import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";

interface StatsStreakPanelProps {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  questionsAnswered: number;
  hasStudiedToday: boolean;
  ready?: boolean;
  footer?: ReactNode;
}

/** Shared JUPEB/JAMB statistics streak card. */
export function StatsStreakPanel({
  currentStreak,
  longestStreak,
  totalDaysStudied,
  questionsAnswered,
  hasStudiedToday,
  ready = true,
  footer,
}: StatsStreakPanelProps) {
  const display = (value: number) => ready ? value.toLocaleString() : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-card rounded-2xl border p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Streak
        </h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          {display(totalDaysStudied)} total days
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-500 tabular-nums">{display(currentStreak)}</p>
          <p className="text-[10px] text-muted-foreground">Current streak</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-3xl font-bold tabular-nums">{display(longestStreak)}</p>
          <p className="text-[10px] text-muted-foreground">Best streak</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-3xl font-bold tabular-nums">{display(questionsAnswered)}</p>
          <p className="text-[10px] text-muted-foreground">Questions answered</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Today:</span>
        {!ready ? (
          <span className="text-muted-foreground">Loading…</span>
        ) : hasStudiedToday ? (
          <span className="flex items-center gap-1 font-medium text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Studied
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted" />
            Not studied yet
          </span>
        )}
      </div>
      {footer}
    </motion.div>
  );
}
