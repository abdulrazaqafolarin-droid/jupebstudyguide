import { motion } from "framer-motion";
import { Play } from "lucide-react";

import type { Subject } from "@/types/question";
import { STUDY_SUBJECT_INFO } from "@/types/study-questions";

interface SubjectCardGridProps {
  onSelect: (subject: Subject) => void;
  counts?: Record<Subject, number>;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
};

export function SubjectCardGrid({ onSelect, counts }: SubjectCardGridProps) {
  const subjects = Object.keys(STUDY_SUBJECT_INFO) as Subject[];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
    >
      {subjects.map((subject) => {
        const info = STUDY_SUBJECT_INFO[subject];
        const count = counts?.[subject];

        return (
          <motion.button
            key={subject}
            variants={item}
            whileHover={{
              y: -4,
              transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
            }}
            onClick={() => onSelect(subject)}
            className="relative group flex flex-col items-start p-4 sm:p-5 rounded-2xl border bg-card text-left hover:shadow-lg hover:shadow-black/5 transition-shadow active:scale-[0.97]"
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${info.gradient} opacity-[0.08]`} />
            <span className="text-2xl sm:text-3xl mb-2 sm:mb-3">{info.icon}</span>
            <h3 className="font-semibold text-sm sm:text-base">{subject.charAt(0).toUpperCase() + subject.slice(1)}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{info.description}</p>
            {count !== undefined && (
              <span className="text-[11px] sm:text-xs text-muted-foreground/60 mt-2 tabular-nums">
                {count} question{count !== 1 ? "s" : ""}
              </span>
            )}
            <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-3 w-3 fill-primary" />
              <span>Start</span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
