import { GraduationCap, Target, BookOpen, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A real miniature of the home hero rendered with actual design tokens,
 * scope-locked to one theme via CSS custom properties — so both cards show
 * the true result regardless of the currently active global theme. No
 * screenshots: what the student taps is what they get.
 */
export function ThemePreviewCard({ variant }: { variant: 'dark' | 'light' }) {
  return (
    <div
      className={cn(
        'theme-scope-dark rounded-2xl border border-border overflow-hidden',
        variant === 'light' && 'theme-scope-light',
      )}
      style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
      aria-hidden
    >
      <div className="p-3 space-y-2.5" style={{ background: 'hsl(var(--background))' }}>
        {/* Streak pill */}
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
            style={{ background: 'hsl(var(--primary) / 0.12)', borderColor: 'hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}
          >
            <Flame className="w-2.5 h-2.5" /> 1 day streak
          </span>
        </div>
        {/* Headline lines */}
        <div className="text-center space-y-1">
          <p className="text-[13px] font-bold leading-tight">Master Your Exams</p>
          <p
            className="text-[10px] leading-tight"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Study past questions with spaced repetition
          </p>
        </div>
        {/* Mini CTA + subject chips */}
        <div className="flex justify-center">
          <span
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            30-Day Plan
          </span>
        </div>
        <div className="flex justify-center gap-1.5 pt-0.5">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <GraduationCap className="w-3 h-3" style={{ color: 'hsl(var(--primary))' }} />
          </span>
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <BookOpen className="w-3 h-3" style={{ color: 'hsl(var(--accent))' }} />
          </span>
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <Target className="w-3 h-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
