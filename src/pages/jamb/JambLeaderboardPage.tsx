import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, BookOpen, ShieldCheck, Trophy } from "lucide-react";

export default function JambLeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">Leaderboard</h1>
          </div>
          <Trophy className="h-5 w-5 text-primary" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Rankings will appear soon</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Rankings will be enabled when verified JAMB practice and CBT results are available.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/jamb/stats" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Study Stats</strong><span className="text-xs text-muted-foreground">Review your JAMB activity</span></span>
          </Link>
          <Link to="/jamb/past-questions" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50">
            <BookOpen className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Past Questions</strong><span className="text-xs text-muted-foreground">Build your JAMB progress</span></span>
          </Link>
        </div>
      </main>
    </div>
  );
}
