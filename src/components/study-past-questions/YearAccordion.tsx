import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import type { StudyCategory } from "@/types/study-questions";

const CATEGORY_LABELS: Record<StudyCategory, string> = {
  objective: "Obj",
  theory: "Theory",
  practical: "Practical",
};

const CATEGORY_COLORS: Record<StudyCategory, string> = {
  objective: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  theory: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  practical: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

interface YearAccordionProps {
  years: number[];
  counts: Record<number, number>;
  categoryCounts?: Record<number, Record<StudyCategory, number>>;
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
  onAnalyzeYear?: (year: number) => void;
  isAdmin?: boolean;
}

export function YearAccordion({ years, counts, categoryCounts, selectedYear, onSelectYear, onAnalyzeYear, isAdmin }: YearAccordionProps) {
  return (
    <div data-tour="pq-year-list" className="space-y-1.5">
      {years.map((year, i) => {
        const isOpen = selectedYear === year;
        const count = counts[year] ?? 0;
        const cats = categoryCounts?.[year];

        return (
          <motion.div
            key={year}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <button
              onClick={() => onSelectYear(isOpen ? null : year)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border hover:bg-accent/50 transition-colors active:scale-[0.97]"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{year}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} question{count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && onAnalyzeYear && count > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAnalyzeYear(year); }}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title={`Analyze all ${count} questions for ${year} with AI`}
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                )}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-3">
                    {cats && (
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(cats) as StudyCategory[]).filter((c) => (cats[c] ?? 0) > 0).map((cat) => (
                          <span
                            key={cat}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${CATEGORY_COLORS[cat]}`}
                          >
                            {CATEGORY_LABELS[cat]}: {cats[cat]}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectYear(year)}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
                      >
                        View Questions
                      </button>
                      {isAdmin && onAnalyzeYear && count > 0 && (
                        <button
                          onClick={() => onAnalyzeYear(year)}
                          className="px-4 py-2 text-xs font-medium rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors active:scale-[0.97] flex items-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Analyze {count} Questions
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
