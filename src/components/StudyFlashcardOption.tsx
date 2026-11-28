import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudyFlashcardOptionState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect"
  | "muted";

interface StudyFlashcardOptionProps {
  label: string;
  children: ReactNode;
  state?: StudyFlashcardOptionState;
  selected?: boolean;
  disabled?: boolean;
  reduceMotion?: boolean;
  animationDelayMs?: number;
  onClick: () => void;
}

/**
 * Identical answer-option tile for JUPEB and JAMB revision cards.
 * Each programme owns answer validation; this component owns presentation.
 */
export function StudyFlashcardOption({
  label,
  children,
  state = "default",
  selected,
  disabled = false,
  reduceMotion = false,
  animationDelayMs = 0,
  onClick,
}: StudyFlashcardOptionProps) {
  const stateStyles: Record<StudyFlashcardOptionState, { button: string; label: string }> = {
    default: {
      button: "border-border/60 bg-background/60 hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0",
      label: "bg-secondary/80 text-foreground",
    },
    selected: {
      button: "border-primary bg-primary/10 shadow-md shadow-primary/5",
      label: "bg-primary text-primary-foreground",
    },
    correct: {
      button: "border-accent bg-accent/15 shadow-lg shadow-accent/20",
      label: "bg-accent text-accent-foreground scale-110",
    },
    incorrect: {
      button: "border-destructive bg-destructive/15 shadow-lg shadow-destructive/10",
      label: "bg-destructive text-destructive-foreground scale-110",
    },
    muted: {
      button: "border-border/30 opacity-50 scale-[0.98]",
      label: "bg-secondary/50 text-muted-foreground",
    },
  };
  const styles = stateStyles[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected ?? state === "selected"}
      style={{ animationDelay: reduceMotion ? "0ms" : `${animationDelayMs}ms` }}
      className={cn(
        "w-full rounded-xl border-2 p-3.5 text-left transition-all duration-300",
        "flex items-start gap-3 active:scale-[0.99]",
        styles.button,
        !reduceMotion && "animate-in-up",
        reduceMotion && "motion-reduce:animate-none",
        disabled && "disabled:cursor-not-allowed",
      )}
    >
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold transition-all duration-200",
        styles.label,
      )}>
        {state === "correct" ? <Check className="h-4 w-4" />\n          : state === "incorrect" ? <X className="h-4 w-4" />\n            : label}
      </span>
      <span className={cn(
        "min-w-0 flex-1 pt-1 text-sm leading-relaxed transition-opacity duration-200",
        state === "muted" && "opacity-60",
      )}>
        {children}
      </span>
    </button>
  );
}

export default StudyFlashcardOption;
