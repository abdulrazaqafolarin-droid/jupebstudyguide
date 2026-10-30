import { Check, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemePreviewCard } from './ThemePreviewCard';
import { cn } from '@/lib/utils';

interface StepThemeProps {
  selected: 'dark' | 'light';
  onSelect: (theme: 'dark' | 'light') => void;
}

/**
 * Step 1 — appearance. Tapping a card applies the theme GLOBALLY and live:
 * the backdrop morphs behind the cards, so the preview is the product, not
 * a picture of it. The check badge flies between cards via layoutId.
 */
export function StepTheme({ selected, onSelect }: StepThemeProps) {
  /** Swap the theme inside a View Transition where supported (instant elsewhere). */
  const pick = (theme: 'dark' | 'light') => {
    if (theme === selected) return;
    const apply = () => onSelect(theme);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition) doc.startViewTransition(apply);
    else apply();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your look &amp; feel</h2>
        <p className="text-sm text-muted-foreground">
          Night owl or early bird? Tap to try — the whole app changes with you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['dark', 'light'] as const).map((variant) => {
          const isSelected = selected === variant;
          return (
            <button
              key={variant}
              onClick={() => pick(variant)}
              aria-pressed={isSelected}
              aria-label={variant === 'dark' ? 'Night Owl dark theme' : 'Day Light theme'}
              className={cn(
                'relative rounded-2xl border-2 p-2 text-left transition-all duration-200',
                'hover:-translate-y-1',
                isSelected
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <ThemePreviewCard variant={variant} />
              <div className="flex items-center justify-between mt-2.5 px-0.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {variant === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {variant === 'dark' ? 'Night Owl' : 'Day Light'}
                </span>
                {isSelected && (
                  <motion.span
                    layoutId="onboarding-theme-check"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                  </motion.span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Change anytime in Settings → Appearance.
      </p>
    </div>
  );
}
