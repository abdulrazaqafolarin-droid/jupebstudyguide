import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StudyFlashcardSurfaceProps {
  children: ReactNode;
  tone?: "question" | "answer";
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}

/** Shared chalk-textured flashcard surface for the JUPEB and JAMB study flows. */
export function StudyFlashcardSurface({
  children,
  tone = "question",
  className,
  contentClassName,
  ariaLabel,
}: StudyFlashcardSurfaceProps) {
  const isAnswer = tone === "answer";

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "flashcard-face relative w-full overflow-hidden rounded-2xl border-2 shadow-xl",
        isAnswer ? "border-accent/30" : "border-border",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-card via-card",
          isAnswer ? "to-accent/10" : "to-secondary/30",
        )}
      />
      <div className="absolute inset-0 chalk-texture opacity-30" />
      <div className={cn("relative h-full p-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
