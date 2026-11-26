import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EXAM_PROGRAMS, getExamProgramRoute, type ExamProgramId } from '@/lib/exam-program';
import { toast } from 'sonner';

export default function ExamProgramSelectionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<ExamProgramId | null>(null);

  const choose = async (programId: ExamProgramId) => {
    if (!user || saving) return;
    setSaving(programId);
    const { data, error } = await supabase.rpc('select_exam_program', { p_exam_program_id: programId });
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      toast.error(error?.message || result?.error || 'Could not save your programme choice. Please try again.');
      setSaving(null);
      return;
    }
    navigate(getExamProgramRoute(programId), { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="pointer-events-none absolute inset-0 chalk-texture opacity-25" />
      <section className="relative z-10 w-full max-w-3xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GraduationCap className="h-7 w-7" /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Rutex Master</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose your study programme</h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
            Choose the examination you are preparing for. Each programme has its own onboarding, study progress and activation.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" disabled={saving !== null} onClick={() => void choose('jupeb')}
            className="group rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg disabled:cursor-wait disabled:opacity-70">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-6 w-6" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advanced level</p>
            <h2 className="mt-2 text-2xl font-bold">JUPEB</h2>
            <p className="mt-2 min-h-12 text-sm text-muted-foreground">{EXAM_PROGRAMS.jupeb.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {saving === 'jupeb' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with JUPEB <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
          <button type="button" disabled={saving !== null} onClick={() => void choose('jamb')}
            className="group rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg disabled:cursor-wait disabled:opacity-70">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-6 w-6" /></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">University entrance</p>
            <h2 className="mt-2 text-2xl font-bold">JAMB / UTME</h2>
            <p className="mt-2 min-h-12 text-sm text-muted-foreground">{EXAM_PROGRAMS.jamb.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {saving === 'jamb' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue with JAMB / UTME <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Your 24-hour trial starts in the programme you choose. A subscription or activation code for one programme does not activate the other.
        </p>
      </section>
    </main>
  );
}
