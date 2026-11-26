import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectableSubjectCardProps {
  icon: ReactNode;
  label: string;
  description?: ReactNode;
  meta?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** Shared selectable subject tile used in JUPEB quiz and JAMB CBT setup. */
export function SelectableSubjectCard({
  icon,
  label,
  description,
  meta,
  selected,
  disabled = false,
  onSelect,
}: SelectableSubjectCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
        {meta && <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span>}
      </span>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
