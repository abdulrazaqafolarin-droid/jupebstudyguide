import { BookOpen } from 'lucide-react';
import type { QuestionRef } from '@/lib/ai-service';

function cap(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Citations for past-bank questions the AI retrieved for its reply (RAG).
 * Display-only: proves which real questions grounded the answer.
 */
export default function QuestionRefChips({ refs }: { refs: QuestionRef[] }) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="mt-1.5 pt-1.5 border-t border-white/5">
      <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground">
        <BookOpen className="w-3 h-3" />
        <span>From past questions</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {refs.map((r) => (
          <span
            key={r.question_id}
            title={r.question_id}
            className="inline-flex items-center rounded-full bg-white/[0.07] border border-white/10 px-1.5 py-px text-[10px] text-foreground/80"
          >
            {r.year} {cap(r.subject)} • {r.category}
          </span>
        ))}
      </div>
    </div>
  );
}
