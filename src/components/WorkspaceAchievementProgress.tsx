import type { ReactNode } from "react";

interface WorkspaceAchievementProgressProps {
  unlockedCount: number | string;
  totalCount: number;
  percentage: number;
  badges?: ReactNode;
}

/** Shared progress header for JUPEB and JAMB achievement galleries. */
export function WorkspaceAchievementProgress({
  unlockedCount,
  totalCount,
  percentage,
  badges,
}: WorkspaceAchievementProgressProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-2xl font-bold tabular-nums">{unlockedCount}</span>
          <span className="text-muted-foreground">/{totalCount}</span>
        </div>
        {badges && <div className="flex flex-wrap items-center justify-end gap-2">{badges}</div>}
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-700 ease-out"
          style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
        />
      </div>
    </div>
  );
}

export default WorkspaceAchievementProgress;
