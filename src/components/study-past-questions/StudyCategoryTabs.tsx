import { motion } from "framer-motion";
import { ClipboardList, FileText, FlaskConical } from "lucide-react";
import type { StudyCategory } from "@/types/study-questions";

const TABS: { key: StudyCategory; label: string; Icon: typeof ClipboardList }[] = [
  { key: "objective", label: "Objective", Icon: ClipboardList },
  { key: "theory", label: "Theory", Icon: FileText },
  { key: "practical", label: "Practical", Icon: FlaskConical },
];

interface StudyCategoryTabsProps {
  value: StudyCategory;
  onChange: (c: StudyCategory) => void;
  counts?: Record<StudyCategory, number>;
}

export function StudyCategoryTabs({ value, onChange, counts }: StudyCategoryTabsProps) {
  return (
    <div data-tour="pq-category-tabs" className="relative inline-flex items-center rounded-xl bg-muted p-1 w-full sm:w-auto overflow-x-auto">
      {TABS.map(({ key, label, Icon }) => {
        const isActive = value === key;
        const count = counts?.[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="relative flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 text-[13px] sm:text-sm font-medium rounded-lg transition-colors active:scale-[0.97] whitespace-nowrap"
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-accent"
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-1.5 sm:gap-2 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
              {count !== undefined && (
                <span className={`text-[11px] sm:text-xs tabular-nums ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
