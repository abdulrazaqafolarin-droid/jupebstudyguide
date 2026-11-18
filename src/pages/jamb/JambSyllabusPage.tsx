import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, BookOpenCheck, ChevronDown, ExternalLink,
  GraduationCap, Search, ShieldAlert, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS, JAMB_SYLLABUS_VERIFIED } from "@/lib/jamb-config";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function JambSyllabusPage() {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return JAMB_SUBJECTS;
    return JAMB_SUBJECTS.filter((subject) => {
      const info = JAMB_SUBJECT_INFO[subject];
      return info.label.toLowerCase().includes(query) || info.description.toLowerCase().includes(query);
    });
  }, [search]);

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 relative">
          <Link
            to="/jamb"
            aria-label="Back to JAMB home"
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold heading text-sm">JAMB Syllabus</h1>
              <p className="text-[11px] text-muted-foreground">
                {JAMB_SUBJECTS.length} supported content subjects · {JAMB_SYLLABUS_VERIFIED ? "verified source" : "verification pending"}
              </p>
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
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 chalk-texture">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpenCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Your JAMB subject guide</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                This page follows the same subject-and-topic browsing layout as the JUPEB syllabus.
                JAMB topic lists will only appear after the current official syllabus has been verified and versioned. This browser currently lists only the three subjects with supplied Rutex question packs; other exam subjects, including Mathematics and compulsory Use of English, remain unavailable in the question bank.
              </p>
              {!JAMB_SYLLABUS_VERIFIED && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No topic, subtopic or study-hour data is being fabricated or copied from JUPEB.
                    The official source remains available below while the JAMB syllabus is reviewed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search subjects or syllabus coverage..."
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
          {filteredSubjects.map((subject) => {
            const info = JAMB_SUBJECT_INFO[subject];
            const expanded = expandedSubject === subject;
            return (
              <motion.div key={subject} variants={itemAnim} className="relative">
                <button
                  type="button"
                  onClick={() => setExpandedSubject(expanded ? null : subject)}
                  aria-expanded={expanded}
                  className={[
                    "w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm",
                    expanded
                      ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-sm"
                      : "bg-card border-border/50 hover:border-border",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{info.icon}</span>
                      <div className="min-w-0">
                        <h2 className="font-semibold">{info.label}</h2>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                        <p className="mt-1 text-[11px] text-amber-600">Official topic list awaiting verification</p>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          JAMB {info.label} topics and subtopics have not yet been imported into Rutex.
                          Open the official IBASS source for the current syllabus; Rutex will add searchable
                          topic tracking after the document has been checked and recorded.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a href="https://ibass.jamb.gov.ng/" target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Official IBASS
                            </a>
                          </Button>
                          <Button asChild size="sm">
                            <Link to={`/jamb/past-questions?subject=${subject}`}>
                              <BookOpen className="mr-2 h-3.5 w-3.5" /> Practice questions
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/jamb/ai?subject=${subject}`}>
                              <Sparkles className="mr-2 h-3.5 w-3.5" /> Ask AI tutor
                            </Link>
                          </Button>
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
