import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { LeaderboardPanelFrame } from "@/components/LeaderboardPanelFrame";

export default function JambLeaderboardPage() {
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
        <LeaderboardPanelFrame statusLabel="Pending verification">
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No verified JAMB scores yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Rankings appear after JAMB scores are verified.
            </p>
            <Button asChild className="mt-1">
              <Link to="/jamb/past-questions">Go Study Now</Link>
            </Button>
          </div>
        </LeaderboardPanelFrame>
      </main>
    </div>
  );
}
