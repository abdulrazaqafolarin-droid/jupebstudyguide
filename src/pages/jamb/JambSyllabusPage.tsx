import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, BookOpenCheck, ChevronDown, ExternalLink,
  GraduationCap, Search, ShieldAlert, Sparkles, CircleCheck, CircleDashed,
  PlayCircle,
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

const SUBJECT_ENTRIES = JAMB_SYLLABUS_SUBJECTS.map((id) => JAMB_SYLLABUS[id]);
const STATUS_LABEL: Record<JambSyllabusTopicState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.035 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function JambSyllabusPage() {
  const [expandedSubject, setExpandedSubject] = useState<JambSyllabusSubjectId | null>("use_of_english");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { setTopicState, getTopicState, getSummary, isReady } = useJambSyllabusProgress();

  const allTopicIds = SUBJECT_ENTRIES.flatMap((subject) =>
    subject.sections.flatMap((section) => section.topics.map((topic) => topic.id)),
  );
  const overall = getSummary(allTopicIds);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SUBJECT_ENTRIES;
    return SUBJECT_ENTRIES.filter((subject) => (
      subject.label.toLowerCase().includes(query)
      || subject.description.toLowerCase().includes(query)
      || subject.generalObjectives.some((objective) => objective.toLowerCase().includes(query))
      || subject.sections.some((section) => (
        section.title.toLowerCase().includes(query)
        || section.topics.some((topic) => (
          topic.title.toLowerCase().includes(query)
          || topic.outline.some((line) => line.toLowerCase().includes(query))
        ))
      ))
    ));
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
      current === "not_started" ? "in_progress"
        : current === "in_progress" ? "completed" : "not_started";
    setTopicState(id, next);
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-sm font-semibold">Syllabus</h1>
          </div>
        </div>
      </motion.header>

      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl space-y-6 px-4 py-6"
      >
        <motion.section variants={itemAnim} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BookOpenCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Your subject coverage</h2>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  Source review pending
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                The five syllabus PDFs you committed are organised into subject sections and trackable topics. Where a JAMB-hosted IBASS PDF was available, its source link is shown separately. Your topic progress is saved separately from JUPEB.
              </p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Overall completed topics</span>
                <span className="font-semibold tabular-nums">{overall.completed}/{overall.total} · {overall.percentage}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: overall.percentage + "%" }} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {isReady ? "Progress is ready on this account." : "Loading your saved syllabus progress…"}
                {" "}Progress is saved per account and syncs to the cloud when online. If offline, changes remain on this device and retry on reconnect.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemAnim} className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold">Syllabus source and version review</h2>
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
        </motion.section>

        <motion.div variants={itemAnim} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search subjects, topics or subtopics…"
            className="border-border/50 bg-secondary/30 pl-9"
          />
        </motion.div>

        <motion.div variants={stagger} className="space-y-4">
          {filteredSubjects.map((subject) => {
            const expanded = expandedSubject === subject.id;
            const topicIds = subject.sections.flatMap((section) => section.topics.map((topic) => topic.id));
            const summary = getSummary(topicIds);
            return (
              <motion.section key={subject.id} variants={itemAnim} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setExpandedSubject(expanded ? null : subject.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/30"
                >
                  <span className="text-2xl">{subject.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{subject.label}</span>
                      {subject.compulsory && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Compulsory</span>
                      )}
                      {!subject.questionBankAvailable && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{subject.questionSourcePackAvailable ? "Candidate question source awaits review" : "Question bank pending"}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{topicIds.length} topics · {subject.description}</span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span className="block h-full rounded-full bg-primary" style={{ width: summary.percentage + "%" }} />
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{summary.completed}/{summary.total} complete</span>
                    </span>
                  </span>
                  <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 border-t border-border/60 p-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General objectives</h3>
                          <ul className="mt-2 space-y-1.5">
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
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Examination structure in JAMB IBASS</h3>
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
                            <h3 className="border-b border-border/60 pb-2 text-sm font-semibold">{section.title}</h3>
                            {section.topics.map((topic) => {
                              const topicState = getTopicState(topic.id);
                              const topicExpanded = expandedTopics.has(topic.id);
                              return (
                                <article key={topic.id} className="rounded-xl border border-border/60 bg-background/50">
                                  <button
                                    type="button"
                                    onClick={() => toggleTopic(topic.id)}
                                    aria-expanded={topicExpanded}
                                    className="flex w-full items-center gap-3 p-3 text-left"
                                  >
                                    {topicState === "completed" ? (
                                      <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                    ) : topicState === "in_progress" ? (
                                      <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                      <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-medium">{topic.number}. {topic.title}</span>
                                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{STATUS_LABEL[topicState]} · {subject.sourcePageLabel ?? "Uploaded PDF pages"} {topic.sourcePages.join(", ")}</span>
                                    </span>
                                    <ChevronDown className={"h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (topicExpanded ? "rotate-180" : "")} />
                                  </button>
                                  <AnimatePresence>
                                    {topicExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
                                          <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Topics / contents / notes</p>
                                            <ul className="mt-1.5 space-y-1">
                                              {topic.outline.map((line) => (
                                                <li key={line} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                                                  {line}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          {topic.objectives && topic.objectives.length > 0 && (
                                            <div>
                                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Candidates should be able to</p>
                                              <ul className="mt-1.5 space-y-1">
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
                                              variant={topicState === "completed" ? "outline" : "default"}
                                              onClick={() => cycleTopicState(topic.id)}
                                              disabled={!isReady}
                                            >
                                              {topicState === "not_started" ? "Start topic" : topicState === "in_progress" ? "Mark complete" : "Reopen topic"}
                                            </Button>
                                            <Button asChild size="sm" variant="outline">
                                              <Link to={"/jamb/ai?subject=" + subject.id + "&topic=" + topic.id}>
                                                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Study with JAMB Tutor
                                              </Link>
                                            </Button>
                                            {subject.questionBankAvailable ? (
                                              <Button asChild size="sm" variant="ghost">
                                                <Link to={"/jamb/past-questions?subject=" + subject.id}>
                                                  <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Practice questions
                                                </Link>
                                              </Button>
                                            ) : (
                                              <span className="self-center text-[10px] text-muted-foreground">Practice bank not yet available for this subject.</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground">
                                            This is a topic outline transcribed from the uploaded source copy, not yet a verified current syllabus entry.
                                          </p>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </article>
                              );
                            })}
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                          {subject.officialSourceUrl && (
                            <a
                              href={subject.officialSourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              Open JAMB-hosted IBASS PDF <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <a
                            href={"https://github.com/abdulrazaqafolarin-droid/jupebstudyguide/blob/main/" + encodeURIComponent(subject.sourceFile)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Open uploaded source PDF <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="text-[10px] text-muted-foreground">Uploaded-source uploaded PDF SHA-256 recorded · {subject.sourcePageCount} pages{subject.officialSourceCheckedAt ? " · IBASS checked " + subject.officialSourceCheckedAt : ""}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No syllabus topics match “{search}”.</p>
            </div>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
