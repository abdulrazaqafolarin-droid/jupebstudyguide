import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, BookOpen, GraduationCap } from "lucide-react";
import { EXAM_PROGRAMS } from "@/lib/exam-program";

export function ExamWorkspaceSwitcher() {
  const location = useLocation();
  const isJamb = location.pathname === "/jamb" || location.pathname.startsWith("/jamb/");
  const current = isJamb ? EXAM_PROGRAMS.jamb : EXAM_PROGRAMS.jupeb;
  const target = isJamb ? EXAM_PROGRAMS.jupeb : EXAM_PROGRAMS.jamb;
  const targetLabel = isJamb ? "Switch to JUPEB" : "Switch to JAMB";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {isJamb ? (
          <GraduationCap className="h-5 w-5 text-primary" />
        ) : (
          <BookOpen className="h-5 w-5 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current workspace</p>
          <p className="text-sm font-semibold">{current.name}</p>
          <p className="text-xs text-muted-foreground">{current.description}</p>
        </div>
      </div>
      <Link
        to={target.route}
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        {targetLabel}
        <ArrowLeftRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
