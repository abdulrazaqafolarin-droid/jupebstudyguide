import { Link } from "react-router-dom";
import { Star, Timer, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import WeeklyCountdown from "@/components/WeeklyCountdown";
import { getWeekBoundaries } from "@/lib/weekBoundary";

export default function JambLeaderboardPage() {
  const { end: currentWeekEnd } = getWeekBoundaries();

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="Leaderboard"
        backTo="/jamb"
        backLabel="Back to JAMB workspace"
        icon={Trophy}
        iconClassName="text-accent"
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Timer className="w-4 h-4" />
              Week ends in
            </div>
            <WeeklyCountdown weekEnd={currentWeekEnd} className="text-lg" />
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              Your Rank
              <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Pending verification
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your verified JAMB rank will appear here.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            This Week&apos;s Rankings
          </h2>
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium">No verified JAMB scores yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Rankings will appear here when eligible scores are verified.
            </p>
            <Button asChild>
              <Link to="/jamb/past-questions">Go Study Now</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
