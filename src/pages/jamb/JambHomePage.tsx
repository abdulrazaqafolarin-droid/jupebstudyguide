import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Bot, Clock3, FileQuestion, ShieldAlert } from "lucide-react";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS, JAMB_TARGET_EXAM_YEAR } from "@/lib/jamb-config";
import { getJambSubjectSummaries, JambSchemaUnavailableError, type JambSubjectSummary } from "@/lib/jamb-question-service";
import { Button } from "@/components/ui/button";

export default function JambHomePage() {
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof JambSchemaUnavailableError
          ? "The JAMB database foundation is awaiting the reviewed Supabase migration."
          : reason instanceof Error ? reason.message : "Could not load JAMB question coverage.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalQuestions = summaries.reduce((total, row) => total + row.count, 0);

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-primary/10 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Rutex Master</span>
            <span>JAMB workspace</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Prepare with purpose.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Build confidence with subject-based UTME practice, timed drills and a JAMB-aware AI study tutor.
            This is an independent preparation tool, not an official JAMB service.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/jamb/past-questions">Explore past questions <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/jamb/cbt/setup"><Clock3 className="mr-2 h-4 w-4" /> Start CBT practice</Link>
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border/70 pt-4">
            <div><p className="text-2xl font-bold tabular-nums">{loading ? "—" : totalQuestions.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Published questions</p></div>
            <div><p className="text-2xl font-bold tabular-nums">3</p><p className="text-[11px] text-muted-foreground">Initial science subjects</p></div>
            <div><p className="text-2xl font-bold tabular-nums">{JAMB_TARGET_EXAM_YEAR}</p><p className="text-[11px] text-muted-foreground">Preparation target</p></div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div><p className="font-semibold">Question bank connection</p><p className="mt-1 text-muted-foreground">{error}</p></div>
          </div>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">Choose a subject</h2><p className="text-xs text-muted-foreground">The first content pack covers three science subjects.</p></div>
            <Link to="/jamb/past-questions" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {JAMB_SUBJECTS.map((subject) => {
              const summary = summaries.find((item) => item.subject === subject);
              const info = JAMB_SUBJECT_INFO[subject];
              return (
                <Link key={subject} to={`/jamb/past-questions?subject=${subject}`}
                  className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-3xl">{info.icon}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
                  <h3 className="mt-3 font-semibold">{info.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{info.description}</p>
                  <p className="mt-3 text-xs font-medium tabular-nums text-primary">{loading ? "Loading coverage…" : `${summary?.count ?? 0} published questions`}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/jamb/past-questions" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50">
            <FileQuestion className="h-5 w-5 text-primary" /><span className="flex-1"><strong className="block text-sm">Past questions</strong><small className="text-xs text-muted-foreground">Browse by subject and year</small></span><ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/jamb/cbt/setup" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50">
            <Clock3 className="h-5 w-5 text-primary" /><span className="flex-1"><strong className="block text-sm">CBT practice</strong><small className="text-xs text-muted-foreground">Timed subject drills</small></span><ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/jamb/ai" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50">
            <Bot className="h-5 w-5 text-primary" /><span className="flex-1"><strong className="block text-sm">AI study tutor</strong><small className="text-xs text-muted-foreground">Get clear explanations</small></span><ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/jamb/syllabus" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50">
            <BookOpen className="h-5 w-5 text-primary" /><span className="flex-1"><strong className="block text-sm">Syllabus</strong><small className="text-xs text-muted-foreground">Official source verification</small></span><ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div><h3 className="text-sm font-semibold">A note about full UTME mocks</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Physics, Chemistry and Biology are the initial supplied subjects. Use of English is compulsory in UTME,
              so this three-subject pack is not presented as a complete official-format four-subject mock.
              Official exam settings and syllabus content will only be enabled after their current sources are verified.
            </p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
