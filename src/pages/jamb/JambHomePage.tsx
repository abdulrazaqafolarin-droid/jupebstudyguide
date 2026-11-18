import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, type Variants, type Transition } from "framer-motion";
import {
  ArrowRight, BookOpen, Brain, Bookmark, Bot, CalendarDays, Clock3,
  FileQuestion, GraduationCap, Library, Search, ShieldAlert, Sparkles, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";
import { useJambBookmarks } from "@/hooks/useJambBookmarks";
import { useJambPracticeProgress } from "@/hooks/useJambPracticeProgress";
import {
  JAMB_SUBJECT_INFO, JAMB_SUBJECTS, JAMB_TARGET_EXAM_YEAR,
} from "@/lib/jamb-config";
import {
  getJambSubjectSummaries, JambSchemaUnavailableError,
  type JambSubjectSummary,
} from "@/lib/jamb-question-service";

const springBounce: Transition = { type: "spring", stiffness: 300, damping: 12, mass: 0.8 };
const fastSpring: Transition = { type: "spring", stiffness: 400, damping: 15, mass: 0.6 };
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: springBounce },
};

function JambSubjectCard({
  subject,
  summary,
  onClick,
}: {
  subject: (typeof JAMB_SUBJECTS)[number];
  summary?: JambSubjectSummary;
  onClick: () => void;
}) {
  const info = JAMB_SUBJECT_INFO[subject];
  const count = summary?.count ?? 0;

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left group"
      whileHover={{ y: -10, scale: 1.02, transition: fastSpring }}
      whileTap={{ scale: 0.96, transition: fastSpring }}
    >
      <div className="bg-card rounded-2xl border border-border p-6 chalk-texture relative overflow-hidden transition-colors hover:border-primary/40">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ x: 4, transition: { type: "spring", stiffness: 300 } }}
            >
              <span className="text-3xl inline-block transition-transform duration-300 group-hover:scale-110">{info.icon}</span>
              <div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-200">{info.label}</h3>
                <p className="text-sm text-muted-foreground">{loadingText(summary)}</p>
              </div>
            </motion.div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed min-h-10">{info.description}</p>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/70 text-xs">
            <span className="text-muted-foreground">Available years</span>
            <span className="font-semibold text-primary tabular-nums">
              {summary ? (summary.years.length ? summary.years.join(" · ") : "Awaiting reviewed content") : "Loading…"}
            </span>
          </div>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {count.toLocaleString()} published practice questions
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function loadingText(summary?: JambSubjectSummary) {
  return summary ? `${summary.count.toLocaleString()} questions` : "Question bank";
}

export default function JambHomePage() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<JambSubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedAnswers, isReady: progressReady } = useJambPracticeProgress();
  const { bookmarks, isReady: bookmarksReady } = useJambBookmarks();

  useEffect(() => {
    let active = true;
    getJambSubjectSummaries()
      .then((rows) => { if (active) setSummaries(rows); })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof JambSchemaUnavailableError
          ? "The JAMB question-bank tables are not available yet. Your JAMB workspace remains separate from JUPEB."
          : reason instanceof Error ? reason.message : "Could not load JAMB question coverage.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalQuestions = summaries.reduce((total, row) => total + row.count, 0);
  const totalAnswered = Object.keys(savedAnswers).length;
  const totalBookmarked = bookmarks.length;
  const practicePercent = totalQuestions > 0
    ? Math.min(100, Math.round((totalAnswered / totalQuestions) * 100))
    : 0;
  const availableYears = useMemo(
    () => [...new Set(summaries.flatMap((row) => row.years))].sort((a, b) => b - a),
    [summaries],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — shares the JUPEB dashboard's visual language and proportions. */}
      <header className="relative overflow-hidden min-h-[60vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10 animate-mesh bg-[length:200%_200%]" style={{ willChange: "transform" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        <div className="absolute inset-0 chalk-texture opacity-30" style={{ willChange: "transform" }} />
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" style={{ willChange: "transform" }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float" style={{ willChange: "transform", animationDelay: "-3s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative w-full max-w-4xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6 animate-in-up stagger-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Target className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {progressReady ? totalAnswered.toLocaleString() : "—"} JAMB answers saved
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-in-up stagger-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">JAMB UTME Past Questions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-[1.1] animate-in-up stagger-3">
              Master Your Exams with
              <span className="text-gradient-gold block mt-2">Focused Practice</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in-up stagger-4">
              Study Physics, Chemistry and Biology with structured past-question practice,
              timed CBT sessions and a JAMB-aware AI tutor. Your JAMB practice stays separate from JUPEB.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-in-up stagger-5">
              <Button
                size="lg"
                onClick={() => navigate("/jamb/past-questions")}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 glow-gold shadow-lg shadow-primary/25"
              >
                <CalendarDays className="w-5 h-5 mr-2" />
                Explore JAMB Questions
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/jamb/cbt/setup")}
                className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Target className="w-5 h-5 mr-2" />
                CBT Practice
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/jamb/ai")}
                className="border-accent/40 text-accent hover:bg-accent/10 hover:border-accent hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Bot className="w-5 h-5 mr-2" />
                AI Study Tutor
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-12">
        {error && (
          <section className="mb-6 animate-in-up">
            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">JAMB question bank</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* Programme-specific progress — never reads JUPEB mastery or streak data. */}
        <section className="mb-12 animate-in-up stagger-1">
          <div className="relative bg-card rounded-2xl border border-border p-6 md:p-8 chalk-texture overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <ProgressRing progress={practicePercent} size={140} strokeWidth={10}>
                <div className="text-center">
                  <span className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{practicePercent}%</span>
                  <p className="text-xs text-muted-foreground">Practised</p>
                </div>
              </ProgressRing>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/10">
                  <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-primary tabular-nums">{loading ? "—" : totalQuestions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Published Questions</p>
                </div>
                <div className="bg-gradient-to-br from-physics/10 to-physics/5 rounded-xl p-4 text-center border border-physics/10">
                  <Brain className="w-6 h-6 mx-auto mb-2 text-physics" />
                  <p className="text-2xl font-bold text-physics tabular-nums">{progressReady ? totalAnswered.toLocaleString() : "—"}</p>
                  <p className="text-xs text-muted-foreground">Answers Saved</p>
                </div>
                <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 text-center border border-accent/10">
                  <Bookmark className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-accent tabular-nums">{bookmarksReady ? totalBookmarked.toLocaleString() : "—"}</p>
                  <p className="text-xs text-muted-foreground">Bookmarks</p>
                </div>
                <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-4 text-center border border-destructive/10">
                  <Library className="w-6 h-6 mx-auto mb-2 text-destructive" />
                  <p className="text-2xl font-bold text-destructive tabular-nums">{availableYears.length}</p>
                  <p className="text-xs text-muted-foreground">Available Years</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The two large action panels mirror the JUPEB dashboard's activity row. */}
        <section className="mb-12 grid gap-4 md:grid-cols-2 animate-in-up stagger-2">
          <Link to="/jamb/cbt/setup" className="group bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Clock3 className="w-6 h-6 text-primary" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">Timed CBT practice</p><p className="text-xs text-muted-foreground mt-0.5">Build speed with focused subject drills</p></div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Choose a subject, set a practice length and work against a server-controlled timer.</p>
          </Link>
          <Link to="/jamb/ai" className="group bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center"><Sparkles className="w-6 h-6 text-accent" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold">JAMB AI study tutor</p><p className="text-xs text-muted-foreground mt-0.5">Understand difficult concepts step by step</p></div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Ask subject questions or open the tutor directly from a past question for contextual help.</p>
          </Link>
        </section>

        {/* Subject cards preserve the JUPEB card treatment with JAMB-only content. */}
        <section className="animate-in-up stagger-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Subjects</h2>
            <motion.span
              className="text-sm text-muted-foreground inline-flex items-center gap-1"
              key={totalQuestions}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <span className="tabular-nums font-semibold text-foreground">{loading ? "—" : totalQuestions.toLocaleString()}</span>
              <span>questions total</span>
            </motion.span>
          </div>
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {JAMB_SUBJECTS.map((subject) => (
              <motion.div key={subject} variants={cardVariants}>
                <JambSubjectCard
                  subject={subject}
                  summary={summaries.find((row) => row.subject === subject)}
                  onClick={() => navigate(`/jamb/past-questions?subject=${subject}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Quick Actions follow the JUPEB dashboard's card grid and interaction pattern. */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {JAMB_SUBJECTS.map((subject) => {
              const info = JAMB_SUBJECT_INFO[subject];
              return (
                <motion.button
                  key={subject}
                  onClick={() => navigate(`/jamb/past-questions?subject=${subject}`)}
                  className="p-4 rounded-xl border border-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:bg-primary/5"
                  variants={cardVariants}
                  whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
                  whileTap={{ scale: 0.95, transition: fastSpring }}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <p className="font-medium mt-2">{info.label} Practice</p>
                  <p className="text-xs text-muted-foreground">{summaries.find((row) => row.subject === subject)?.count ?? 0} published questions</p>
                </motion.button>
              );
            })}
            <motion.button
              onClick={() => navigate("/jamb/cbt/setup")}
              className="p-4 rounded-xl border border-accent/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent hover:bg-accent/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <Clock3 className="w-7 h-7 mx-auto text-accent" />
              <p className="font-medium mt-2">Timed CBT</p>
              <p className="text-xs text-muted-foreground">10, 20 or 40-question drills</p>
            </motion.button>
            <motion.button
              onClick={() => navigate("/jamb/ai")}
              className="p-4 rounded-xl border border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary hover:bg-primary/5"
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -4, transition: fastSpring }}
              whileTap={{ scale: 0.95, transition: fastSpring }}
            >
              <Bot className="w-7 h-7 mx-auto text-primary" />
              <p className="font-medium mt-2">Ask AI Tutor</p>
              <p className="text-xs text-muted-foreground">Get a clear explanation</p>
            </motion.button>
          </motion.div>
        </section>

        <section className="mt-12 bg-card rounded-2xl border border-border p-6 chalk-texture">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Study Tips
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">1.</span><span><strong>Practise consistently</strong> — short daily sessions are easier to sustain than last-minute cramming.</span></li>
            <li className="flex gap-2"><span className="text-primary">2.</span><span><strong>Review saved answers</strong> — revisit questions you found difficult instead of only moving forward.</span></li>
            <li className="flex gap-2"><span className="text-primary">3.</span><span><strong>Use the timer deliberately</strong> — practise pacing without confusing a short drill with a full official mock.</span></li>
            <li className="flex gap-2"><span className="text-primary">4.</span><span><strong>Check verified keys</strong> — unreviewed questions remain ungraded; do not treat an AI guess as an official answer.</span></li>
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">About full UTME mock exams</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The current supplied pack covers Physics, Chemistry and Biology. Use of English is compulsory in UTME,
                so these subject drills are not presented as a complete official-format mock. Syllabus and full-mock
                settings stay disabled until their official source material is verified.
              </p>
              <Link to="/jamb/syllabus" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary hover:underline">
                Check syllabus status <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="flex flex-col items-center gap-3">
          <GraduationCap className="w-9 h-9 text-primary" />
          <p className="text-xs text-muted-foreground">Built by <span className="font-semibold text-foreground">Rutex</span></p>
          <p className="text-xs text-muted-foreground">JAMB UTME Preparation · {JAMB_TARGET_EXAM_YEAR}</p>
        </div>
      </footer>
    </div>
  );
}
