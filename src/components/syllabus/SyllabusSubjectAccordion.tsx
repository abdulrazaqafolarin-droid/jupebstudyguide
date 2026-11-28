import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyllabusSubjectAccordionProps {
  icon: string;
  title: string;
  metadata: string;
  expanded: boolean;
  onToggle: () => void;
  gradientClassName: string;
  borderClassName: string;
  badges?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}

/** Shared subject-level accordion used by both programme syllabus browsers. */
export function SyllabusSubjectAccordion({
  icon,
  title,
  metadata,
  expanded,
  onToggle,
  gradientClassName,
  borderClassName,
  badges,
  trailing,
  children,
}: SyllabusSubjectAccordionProps) {
  return (
    <motion.div className="relative">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          "w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm",
          expanded
            ? `${gradientClassName} ${borderClassName} shadow-sm`
            : "bg-card border-border/50 hover:border-border",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold">{title}</h2>
                {badges}
              </div>
              <p className="text-xs text-muted-foreground">{metadata}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {trailing}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 pl-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SyllabusSubjectAccordion;
