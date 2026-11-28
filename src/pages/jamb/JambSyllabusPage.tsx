import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, ExternalLink, GraduationCap, Search, ShieldAlert, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { SyllabusSubjectAccordion } from "@/components/syllabus/SyllabusSubjectAccordion";
import { SyllabusTopicAccordion } from "@/components/syllabus/SyllabusTopicAccordion";
import {
  JAMB_SYLLABUS,
  JAMB_SYLLABUS_REVIEW_NOTICE,
  JAMB_SYLLABUS_VERIFIED,
  JAMB_SYLLABUS_SUBJECTS,
  type JambSyllabusSubjectId,
} from "@/lib/jamb-syllabus";
import { useJambSyllabusProgress } from "@/hooks/useJambSyllabusProgress";
import type { JambSyllabusTopicState } from "@/lib/jamb-syllabus-progress";

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

const SUBJECT_ENTRIES = JAMB_SYLLABUS_SUBJECTS.map((id) => JAMB_SYLLABUS[id]);
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

export default function JambSyllabusPage() {
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<JambSyllabusSubjectId | null>(null);
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
        subtitle={`${overall.total} topics`}
        onBack={() => navigate("/jamb")}
        backLabel="Back to JAMB workspace"
        icon={GraduationCap}
        compact
        animated
        wide
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        {!JAMB_SYLLABUS_VERIFIED && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>{JAMB_SYLLABUS_REVIEW_NOTICE}</span>
            <a
              href="https://ibass.jamb.gov.ng/e-syllabus"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              IBASS <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

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
              <SyllabusSubjectAccordion
                key={subject.id}
                icon={subject.icon}
                title={subject.label}
                metadata={`${topics.length} topics · ${summary.completed}/${summary.total} complete`}
                trailing={<span className="text-[10px] tabular-nums text-muted-foreground">{summary.percentage}%</span>}
                badges={(
                  <>
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
                  </>
                )}
                expanded={isExpanded}
                onToggle={() => setExpandedSubject(isExpanded ? null : subject.id)}
                gradientClassName={meta.gradient}
                borderClassName={meta.border}
              >
                {subject.generalObjectives.length > 0 && (
                  <SyllabusTopicAccordion
                    id={subject.id + "-general-objectives"}
                    title="General objectives"
                    tag="Overview"
                    description=""
                    subtopics={subject.generalObjectives}
                    subtopicsHeading="Candidates should be able to:"
                  />
                )}

                {subject.examinationStructure && (
                  <SyllabusTopicAccordion
                    id={subject.id + "-exam-structure"}
                    title="Examination structure"
                    tag="Exam"
                    description=""
                    subtopics={subject.examinationStructure}
                    subtopicsHeading="Format:"
                  />
                )}

                {subject.sections.flatMap((section) =>
                  section.topics.map((topic) => ({ topic, sectionTitle: section.title })),
                ).map(({ topic, sectionTitle }) => {
                  const state = getTopicState(topic.id);
                  const outline = topic.outline.filter(Boolean);
                  const firstOutline = outline[0] ?? "";
                  return (
                    <SyllabusTopicAccordion
                      key={topic.id}
                      id={topic.id}
                      title={topic.number + ". " + topic.title}
                      tag={STATUS_LABEL[state]}
                      tagClassName={STATUS_STYLE[state]}
                      description={[sectionTitle, firstOutline].filter(Boolean).join(" · ")}
                      subtopics={outline.slice(1)}
                      subtopicsHeading="Contents:"
                      subtopicStyle="chips"
                      meta={topic.sourcePages.length > 0
                        ? <span>p. {topic.sourcePages.join(", ")}</span>
                        : undefined}
                      extraContent={topic.objectives && topic.objectives.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Objectives</p>
                          <ul className="space-y-1.5">
                            {topic.objectives.map((objective) => (
                              <li key={objective} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : undefined}
                      actionContent={(
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={state === "completed" ? "outline" : "default"}
                            onClick={() => cycleTopicState(topic.id)}
                            disabled={!isReady}
                          >
                            {state === "not_started" ? "Start topic" : state === "in_progress" ? "Mark complete" : "Reopen"}
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to={"/jamb/ai?subject=" + subject.id + "&topic=" + encodeURIComponent(topic.id)}>
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Tutor
                            </Link>
                          </Button>
                          {subject.questionBankAvailable && (
                            <Button asChild size="sm" variant="ghost">
                              <Link to={"/jamb/past-questions?subject=" + subject.id}>
                                <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Practice
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    />
                  );
                })}

                {subject.officialSourceUrl && (
                  <div className="border-t border-border/50 pt-3">
                    <a
                      href={subject.officialSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open JAMB IBASS PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </SyllabusSubjectAccordion>
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
