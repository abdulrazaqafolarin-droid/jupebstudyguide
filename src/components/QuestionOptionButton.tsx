import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuestionOptionState = "default" | "selected" | "correct" | "incorrect" | "muted";

interface QuestionOptionButtonProps {
  label: string;
  children: ReactNode;
  state?: QuestionOptionState;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  contentClassName?: string;
}

/** Shared answer option tile used by JUPEB quiz and JAMB practice screens. */
export function QuestionOptionButton({
  label,
  children,
  state = "default",
  selected,
  disabled = false,
  onClick,
  contentClassName,
}: QuestionOptionButtonProps) {
  const stateStyles: Record<QuestionOptionState, { button: string; label: string }> = {
    default: {
      button: "border-border bg-secondary/30 hover:border-primary hover:bg-primary/5",
      label: "bg-secondary text-foreground",
    },
    selected: {
      button: "border-primary bg-primary/10",
      label: "bg-primary text-primary-foreground",
    },
    correct: {
      button: "border-accent bg-accent/10",
      label: "bg-accent text-accent-foreground",
    },
    incorrect: {
      button: "border-destructive bg-destructive/10",
      label: "bg-destructive text-destructive-foreground",
    },
    muted: {
      button: "border-border bg-secondary/30 opacity-50",
      label: "bg-secondary text-muted-foreground",
    },
  };
  const styles = stateStyles[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected ?? state === "selected"}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-sm transition-all duration-300",
        styles.button,
        disabled && "disabled:cursor-not-allowed",
      )}
    >
      <span className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono font-semibold",
        styles.label,
      )}>
        {state === "correct" ? <Check className="h-4 w-4" />
          : state === "incorrect" ? <X className="h-4 w-4" />
            : label}
      </span>
      <span className={cn("min-w-0 flex-1 pt-1 font-mono text-sm leading-relaxed", contentClassName)}>
        {children}
      </span>
    </button>
  );
}
