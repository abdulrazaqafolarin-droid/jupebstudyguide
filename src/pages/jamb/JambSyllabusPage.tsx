import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, BarChart3, ChevronDown, CircleCheck, CircleDashed,
  ExternalLink, GraduationCap, PlayCircle, Search, ShieldAlert, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  JAMB_SYLLABUS,
  JAMB_SYLLABUS_REVIEW_NOTICE,
  JAMB_SYLLABUS_SUBJECTS,
  type JambSyllabusSubjectId,
} from "@/lib/jamb-syllabus";
import { useJambSyllabusProgress } from "@/hooks/useJambSyllabusProgress";
import type { JambSyllabusTopicState } from "@/lib/jamb-syllabus-progress";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";

const SUBJECT_ENTRIES = JAMB_SYLLABUS_SUBJECTS.map((id) => JAMB_SYLLABUS[id]);

const SUBJECT_META: Record<JambSyllabusSubjectId, { gradient: string; border: string }> = {
  physics: { gradient: "from-physics/10 to-physics/5", border: "border-physics/30" },
  chemistry: { gradient: "from-chemistry/10 to-chemistry/5", border: "border-chemistry/30" },
  biology: { gradient: "from-biology/10 to-biology/5", border: "border-biology/30" },
  math: { gradient: "from-math/10 to-math/5", border: "border-math/30" },
  use_of_english: { gradient: "from-primary/10 to-primary/5", border: "border-primary/30" },
};

const STATUS_LABEL: Record<JambSyllabusTopicState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_STYLE: Record<JambSyllabusTopicState, string> = {
  not_started: "bg-secondary text-muted-foreground border-border/50",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function JambSyllabusPage() {
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<JambSyllabusSubjectId | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { setTopicState, getTopicState, getSummary, isReady } = useJambSyllabusProgress();

  const allTopicIds = useMemo(
    () => SUBJECT_ENTRIES.flatMap((subject) =>
      subject.sections.flatMap((section) => section.topics.map((topic) => topic.id)),
    ),
    [],
  );
  const overall = getSummary(allTopicIds);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SUBJECT_ENTRIES;
    return SUBJECT_ENTRIES.filter((subject) =>
      subject.label.toLowerCase().includes(query) ||
      subject.description.toLowerCase().includes(query) ||
      subject.generalObjectives.some((objective) => objective.toLowerCase().includes(query)) ||
      subject.sections.some((section) =>
        section.title.toLowerCase().includes(query) ||
        section.topics.some((topic) =>
          topic.title.toLowerCase().includes(query) ||
          topic.outline.some((line) => line.toLowerCase().includes(query)) ||
          topic.objectives?.some((objective) => objective.toLowerCase().includes(query)),
        ),
      ),
    );
  }, [search]);

  const toggleTopic = (id: string) => {
    setExpandedTopics((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cycleTopicState = (id: string) => {
    const current = getTopicState(id);
    const next: JambSyllabusTopicState =
      current === "not_started" ? "in_progress" :
        current === "in_progress" ? "completed" : "not_started";
    setTopicState(id, next);
  };

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="JAMB Syllabus"
        subtitle={`${overall.completed}/${overall.total} topics complete · ${overall.percentage}%`}
        onBack={() => navigate(-1)}
        backLabel="Go back"
        icon={GraduationCap}
        compact
        animated
        wide
        rightContent={
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-xs font-bold text-primary tabular-nums">
            {overall.percentage}%
          </div>
        }
        footerContent={
          <div className="h-1 bg-secondary/70">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: overall.percentage + "%" }} />
          </div>
        }
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        <motion.section
          variants={itemAnim}
          initial="hidden"
          animate="show"
          className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-semibold">Syllabus source and version review</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Review pending
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{JAMB_SYLLABUS_REVIEW_NOTICE}</p>
              <a
                href="https://ibass.jamb.gov.ng/e-syllabus"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Check JAMB IBASS syllabus <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </motion.section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics, subjects, or subtopics..."
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
          {filteredSubjects.map((subject) => {
            const meta = SUBJECT_META[subject.id];
            const topics = subject.sections.flatMap((section) => section.topics);
            const topicIds = topics.map((topic) => topic.id);
            const summary = getSummary(topicIds);
            const isExpanded = expandedSubject === subject.id;

            return (
              <motion.div key={subject.id} variants={itemAnim} className="relative">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                  className={[
                    "w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm",
                    isExpanded
                      ? meta.gradient + " " + meta.border + " shadow-sm"
                      : "bg-card border-border/50 hover:border-border",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{subject.icon}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{subject.label}</h2>
                          {subject.compulsory && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              Compulsory
                            </span>
                          )}
                          {!subject.questionBankAvailable && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                              {subject.questionSourcePackAvailable ? "Source awaiting review" : "Question bank pending"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {topics.length} topics · {subject.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                        {summary.completed}/{summary.total} complete
                      </span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: summary.percentage + "%" }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{summary.percentage}%</span>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-4 pl-4">
                        <div className="rounded-xl border border-border/50 bg-card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-semibold">General objectives</h3>
                          </div>
                          <ul className="space-y-1.5">
                            {subject.generalObjectives.map((objective) => (
                              <li key={objective} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {subject.examinationStructure && (
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <h3 className="text-xs font-semibold text-primary">Examination structure in JAMB IBASS</h3>
                            <ul className="mt-2 space-y-1.5">
                              {subject.examinationStructure.map((item) => (
                                <li key={item} className="text-xs leading-relaxed text-muted-foreground">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {subject.sourceComparisonNote && (
                          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                            <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-300">Source comparison</h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subject.sourceComparisonNote}</p>
                          </div>
                        )}

                        {subject.sections.map((section) => (
                          <div key={section.id} className="space-y-2">
                            <h3 className="text-sm font-semibold border-b border-border/50 pb-2">{section.title}</h3>
                            {section.topics.map((topic, index) => {
                              const state = getTopicState(topic.id);
                              const topicOpen = expandedTopics.has(topic.id);
                              return (
                                <motion.div
                                  key={topic.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.02 }}
                                  className={[
                                    "rounded-xl border transition-all",
                                    topicOpen ? "bg-secondary/20 border-border/80" : "bg-card/50 border-border/30 hover:bg-secondary/10",
                                  ].join(" ")}
                                >
                                  <button
                                    type="button"
                                    aria-expanded={topicOpen}
                                    onClick={() => toggleTopic(topic.id)}
                                    className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{topic.number}. {topic.title}</span>
                                        <span className={"text-[10px] font-medium px-1.5 py-0.5 rounded-full border " + STATUS_STYLE[state]}>
                                          {STATUS_LABEL[state]}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                        {topic.outline[0] || "Topic outline"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                        {state === "completed" ? <CircleCheck className="w-3 h-3 text-emerald-500" /> :
                                          state === "in_progress" ? <PlayCircle className="w-3 h-3 text-primary" /> :
                                            <CircleDashed className="w-3 h-3" />}
                                        {topic.sourcePages.length ? "p. " + topic.sourcePages.join(", ") : "Topic"}
                                      </span>
                                      <ChevronDown className={"w-4 h-4 text-muted-foreground transition-transform duration-200 " + (topicOpen ? "rotate-180" : "")} />
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {topicOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-3.5 pb-3.5 space-y-3">
                                          <p className="text-sm text-muted-foreground">
                                            {topic.outline.join(" · ")}
                                          </p>
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                              <BarChart3 className="w-3 h-3" /> Topics / contents / notes:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {topic.outline.map((line) => (
                                                <span key={line} className="rounded-full bg-secondary/50 px-2 py-1 text-xs text-muted-foreground border border-border/30">
                                                  {line}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                          {topic.objectives && topic.objectives.length > 0 && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Candidates should be able to:</p>
                                              <ul className="space-y-1.5">
                                                {topic.objectives.map((objective) => (
                                                  <li key={objective} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                                    {objective}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              size="sm"
                                              variant={state === "completed" ? "outline" : "default"}
                                              onClick={() => cycleTopicState(topic.id)}
                                              disabled={!isReady}
                                            >
                                              {state === "not_started" ? "Start topic" : state === "in_progress" ? "Mark complete" : "Reopen topic"}
                                            </Button>
                                            <Button asChild size="sm" variant="outline">
                                              <Link to={"/jamb/ai?subject=" + subject.id + "&topic=" + topic.id}>
                                                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Study this topic with AI
                                              </Link>
                                            </Button>
                                            {subject.questionBankAvailable ? (
                                              <Button asChild size="sm" variant="ghost">
                                                <Link to={"/jamb/past-questions?subject=" + subject.id}>
                                                  <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Practice questions
                                                </Link>
                                              </Button>
                                            ) : (
                                              <span className="self-center text-[10px] text-muted-foreground">
                                                Practice bank not yet available for this subject.
                                              </span>
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
                        ))}

                        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                          {subject.officialSourceUrl && (
                            <a href={subject.officialSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                              Open JAMB-hosted IBASS PDF <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <a
                            href={"https://github.com/abdulrazaqafolarin-droid/jupebstudyguide/blob/feat/rutex-jamb-workspace/" + encodeURIComponent(subject.sourceFile)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Open uploaded source PDF <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[10px] text-muted-foreground">{subject.sourcePageCount} source pages · {subject.sourceFile}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No subjects match "{search}"</p>
            </div>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
