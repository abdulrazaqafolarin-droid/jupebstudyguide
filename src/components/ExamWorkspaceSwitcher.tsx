import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EXAM_PROGRAMS, type ExamProgramId } from '@/lib/exam-program';

export function ExamWorkspaceSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const isJamb = location.pathname === '/jamb' || location.pathname.startsWith('/jamb/');
  const current = isJamb ? EXAM_PROGRAMS.jamb : EXAM_PROGRAMS.jupeb;
  const target = isJamb ? EXAM_PROGRAMS.jupeb : EXAM_PROGRAMS.jamb;
  const [switching, setSwitching] = useState(false);

  const switchWorkspace = async () => {
    if (switching) return;
    setSwitching(true);
    const programId = target.id as ExamProgramId;
    const { error } = await supabase.rpc('select_exam_program', { p_exam_program_id: programId });
    if (error) {
      toast.error('Could not switch programmes. Please try again.');
      setSwitching(false);
      return;
    }
    navigate(target.route);
    setSwitching(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {isJamb ? <GraduationCap className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current workspace</p>
          <p className="text-sm font-semibold">{current.name}</p>
          <p className="text-xs text-muted-foreground">{current.description}</p>
        </div>
      </div>
      <button type="button" onClick={() => void switchWorkspace()} disabled={switching}
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60">
        {switching ? <><Loader2 className="h-4 w-4 animate-spin" /> Switching…</> : `Switch to ${target.name}`}
        {!switching ? <ArrowLeftRight className="h-4 w-4" /> : null}
      </button>
    </div>
  );
}
