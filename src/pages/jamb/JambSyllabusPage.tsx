import { Link } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JambSyllabusPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-4">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg border border-border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div><p className="text-xs text-muted-foreground">JAMB workspace</p><h1 className="text-2xl font-bold">Syllabus</h1></div>
        </header>
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold">Official syllabus not yet verified</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Rutex will display a JAMB syllabus only after a versioned official source has been reviewed and recorded.
                No JUPEB syllabus or unverified topic list is substituted here.
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Continue preparing</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">You can still browse the supplied JAMB Physics, Chemistry and Biology question collection and use the JAMB-aware tutor. The tutor will distinguish general subject knowledge from verified JAMB syllabus references.</p>
          <Button asChild className="mt-4"><Link to="/jamb/past-questions">Open JAMB past questions</Link></Button>
        </section>
      </div>
    </main>
  );
}
