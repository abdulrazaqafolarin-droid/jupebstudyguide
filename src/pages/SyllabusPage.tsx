import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Clock, BarChart3, GraduationCap, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SYLLABUSES } from '@/types/syllabus';
import type { Subject } from '@/types/question';
import { Input } from '@/components/ui/input';

const SUBJECT_META: Record<Subject, { label: string; icon: string; gradient: string; border: string }> = {
  physics: { label: 'Physics', icon: '\u269B\uFE0F', gradient: 'from-physics/10 to-physics/5', border: 'border-physics/30' },
  chemistry: { label: 'Chemistry', icon: '\u{1F52A}', gradient: 'from-chemistry/10 to-chemistry/5', border: 'border-chemistry/30' },
  biology: { label: 'Biology', icon: '\u{1F9EC}', gradient: 'from-biology/10 to-biology/5', border: 'border-biology/30' },
  math: { label: 'Mathematics', icon: '\u{1F4D0}', gradient: 'from-math/10 to-math/5', border: 'border-math/30' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function SyllabusPage() {
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<Subject | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const subjects = useMemo(() => Object.keys(SYLLABUSES) as Subject[], []);

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(subj => {
      const topics = SYLLABUSES[subj];
      return subj.includes(q) ||
        SUBJECT_META[subj]?.label.toLowerCase().includes(q) ||
        topics?.some(t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.subtopics.some(s => s.toLowerCase().includes(q))
        );
    });
  }, [search, subjects]);

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalTopics = subjects.reduce((sum, s) => sum + SYLLABUSES[s].length, 0);
  const totalHours = subjects.reduce((sum, s) =>
    sum + SYLLABUSES[s].reduce((h, t) => h + t.estimatedHours, 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 relative">
          <motion.button
            whileHover={{ x: -3 }}
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold heading text-sm">JUPEB Syllabus</h1>
              <p className="text-[11px] text-muted-foreground">{totalTopics} topics | ~{totalHours}h</p>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        {/* Search */}
        <div data-tour="syllabus-search" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search topics, subjects, or subtopics..."
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>

        {/* Subjects */}
        <motion.div data-tour="syllabus-subjects" variants={stagger} initial="hidden" animate="show" className="space-y-4">
          {filteredSubjects.map((subject) => {
            const meta = SUBJECT_META[subject];
            const topics = SYLLABUSES[subject];
            const isExpanded = expandedSubject === subject;
            const subjHours = topics.reduce((s, t) => s + t.estimatedHours, 0);

            return (
              <motion.div key={subject} variants={itemAnim} className="relative">
                <button
                  onClick={() => setExpandedSubject(isExpanded ? null : subject)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all",
                    "hover:shadow-sm",
                    isExpanded
                      ? `${meta.gradient} ${meta.border} shadow-sm`
                      : 'bg-card border-border/50 hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <h2 className="font-semibold">{meta.label}</h2>
                        <p className="text-xs text-muted-foreground">
                          {topics.length} topics | ~{subjHours}h | {
                            ['beginner', 'intermediate', 'advanced'].map(d => {
                              const count = topics.filter(t => t.difficulty === d).length;
                              return count ? `${count} ${d}` : null;
                            }).filter(Boolean).join(', ')
                          }
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Topic list */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div data-tour="syllabus-topics" className="mt-2 space-y-2 pl-4">
                        {topics.map((topic, idx) => {
                          const topicOpen = expandedTopics.has(topic.id);
                          return (
                            <motion.div
                              key={topic.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              className={cn(
                                "rounded-xl border transition-all",
                                topicOpen
                                  ? 'bg-secondary/20 border-border/80'
                                  : 'bg-card/50 border-border/30 hover:bg-secondary/10'
                              )}
                            >
                              <button
                                onClick={() => toggleTopic(topic.id)}
                                className="w-full flex items-center justify-between p-3.5 text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{topic.name}</span>
                                    <span className={cn(
                                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                                      DIFFICULTY_COLORS[topic.difficulty]
                                    )}>
                                      {topic.difficulty}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topic.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {topic.estimatedHours}h
                                  </span>
                                  <ChevronDown className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                    topicOpen && 'rotate-180'
                                  )} />
                                </div>
                              </button>

                              <AnimatePresence>
                                {topicOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3.5 pb-3.5 space-y-2">
                                      <p className="text-sm text-muted-foreground">{topic.description}</p>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                          <BarChart3 className="w-3 h-3" /> Subtopics:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {topic.subtopics.map((st) => (
                                            <span key={st} className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                                              {st}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
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
