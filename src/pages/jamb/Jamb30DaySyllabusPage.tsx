import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3,
  ExternalLink, Flame, GraduationCap, Lock, MoreHorizontal, Pencil,
  Play, PlayCircle, Plus, Sparkles, Target, Trash2, Trophy,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  JAMB_SYLLABUS,
  JAMB_SYLLABUS_REVIEW_NOTICE,
  JAMB_SYLLABUS_VERIFIED,
} from "@/lib/jamb-syllabus";
import {
  JAMB_PLAN_DAYS,
  getJambStudySessionProgress,
  type JambDailyTask,
  type JambPlanSubject,
  type JambPlanTopic,
  type JambStudySession,
} from "@/lib/jamb-30-day-syllabus";
import { useJamb30DaySessions } from "@/hooks/useJamb30DaySessions";
import { JambSubjectReorder } from "@/components/jamb/JambSubjectReorder";

const OPTIONAL_SUBJECTS = (Object.keys(JAMB_SYLLABUS) as JambPlanSubject[])
  .filter((subject) => subject !== "use_of_english");
const DEFAULT_OPTIONALS: JambPlanSubject[] = ["physics", "chemistry", "biology"];

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSubjectName(subject: JambPlanSubject) {
  return JAMB_SYLLABUS[subject].label;
}

function calculateStreak(tasks: JambDailyTask[]) {
  const completedDates = [...new Set(tasks
    .filter((task) => task.isCompleted && task.completedAt)
    .map((task) => localDateKey(new Date(task.completedAt!))))]
    .sort()
    .reverse();
  if (completedDates.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = localDateKey(today);
  const yesterdayKey = localDateKey(yesterday);
  if (completedDates[0] !== todayKey && completedDates[0] !== yesterdayKey) return 0;
  let streak = 1;
  let cursor = new Date(`${completedDates[0]}T00:00:00`);
  for (const date of completedDates.slice(1)) {
    cursor.setDate(cursor.getDate() - 1);
    if (localDateKey(cursor) !== date) break;
    streak += 1;
  }
  return streak;
}

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, subjects: JambPlanSubject[], startDate: string, dailyGoalMinutes: number) => void;
}

function NewSessionDialog({ open, onClose, onCreate }: NewSessionDialogProps) {
  const [name, setName] = useState("My JAMB 30-Day Plan");
  const [selected, setSelected] = useState<JambPlanSubject[]>(DEFAULT_OPTIONALS);
  const [startDate, setStartDate] = useState(localDateKey());
  const [dailyGoal, setDailyGoal] = useState(60);
  const [error, setError] = useState("");

  if (!open) return null;

  const toggleSubject = (subject: JambPlanSubject) => {
    setError("");
    setSelected((current) => current.includes(subject)
      ? current.filter((item) => item !== subject)
      : current.length < 3 ? [...current, subject] : current);
    if (!selected.includes(subject) && selected.length >= 3) {
      setError("Choose exactly three additional subjects. Use of English is already included.");
    }
  };

  const handleCreate = () => {
    if (!name.trim()) { setError("Give this study plan a name."); return; }
    if (selected.length !== 3) { setError("Select exactly three additional subjects."); return; }
    if (!startDate || !Number.isFinite(Date.parse(startDate))) { setError("Choose a valid start date."); return; }
    if (!Number.isInteger(dailyGoal) || dailyGoal < 5 || dailyGoal > 480) {
      setError("Daily study goal must be between 5 and 480 minutes.");
      return;
    }
    onCreate(name.trim(), ["use_of_english", ...selected], startDate, dailyGoal);
    setName("My JAMB 30-Day Plan");
    setSelected(DEFAULT_OPTIONALS);
    setStartDate(localDateKey());
    setDailyGoal(60);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close new study plan dialog" className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="jamb-plan-dialog-title" className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 id="jamb-plan-dialog-title" className="flex items-center gap-2 text-lg font-bold">
              <Plus className="h-5 w-5 text-primary" /> Create a JAMB study plan
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Build a subject-specific 30-day learning schedule.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">×</Button>
        </div>
        <div className="space-y-5 p-5">
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="jamb-plan-name">Plan name</Label>
            <Input id="jamb-plan-name" value={name} maxLength={64} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="space-y-3">
            <div>
              <Label>Compulsory paper</Label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
                <span className="text-2xl">{JAMB_SYLLABUS.use_of_english.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{JAMB_SYLLABUS.use_of_english.label}</p>
                  <p className="text-xs text-muted-foreground">Included automatically in every plan</p>
                </div>
                <Badge variant="secondary">Included</Badge>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Choose your other three subjects</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{selected.length}/3 selected</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {OPTIONAL_SUBJECTS.map((subject) => {
                  const item = JAMB_SYLLABUS[subject];
                  const checked = selected.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleSubject(subject)}
                      className={`flex min-h-16 items-center gap-2 rounded-xl border-2 p-3 text-left transition-colors ${checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                      <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>{checked ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Your choice is used to build all 30 days. You can create separate plans for another combination.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="jamb-plan-start">Start date</Label>
              <Input id="jamb-plan-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jamb-plan-goal">Daily study goal (minutes)</Label>
              <Input id="jamb-plan-goal" type="number" min={5} max={480} value={dailyGoal} onChange={(event) => setDailyGoal(Number(event.target.value))} />
            </div>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3 text-center text-sm text-muted-foreground">
            {selected.length === 3
              ? <>Your plan includes <strong className="text-foreground">4 subjects</strong> across <strong className="text-foreground">30 days</strong> · {dailyGoal} min/day</>
              : <>Select {3 - selected.length} more subject{3 - selected.length === 1 ? "" : "s"} to continue.</>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={selected.length !== 3} className="flex-1 gap-2">
              Create 30-Day Plan <Play className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface JambLessonProps {
  task: JambDailyTask;
  canAdvance: boolean;
  onBack: () => void;
  onComplete: (mastery: number) => void;
}

function JambLessonView({ task, canAdvance, onBack, onComplete }: JambLessonProps) {
  const [expandedTopic, setExpandedTopic] = useState(task.topics[0]?.id ?? null);
  const [checkedObjectives, setCheckedObjectives] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [showCompletionHint, setShowCompletionHint] = useState(false);
  const checkedCount = Object.values(checkedObjectives).filter(Boolean).length;
  const allChecked = task.learningObjectives.length > 0 && checkedCount === task.learningObjectives.length;

  if (!canAdvance && !task.isCompleted) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-7">
            <Lock className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h2 className="text-xl font-bold">Day locked</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete the previous day with at least 70% mastery to unlock this lesson.</p>
            <Button onClick={onBack} className="mt-5">Back to plan</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to plan</Button>
        <Badge variant="outline" className="gap-1.5 py-1"><CalendarDays className="h-3.5 w-3.5" /> Day {task.day} of 30</Badge>
        {task.isCompleted ? <Badge className="bg-emerald-600/10 text-emerald-600">Completed</Badge> : <span className="text-xs text-muted-foreground">In progress</span>}
      </div>

      <Card className="border-primary/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl">{JAMB_SYLLABUS[task.subject].icon}</span>
            <span>Day {task.day} learning plan</span>
          </CardTitle>
          <CardDescription>{task.topics.length ? `${task.topics.length} syllabus topics scheduled for today` : "Review and practice day"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.topics.length ? task.topics.map((topic) => (
            <JambTopicAccordion key={topic.id} topic={topic} expanded={expandedTopic === topic.id} onToggle={() => setExpandedTopic((current) => current === topic.id ? null : topic.id)} />
          )) : (
            <div className="rounded-xl bg-secondary/30 p-5 text-center">
              <Sparkles className="mx-auto mb-3 h-9 w-9 text-primary" />
              <h3 className="font-semibold">Review day</h3>
              <p className="mt-1 text-sm text-muted-foreground">Revisit earlier topics and strengthen the areas that need more practice.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> Learning objectives</CardTitle>
          <CardDescription>Tick each objective after you can explain it without looking at your notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.learningObjectives.map((objective, index) => (
            <label key={`${task.day}-${index}`} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-secondary/30">
              <input
                type="checkbox"
                checked={Boolean(checkedObjectives[`objective-${index}`])}
                onChange={() => setCheckedObjectives((previous) => ({ ...previous, [`objective-${index}`]: !previous[`objective-${index}`] }))}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span className={`text-sm ${checkedObjectives[`objective-${index}`] ? "text-muted-foreground line-through" : "text-foreground"}`}>{objective}</span>
            </label>
          ))}
          <Progress value={task.learningObjectives.length ? (checkedCount / task.learningObjectives.length) * 100 : 0} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">{checkedCount} of {task.learningObjectives.length} objectives completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" /> Self-check questions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {task.checkpointQuestions.map((question, index) => (
            <div key={index} className="rounded-lg bg-secondary/35 p-4">
              <p className="text-sm font-medium">{question}</p>
              <p className="mt-2 text-xs text-muted-foreground">Use the JAMB AI tutor from a topic above to work through this question.</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Your notes</CardTitle><CardDescription>Capture formulas, key facts, examples and topics to revisit.</CardDescription></CardHeader>
        <CardContent><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Write your study notes here..." className="min-h-32" /></CardContent>
      </Card>

      {!task.isCompleted && (
        <div className="sticky bottom-4 z-10 space-y-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
          <Button className="w-full gap-2 py-6 text-base" disabled={checkedCount === 0} onClick={() => allChecked ? onComplete(Math.round((checkedCount / task.learningObjectives.length) * 100)) : setShowCompletionHint(true)}>
            <CheckCircle2 className="h-5 w-5" /> Complete Day {task.day}
          </Button>
          {showCompletionHint && !allChecked && <p role="alert" className="text-center text-sm text-destructive">Complete every learning objective before closing this day.</p>}
        </div>
      )}
      {task.isCompleted && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mr-2 inline h-4 w-4" /> Day completed · {task.masteryScore ?? 100}% mastery
        </div>
      )}
    </div>
  );
}

interface JambTopicAccordionProps {
  topic: JambPlanTopic;
  expanded: boolean;
  onToggle: () => void;
}

function JambTopicAccordion({ topic, expanded, onToggle }: JambTopicAccordionProps) {
  const subject = JAMB_SYLLABUS[topic.subject];
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/30">
        <span className="flex min-w-0 items-center gap-3">
          <span className="text-xl">{subject.icon}</span>
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">{subject.label} · Topic {topic.number}</span>
            <span className="block font-semibold">{topic.title}</span>
            <span className="block text-xs text-muted-foreground">{topic.sectionTitle}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-border bg-secondary/10 p-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Topic outline</h4>
            <ul className="space-y-1.5">
              {topic.outline.map((point, index) => <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{point}</li>)}
            </ul>
          </div>
          {topic.objectives.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Syllabus objectives</h4>
              <ul className="space-y-1.5">{topic.objectives.map((objective, index) => <li key={index} className="text-sm text-muted-foreground">• {objective}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">Study this exact JAMB topic with the AI tutor.</div>
            <Button asChild size="sm" className="gap-2">
              <Link to={`/jamb/ai?subject=${topic.subject}&topic=${encodeURIComponent(topic.id)}`}>
                <Sparkles className="h-4 w-4" /> Learn with AI
              </Link>
            </Button>
          </div>
          {topic.sourcePages.length > 0 && <p className="text-[11px] text-muted-foreground">Reference pages in the syllabus source copy: {topic.sourcePages.join(", ")}</p>}
        </div>
      )}
    </div>
  );
}

interface JambSessionCardProps {
  session: JambStudySession;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onCompleteDay: (sessionId: string, day: number, mastery: number) => void;
  onRename: (id: string, name: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderSubjects: (id: string, order: JambPlanSubject[]) => void;
}

function JambSessionCard({
  session, canAdvanceToDay, onCompleteDay, onRename, onPause, onResume, onDelete, onReorderSubjects,
}: JambSessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { completedDays, percentage } = getJambStudySessionProgress(session.progress.dailyTasks);
  const streak = calculateStreak(session.progress.dailyTasks);
  const startDate = new Date(`${session.startDate}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + JAMB_PLAN_DAYS - 1);

  if (selectedDay !== null) {
    const task = session.progress.dailyTasks.find((item) => item.day === selectedDay);
    if (task) {
      return (
        <JambLessonView
          task={task}
          canAdvance={canAdvanceToDay(session.id, selectedDay) || task.isCompleted}
          onBack={() => setSelectedDay(null)}
          onComplete={(mastery) => {
            onCompleteDay(session.id, selectedDay, mastery);
            setSelectedDay(null);
          }}
        />
      );
    }
  }

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== session.name) onRename(session.id, newName.trim());
    setRenaming(false);
  };

  return (
    <Card className={`overflow-visible border-border/60 ${session.status === "paused" ? "opacity-85" : ""}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <Input value={newName} maxLength={64} autoFocus onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleRename(); if (event.key === "Escape") setRenaming(false); }} onBlur={handleRename} aria-label="Study plan name" />
            ) : <h3 className="truncate font-bold">{session.name}</h3>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.subjects.map((subject) => <Badge key={subject} variant="outline" className="gap-1 text-xs"><span>{JAMB_SYLLABUS[subject].icon}</span>{getSubjectName(subject)}</Badge>)}
              <Badge variant="secondary" className={session.status === "active" ? "bg-emerald-500/10 text-emerald-700" : session.status === "paused" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}>{session.status}</Badge>
            </div>
          </div>
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label="Study plan actions" onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal className="h-4 w-4" /></Button>
            {menuOpen && (
              <>
                <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  <button type="button" onClick={() => { setMenuOpen(false); setRenaming(true); setNewName(session.name); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-secondary/50"><Pencil className="h-4 w-4" /> Rename plan</button>
                  {session.status === "active" && <button type="button" onClick={() => { setMenuOpen(false); onPause(session.id); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-secondary/50"><Lock className="h-4 w-4" /> Pause plan</button>}
                  {session.status === "paused" && <button type="button" onClick={() => { setMenuOpen(false); onResume(session.id); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-secondary/50"><PlayCircle className="h-4 w-4" /> Resume plan</button>}
                  {confirmDelete ? (
                    <div className="space-y-2 border-t border-border p-3">
                      <p className="text-xs font-medium text-destructive">Delete this plan and its progress?</p>
                      <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => onDelete(session.id)} className="flex-1">Delete</Button><Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">Keep</Button></div>
                    </div>
                  ) : <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Delete plan</button>}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Day {session.progress.currentDay} <span className="font-normal text-muted-foreground">of 30</span></span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{session.dailyGoalMinutes} min/day</span>
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{completedDays} days completed</span><span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{streak} day streak</span></div>
        <Progress value={percentage} className="mt-1.5 h-2.5" />
        <div className="mt-3">
          <JambSubjectReorder
            subjects={session.subjects}
            onApply={(ordered) => onReorderSubjects(session.id, ordered)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {session.status === "active" && session.progress.currentDay <= JAMB_PLAN_DAYS && (
            <Button size="sm" onClick={() => setSelectedDay(session.progress.currentDay)} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Continue Day {session.progress.currentDay}</Button>
          )}
          {session.status === "paused" && <Button size="sm" variant="outline" onClick={() => onResume(session.id)} className="gap-1.5"><PlayCircle className="h-3.5 w-3.5" /> Resume</Button>}
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => setExpanded((value) => !value)}>{expanded ? "Hide days" : "All days"}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /></Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {session.progress.dailyTasks.map((task) => {
              const accessible = canAdvanceToDay(session.id, task.day) || task.isCompleted;
              const current = task.day === session.progress.currentDay;
              return (
                <button key={task.day} type="button" disabled={!accessible} onClick={() => setSelectedDay(task.day)} title={`Day ${task.day}: ${getSubjectName(task.subject)}`} className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border p-0.5 text-[10px] font-medium transition-colors ${task.isCompleted ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : accessible ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20" : "border-border/50 bg-secondary/30 text-muted-foreground opacity-60"} ${current && !task.isCompleted ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}`}>
                  {task.isCompleted ? <CheckCircle2 className="h-3 w-3" /> : accessible ? <Play className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  <span className="mt-0.5 text-[8px] font-bold">{task.day}</span>
                </button>
              );
            })}
          </div>
          {completedDays >= JAMB_PLAN_DAYS && <div className="mt-4 rounded-xl bg-primary/10 p-4 text-center"><Trophy className="mx-auto mb-2 h-7 w-7 text-primary" /><p className="font-bold">Plan completed!</p><p className="text-sm text-muted-foreground">You finished all 30 days of this JAMB study plan.</p></div>}
        </div>
      )}
    </Card>
  );
}

export default function Jamb30DaySyllabusPage() {
  const navigate = useNavigate();
  const [showNewSession, setShowNewSession] = useState(false);
  const {
    sessions, createSession, deleteSession, completeDay, canAdvanceToDay,
    reorderSubjects, renameSession, pauseSession, resumeSession, isLoaded,
  } = useJamb30DaySessions();

  const totals = useMemo(() => {
    const completedDays = sessions.reduce((sum, session) =>
      sum + session.progress.dailyTasks.filter((task) => task.isCompleted).length, 0);
    return {
      plans: sessions.length,
      completedDays,
      activePlans: sessions.filter((session) => session.status === "active").length,
    };
  }, [sessions]);

  const handleCreate = (name: string, subjects: JambPlanSubject[], startDate: string, dailyGoal: number) => {
    try {
      createSession(name, subjects, startDate, dailyGoal);
      setShowNewSession(false);
      toast.success("Your JAMB 30-day study plan is ready.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not create the study plan.");
    }
  };

  const handleCompleteDay = (sessionId: string, day: number, mastery: number) => {
    if (mastery < 70) {
      toast.error("You need at least 70% mastery to complete this day.");
      return;
    }
    completeDay(sessionId, day, mastery);
    toast.success(`Day ${day} completed. Keep your JAMB preparation moving!`);
  };

  if (!isLoaded) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-medium">Restoring your JAMB study plans…</p>
          <p className="mt-1 text-xs text-muted-foreground">Your saved progress is being loaded before you continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="30-Day JAMB Syllabus"
        subtitle="A guided 30-day plan for your four JAMB subjects"
        onBack={() => navigate("/jamb")}
        backLabel="Back to JAMB home"
        icon={GraduationCap}
        compact
        animated
        wide
        rightContent={<div className="rounded-full border-2 border-primary/20 px-3 py-2 text-center"><span className="block text-lg font-bold leading-none text-primary">30</span><span className="text-[9px] font-semibold uppercase text-muted-foreground">days</span></div>}
      />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Card className={JAMB_SYLLABUS_VERIFIED ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
          <CardContent className="flex items-start gap-3 p-4">
            <ExternalLink className={`mt-0.5 h-5 w-5 shrink-0 ${JAMB_SYLLABUS_VERIFIED ? "text-emerald-600" : "text-amber-600"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">JAMB syllabus reference status</p>
                <Badge variant="outline" className="text-[10px]">{JAMB_SYLLABUS_VERIFIED ? "Verified" : "Source review pending"}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{JAMB_SYLLABUS_REVIEW_NOTICE}</p>
              <a href="https://ibass.jamb.gov.ng/e-syllabus" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open JAMB IBASS syllabus <ExternalLink className="h-3 w-3" /></a>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card><CardContent className="p-3 text-center sm:p-4"><div className="flex items-center justify-center gap-1.5 text-primary"><BookOpen className="h-4 w-4" /><span className="text-2xl font-bold tabular-nums">{totals.plans}</span></div><p className="mt-1 text-[11px] text-muted-foreground">Study plans</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center sm:p-4"><div className="flex items-center justify-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /><span className="text-2xl font-bold tabular-nums">{totals.completedDays}</span></div><p className="mt-1 text-[11px] text-muted-foreground">Days completed</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center sm:p-4"><div className="flex items-center justify-center gap-1.5 text-accent"><Flame className="h-4 w-4" /><span className="text-2xl font-bold tabular-nums">{totals.activePlans}</span></div><p className="mt-1 text-[11px] text-muted-foreground">Active plans</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Your study plans</h2><p className="text-sm text-muted-foreground">Track each subject combination independently.</p></div>
          <Button onClick={() => setShowNewSession(true)} className="gap-2"><Plus className="h-4 w-4" /> New plan</Button>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-dashed border-primary/30">
            <CardContent className="px-5 py-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><GraduationCap className="h-8 w-8 text-primary" /></div>
              <h3 className="text-xl font-bold">Start your 30-day JAMB journey</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create your first plan. We’ll distribute your selected JAMB syllabus topics across 30 days, with learning objectives, self-check questions, AI tutoring and progress tracking.</p>
              <Button size="lg" onClick={() => setShowNewSession(true)} className="mt-6 gap-2"><CalendarDays className="h-5 w-5" /> Create my 30-day plan</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <JambSessionCard
                key={session.id}
                session={session}
                canAdvanceToDay={canAdvanceToDay}
                onCompleteDay={handleCompleteDay}
                onRename={renameSession}
                onPause={pauseSession}
                onResume={resumeSession}
                onDelete={deleteSession}
                onReorderSubjects={reorderSubjects}
              />
            ))}
          </div>
        )}

        <Card className="border-border/50 bg-secondary/20">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">How the 30-day plan works</p>
              <p className="mt-1">Study the day’s topics, open any topic in the JAMB AI tutor, work through the self-check questions, and tick off every learning objective when you understand it. A completed day unlocks the next one. You can pause a plan, rename it, or create another plan for a different subject combination.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm"><Link to="/jamb/syllabus">Browse the full JAMB syllabus reference</Link></Button>
        </div>
      </main>

      <NewSessionDialog open={showNewSession} onClose={() => setShowNewSession(false)} onCreate={handleCreate} />
    </div>
  );
}
