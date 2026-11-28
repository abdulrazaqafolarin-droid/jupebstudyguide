import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, GraduationCap, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { SyllabusSubjectAccordion } from "@/components/syllabus/SyllabusSubjectAccordion";
import { SyllabusTopicAccordion } from "@/components/syllabus/SyllabusTopicAccordion";
import { Input } from "@/components/ui/input";
import { SYLLABUSES } from "@/types/syllabus";
import type { Subject } from "@/types/question";

const SUBJECT_META: Record<Subject, { label: string; icon: string; gradient: string; border: string }> = {
  physics: { label: "Physics", icon: "⚛️", gradient: "from-physics/10 to-physics/5", border: "border-physics/30" },
  chemistry: { label: "Chemistry", icon: "🔬", gradient: "from-chemistry/10 to-chemistry/5", border: "border-chemistry/30" },
  biology: { label: "Biology", icon: "🧬", gradient: "from-biology/10 to-biology/5", border: "border-biology/30" },
  math: { label: "Mathematics", icon: "📐", gradient: "from-math/10 to-math/5", border: "border-math/30" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  intermediate: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  advanced: "text-rose-500 bg-rose-500/10 border-rose-500/20",
};

const SUBJECTS = Object.keys(SYLLABUSES) as Subject[];
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

export default function SyllabusPage() {
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return SUBJECTS;
    const query = search.toLowerCase();
    return SUBJECTS.filter((subject) => {
      const topics = SYLLABUSES[subject];
      return subject.includes(query) ||
        SUBJECT_META[subject].label.toLowerCase().includes(query) ||
        topics.some((topic) =>
          topic.name.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.subtopics.some((subtopic) => subtopic.toLowerCase().includes(query)),
        );
    });
  }, [search]);

  const totalTopics = SUBJECTS.reduce((sum, subject) => sum + SYLLABUSES[subject].length, 0);
  const totalHours = SUBJECTS.reduce((sum, subject) =>
    sum + SYLLABUSES[subject].reduce((hours, topic) => hours + topic.estimatedHours, 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="JUPEB Syllabus"
        onBack={() => navigate(-1)}
        backLabel="Back to JUPEB workspace"
        icon={GraduationCap}
        subtitle={`${totalTopics} topics | ~${totalHours}h`}
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
            const meta = SUBJECT_META[subject];
            const topics = SYLLABUSES[subject];
            const isExpanded = expandedSubject === subject;
            const subjectHours = topics.reduce((sum, topic) => sum + topic.estimatedHours, 0);
            const difficultySummary = ["beginner", "intermediate", "advanced"]
              .map((difficulty) => {
                const count = topics.filter((topic) => topic.difficulty === difficulty).length;
                return count ? `${count} ${difficulty}` : null;
              })
              .filter(Boolean)
              .join(", ");

            return (
              <SyllabusSubjectAccordion
                key={subject}
                icon={meta.icon}
                title={meta.label}
                metadata={`${topics.length} topics | ~${subjectHours}h | ${difficultySummary}`}
                expanded={isExpanded}
                onToggle={() => setExpandedSubject(isExpanded ? null : subject)}
                gradientClassName={meta.gradient}
                borderClassName={meta.border}
              >
                {topics.map((topic) => (
                  <SyllabusTopicAccordion
                    key={topic.name}
                    id={topic.name}
                    title={topic.name}
                    tag={topic.difficulty}
                    tagClassName={DIFFICULTY_COLORS[topic.difficulty]}
                    description={topic.description}
                    subtopics={topic.subtopics}
                    subtopicStyle="chips"
                    meta={<><Clock className="w-3 h-3" /> {topic.estimatedHours}h</>}
                    actionContent={(
                      <button
                        type="button"
                        onClick={() => navigate(`/study-chat?topic=${encodeURIComponent(topic.id)}&subject=${subject}`)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Study this topic with AI
                      </button>
                    )}
                    onSubtopicClick={(subtopic) => navigate(`/study-chat?topic=${encodeURIComponent(topic.id)}&subject=${subject}&sub=${encodeURIComponent(subtopic)}`)}
                  />
                ))}
              </SyllabusSubjectAccordion>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No subjects match "{search}"</p>
            </div>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
