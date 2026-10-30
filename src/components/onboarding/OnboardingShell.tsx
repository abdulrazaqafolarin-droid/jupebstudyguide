import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingShellProps {
  stepIndex: number;
  stepCount: number;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  secondary?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Full-screen frame for every onboarding step: chalkboard backdrop (same
 * mesh + texture language as the home hero), a chalk-stroke progress line,
 * and a bottom-anchored primary CTA in the thumb zone. One decision per
 * screen — this shell never grows new chrome.
 */
export function OnboardingShell({
  stepIndex,
  stepCount,
  ctaLabel,
  onCta,
  ctaDisabled,
  onBack,
  onSkip,
  secondary,
  children,
}: OnboardingShellProps) {
  const reduce = useReducedMotion();
  const progress = (stepIndex + 1) / stepCount;

  return (
    <div className="min-h-screen bg-background relative flex flex-col overflow-hidden">
      {/* Backdrop — home-hero visual language so the flow feels like the app, not a detour */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/8 animate-mesh bg-[length:200%_200%]" style={{ willChange: 'transform' }} />
      <div className="absolute inset-0 chalk-texture opacity-20" style={{ willChange: 'transform' }} />
      {!reduce && (
        <>
          <div className="absolute top-16 left-6 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" style={{ willChange: 'transform' }} />
          <div className="absolute bottom-24 right-4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-float" style={{ willChange: 'transform', animationDelay: '-3s' }} />
        </>
      )}

      {/* Header */}
      <header className="relative z-10 px-4 pt-4 pb-2">
        <div className="max-w-md mx-auto flex items-center justify-between h-9">
          <div className="w-16">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label="Previous step"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground tracking-wide">
            STEP {stepIndex + 1} / {stepCount}
          </p>
          <div className="w-16 text-right">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
        {/* Chalk progress line */}
        <div className="max-w-md mx-auto mt-1 h-1 rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            style={{
              transform: `scaleX(${progress})`,
              transformOrigin: 'left',
              transition: reduce ? 'opacity 200ms ease' : 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          />
        </div>
      </header>

      {/* Step content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer — thumb zone */}
      <footer className="relative z-10 px-4 pb-8 pt-2">
        <div className="max-w-md mx-auto space-y-3">
          {secondary}
          <Button
            size="lg"
            onClick={onCta}
            disabled={ctaDisabled}
            className={cn(
              'w-full h-14 text-base font-semibold rounded-xl',
              'bg-gradient-to-r from-primary to-accent text-primary-foreground',
              'hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25',
            )}
          >
            {ctaLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
