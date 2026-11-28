import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Subject, SUBJECT_INFO } from "@/types/question";
import { ChevronRight } from "lucide-react";

export interface SubjectCardTone {
  card: string;
  glow: string;
  progress: string;
}

interface SubjectCardProps {
  subject: string;
  questionCount: number;
  studiedCount: number;
  learnedCount: number;
  onClick: () => void;
  infoOverride?: { name: string; icon: string };
  toneOverride?: SubjectCardTone;
  questionCountReady?: boolean;
  statsReady?: boolean;
}

const bouncySpring = { type: "spring" as const, stiffness: 400, damping: 10, mass: 0.7 };

const SUBJECT_TONES: Partial<Record<Subject, SubjectCardTone>> = {
  physics: {
    card: "border-physics/20 hover:border-physics/50 hover:bg-physics/[0.03]",
    glow: "bg-gradient-to-br from-physics/10 to-transparent",
    progress: "bg-gradient-to-r from-physics to-physics/70",
  },
  chemistry: {
    card: "border-chemistry/20 hover:border-chemistry/50 hover:bg-chemistry/[0.03]",
    glow: "bg-gradient-to-br from-chemistry/10 to-transparent",
    progress: "bg-gradient-to-r from-chemistry to-chemistry/70",
  },
  biology: {
    card: "border-biology/20 hover:border-biology/50 hover:bg-biology/[0.03]",
    glow: "bg-gradient-to-br from-biology/10 to-transparent",
    progress: "bg-gradient-to-r from-biology to-biology/70",
  },
  math: {
    card: "border-math/20 hover:border-math/50 hover:bg-math/[0.03]",
    glow: "bg-gradient-to-br from-math/10 to-transparent",
    progress: "bg-gradient-to-r from-math to-math/70",
  },
};

const DEFAULT_TONE: SubjectCardTone = {
  card: "border-primary/20 hover:border-primary/50 hover:bg-primary/[0.03]",
  glow: "bg-gradient-to-br from-primary/10 to-transparent",
  progress: "bg-gradient-to-r from-primary to-primary/70",
};

/** Shared animated subject card. JAMB supplies its own label and colour accent. */
export const SubjectCard = ({
  subject,
  questionCount,
  studiedCount,
  learnedCount,
  onClick,
  infoOverride,
  toneOverride,
  questionCountReady = true,
  statsReady = true,
}: SubjectCardProps) => {
  const info = infoOverride ?? SUBJECT_INFO[subject as Subject];
  const tone = toneOverride ?? SUBJECT_TONES[subject as Subject] ?? DEFAULT_TONE;
  const progressPercent = questionCount > 0 ? (learnedCount / questionCount) * 100 : 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="w-full text-left group"
      whileHover={{ y: -10, scale: 1.02, transition: bouncySpring }}
      whileTap={{ scale: 0.96, transition: bouncySpring }}
    >
      <div className={cn(
        "bg-card rounded-2xl border p-6 chalk-texture relative overflow-hidden",
        tone.card,
      )}>
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          tone.glow,
        )} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ x: 4, transition: { type: "spring", stiffness: 300 } }}
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110 inline-block">
                {info.icon}
              </span>
              <div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-200">{info.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {questionCountReady ? `${questionCount.toLocaleString()} questions` : "Loading…"}
                </p>
              </div>
            </motion.div>
            <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mastery</span>
              <span className="font-medium text-primary">
                {statsReady ? `${learnedCount}/${questionCount}` : "—"}
              </span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", tone.progress)}
                initial={{ width: 0 }}
                whileInView={{ width: `${progressPercent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>

          <motion.div
            className="flex gap-4 mt-4 text-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="bg-secondary/40 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Studied </span>
              <span className="font-medium text-foreground">{statsReady ? studiedCount : "—"}</span>
            </div>
            <div className="bg-accent/10 rounded-lg px-2.5 py-1">
              <span className="text-muted-foreground">Mastered </span>
              <span className="font-medium text-accent">{statsReady ? learnedCount : "—"}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
};
