import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, ShieldCheck, Trophy } from "lucide-react";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";

export default function JambLeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader title="Leaderboard" backTo="/jamb" backLabel="Back to JAMB workspace" icon={Trophy} iconClassName="text-accent" />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 text-center sm:p-10"
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <ShieldCheck className="h-7 w-7" />
          </motion.div>
          <h2 className="text-xl font-bold">Rankings will appear soon</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The JAMB leaderboard will open when verified practice and CBT results are available. No unverified scores are shown.
          </p>
        </motion.section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/jamb/stats" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Study Stats</strong><span className="text-xs text-muted-foreground">Review your JAMB activity</span></span>
          </Link>
          <Link to="/jamb/past-questions" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50">
            <BookOpen className="h-5 w-5 text-primary" />
            <span><strong className="block text-sm">Past Questions</strong><span className="text-xs text-muted-foreground">Build your JAMB progress</span></span>
          </Link>
        </div>
      </main>
    </div>
  );
}
