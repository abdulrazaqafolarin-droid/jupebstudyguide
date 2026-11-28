import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionMath from "@/components/QuestionMath";
import { cn } from "@/lib/utils";

interface SyllabusTopicAccordionProps {
  id: string;
  title: string;
  tag: string;
  tagClassName?: string;
  description: string;
  subtopics: string[];
  meta?: ReactNode;
  subtopicsHeading?: string;
  subtopicStyle?: "list" | "chips";
  extraContent?: ReactNode;
  actionContent?: ReactNode;
  actionLabel?: string;
  onStart?: () => void;
}

/** Shared JUPEB/JAMB topic disclosure, metadata, motion and action layout. */
export function SyllabusTopicAccordion({
  id,
  title,
  tag,
  tagClassName,
  description,
  subtopics,
  meta,
  subtopicsHeading = "Subtopics:",
  subtopicStyle = "list",
  extraContent,
  actionContent,
  actionLabel = "Start Learning This Topic",
  onStart,
}: SyllabusTopicAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div key={id} className="rounded-xl border border-border/50 bg-card/50 transition-all hover:bg-secondary/10">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20",
              tagClassName,
            )}>
              {tag}
            </span>
            <span className="font-medium text-sm"><QuestionMath inline content={title} /></span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              <QuestionMath inline content={description} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">{meta}</span>}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/50">
          {description && (
            <p className="pt-3 text-sm text-muted-foreground">
              <QuestionMath inline content={description} />
            </p>
          )}
          {actionContent}
          {subtopics.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{subtopicsHeading}</h4>
              {subtopicStyle === "chips" ? (
                <div className="flex flex-wrap gap-1.5">
                  {subtopics.map((subtopic, index) => (
                    <span key={index} className="rounded-full bg-secondary/50 px-2 py-1 text-xs text-muted-foreground border border-border/30">
                      <QuestionMath inline content={subtopic} />
                    </span>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {subtopics.map((subtopic, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <QuestionMath inline content={subtopic} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {extraContent}
          {!actionContent && (
            <Button
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={onStart}
            >
              <PlayCircle className="w-5 h-5" />
              {actionLabel}
            </Button>
          )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SyllabusTopicAccordion;
