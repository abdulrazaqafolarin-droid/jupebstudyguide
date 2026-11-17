import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, Info, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JAMB_CBT_PRACTICE_PRESETS, JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import type { Subject } from "@/types/question";
import { Button } from "@/components/ui/button";

export default function JambCbtSetupPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Exclude<Subject, "math">>("physics");
  const [presetIndex, setPresetIndex] = useState(1);
  const [starting, setStarting] = useState(false);
  const preset = JAMB_CBT_PRACTICE_PRESETS[presetIndex];

  const startPractice = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("exam-attempts", {
        body: {
          action: "create",
          exam_program_id: "jamb",
          exam_year: new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0),
          subject,
          question_count: preset.questionCount,
          duration_minutes: preset.durationMinutes,
          attempt_kind: "subject_practice",
        },
      });
      if (error) throw error;
      if (!data?.attempt_id) throw new Error(data?.error ?? "The CBT practice session could not be created.");
      navigate(`/jamb/cbt/${data.attempt_id}`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to start CBT practice.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-4">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg border border-border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div><p className="text-xs text-muted-foreground">JAMB workspace</p><h1 className="text-2xl font-bold">Timed CBT practice</h1></div>
        </header>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Choose a subject</h2>
          <p className="mt-1 text-xs text-muted-foreground">These sessions use the approved JAMB question bank, not JUPEB questions.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {JAMB_SUBJECTS.map((item) => (
              <button key={item} onClick={() => setSubject(item)} aria-pressed={subject === item}
                className={`rounded-xl border px-2 py-4 text-sm font-semibold ${subject === item ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                <span className="block text-xl">{JAMB_SUBJECT_INFO[item].icon}</span>{JAMB_SUBJECT_INFO[item].label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Practice length</h2>
          <div className="mt-3 space-y-2">
            {JAMB_CBT_PRACTICE_PRESETS.map((item, index) => (
              <button key={item.questionCount} onClick={() => setPresetIndex(index)} aria-pressed={presetIndex === index}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm ${presetIndex === index ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                <span className="font-medium">{item.label}</span><span className="text-xs text-muted-foreground">{item.durationMinutes} min</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><Clock3 className="h-4 w-4 shrink-0" />The timer begins when the server creates your attempt. Refreshing the page will not restart it.</div>
        </section>
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-xs leading-relaxed text-muted-foreground">
            This is a single-subject timed practice session, not a complete official UTME mock. Use of English is compulsory in UTME and is not part of the initial supplied question set. The current official manual and syllabus must be verified before full-mock settings are enabled.
          </p></div>
        </section>
        <Button onClick={startPractice} disabled={starting} className="w-full py-6 text-base">
          {starting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing session…</> : <><ShieldCheck className="mr-2 h-4 w-4" />Start timed practice</>}
        </Button>
      </div>
    </main>
  );
}
