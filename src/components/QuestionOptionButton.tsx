import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuestionOptionState = "default" | "selected" | "correct" | "incorrect" | "muted";
export type QuestionOptionVariant = "quiz" | "past-question";

interface QuestionOptionButtonProps {
  label: string;
  children: ReactNode;
  state?: QuestionOptionState;
  variant?: QuestionOptionVariant;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  contentClassName?: string;
}

/** Shared option tile with the exact JUPEB quiz and past-question treatments. */
export function QuestionOptionButton({
  label,
  children,
  state = "default",
  variant = "quiz",
  selected,
  disabled = false,
  onClick,
  contentClassName,
}: QuestionOptionButtonProps) {
  const quizButtonStyles: Record<QuestionOptionState, string> = {
    default: "border-border bg-secondary/30 hover:border-primary hover:bg-primary/5",
    selected: "border-primary bg-primary/10",
    correct: "border-accent bg-accent/10",
    incorrect: "border-destructive bg-destructive/10",
    muted: "border-border bg-secondary/30 opacity-50",
  };
  const quizLabelStyles: Record<QuestionOptionState, string> = {
    default: "bg-secondary text-foreground",
    selected: "bg-primary text-primary-foreground",
    correct: "bg-accent text-accent-foreground",
    incorrect: "bg-destructive text-destructive-foreground",
    muted: "bg-secondary text-muted-foreground",
  };
  const pastQuestionButtonStyles: Record<QuestionOptionState, string> = {
    default: "border-border bg-card hover:bg-accent/50",
    selected: "border-primary/50 bg-primary/5 text-primary font-medium",
    correct: "border-green-500/50 bg-green-50/50 text-green-700 font-medium dark:bg-green-950/20 dark:text-green-300",
    incorrect: "border-red-500/50 bg-red-50/50 text-red-700 font-medium dark:bg-red-950/20 dark:text-red-300",
    muted: "border-border bg-card opacity-50",
  };
  const pastQuestionLabelStyles: Record<QuestionOptionState, string> = {
    default: "bg-muted text-muted-foreground",
    selected: "bg-primary text-primary-foreground",
    correct: "bg-green-600 text-white",
    incorrect: "bg-red-600 text-white",
    muted: "bg-muted text-muted-foreground",
  };
  const buttonStyles = variant === "past-question" ? pastQuestionButtonStyles : quizButtonStyles;
  const labelStyles = variant === "past-question" ? pastQuestionLabelStyles : quizLabelStyles;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected ?? state === "selected"}
      className={cn(
        variant === "past-question"
          ? "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all active:scale-[0.97]"
          : "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-sm transition-all duration-300",
        buttonStyles[state],
        disabled && "disabled:cursor-not-allowed",
      )}
    >
      <span className={cn(
        variant === "past-question"
          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono font-semibold",
        labelStyles[state],
      )}>
        {variant === "past-question"
          ? label
          : state === "correct" ? <Check className="h-4 w-4" />
            : state === "incorrect" ? <X className="h-4 w-4" />
              : label}
      </span>
      <span className={cn(
        "min-w-0 flex-1",
        variant === "past-question" ? "text-pretty break-words" : "pt-1 font-mono text-sm leading-relaxed",
        contentClassName,
      )}>
        {children}
      </span>
    </button>
  );
}
