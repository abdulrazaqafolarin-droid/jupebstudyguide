import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";

export default function JambLeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader title="Leaderboard" backTo="/jamb" backLabel="Back to JAMB workspace" icon={Trophy} iconClassName="text-accent" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="py-12 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No verified rankings yet</p>
          <p className="mx-auto mb-4 mt-1 max-w-xl text-xs text-muted-foreground/70">
            JAMB rankings will appear when independently verified practice and CBT results can be compared safely. Unverified answers and scores will not be included.
          </p>
          <Button asChild>
            <Link to="/jamb/past-questions">Go Study Now</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
