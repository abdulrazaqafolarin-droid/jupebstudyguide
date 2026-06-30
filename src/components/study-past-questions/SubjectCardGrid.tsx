import { motion } from "framer-motion";

import type { Subject } from "@/types/question";
import { STUDY_SUBJECT_INFO } from "@/types/study-questions";

interface SubjectCardGridProps {
  onSelect: (subject: Subject) => void;
  counts?: Record<Subject, number>;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
};

const SUBJECT_COLORS: Record<Subject, { gradient: string; light: string; accent: string }> = {
  physics: { gradient: "from-blue-600/40 to-cyan-400/40", light: "bg-blue-500/10", accent: "border-blue-500/30" },
  chemistry: { gradient: "from-emerald-600/40 to-teal-400/40", light: "bg-emerald-500/10", accent: "border-emerald-500/30" },
  biology: { gradient: "from-green-600/40 to-lime-400/40", light: "bg-green-500/10", accent: "border-green-500/30" },
  math: { gradient: "from-purple-600/40 to-pink-400/40", light: "bg-purple-500/10", accent: "border-purple-500/30" },
};

export function SubjectCardGrid({ onSelect, counts }: SubjectCardGridProps) {
  const subjects = Object.keys(STUDY_SUBJECT_INFO) as Subject[];

  return (
    <motion.div
      data-tour="pq-subject-tabs"
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {subjects.map((subject) => {
        const info = STUDY_SUBJECT_INFO[subject];
        const count = counts?.[subject];
        const colors = SUBJECT_COLORS[subject] ?? { gradient: "", light: "", accent: "" };

        return (
          <motion.button
            key={subject}
            variants={item}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(subject)}
            className="relative group flex flex-col items-start p-5 rounded-2xl border border-border/60 bg-card text-left overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
            <div className={`absolute inset-0 ${colors.light} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${colors.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-xl ${colors.light} flex items-center justify-center text-2xl mb-3 border ${colors.accent}`}>
                {info.icon}
              </div>
              <h3 className="font-semibold text-base">{subject.charAt(0).toUpperCase() + subject.slice(1)}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{info.description}</p>
              {count !== undefined && (
                <span className="text-xs text-muted-foreground/60 mt-3 block tabular-nums">
                  {count} question{count !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="relative z-10 mt-4 w-full flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 1.5v9l7-4.5-7-4.5z" fill="currentColor" />
                </svg>
                Start Practice
              </span>
              <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                {count ? `${Math.ceil(count / 10)} min` : "—"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
