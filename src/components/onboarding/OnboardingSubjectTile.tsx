import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingSubjectTileProps {
  icon: string;
  title: string;
  subtitle: string;
  variant?: "choice" | "required" | "unavailable";
  selected?: boolean;
  selectedClassName?: string;
  selectedIconBackground?: string;
  onClick?: () => void;
}

/** Shared subject tile for JUPEB and JAMB onboarding. */
export function OnboardingSubjectTile({
  icon,
  title,
  subtitle,
  variant = "choice",
  selected = false,
  selectedClassName = "border-primary bg-primary/10",
  selectedIconBackground = "hsl(var(--primary))",
  onClick,
}: OnboardingSubjectTileProps) {
  if (variant === "required" || variant === "unavailable") {
    return (
      <div
        className={cn(
          "relative flex items-center gap-2.5 rounded-xl border-2 p-3",
          variant === "required"
            ? "border-primary/40 bg-primary/5"
            : "border-dashed border-border bg-secondary/20 opacity-80",
        )}
        aria-disabled="true"
      >
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-colors duration-150",
        selected ? cn(selectedClassName, "border-2") : "border-border hover:border-primary/30",
      )}
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      {selected && (
        <motion.span
          initial={{ opacity: 0, transform: "scale(0.6)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="ms-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: selectedIconBackground }}
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </motion.span>
      )}
    </motion.button>
  );
}

export default OnboardingSubjectTile;
