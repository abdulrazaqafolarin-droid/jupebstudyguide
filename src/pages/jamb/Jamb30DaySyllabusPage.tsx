import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProgrammeSyllabusSetup } from "@/components/syllabus/ProgrammeSyllabusSetup";
import { ProgrammeNewSessionModal } from "@/components/syllabus/ProgrammeNewSessionModal";
import { SyllabusSessionCard, type SyllabusSessionDayView, type SyllabusSessionSubjectView } from "@/components/syllabus/SyllabusSessionCard";
import { SyllabusSessionListLayout } from "@/components/syllabus/SyllabusSessionListLayout";
import { SyllabusDayLayout } from "@/components/syllabus/SyllabusDayLayout";
import { SyllabusTopicAccordion } from "@/components/syllabus/SyllabusTopicAccordion";
import { useJamb30DaySessions } from "@/hooks/useJamb30DaySessions";
import JambAITutorPage from "@/pages/jamb/JambAITutorPage";
import { JAMB_SYLLABUS } from "@/lib/jamb-syllabus";
import {
  JAMB_PLAN_DAYS,
  getJambStudySessionProgress,
  type JambDailyTask,
  type JambPlanSubject,
  type JambPlanTopic,
  type JambStudySession,
} from "@/lib/jamb-30-day-syllabus";
import type { SyllabusSubjectChoice } from "@/components/syllabus/ProgrammeSyllabusSetup";

const JAMB_SUBJECT_CHOICES: SyllabusSubjectChoice<JambPlanSubject>[] =
  (Object.keys(JAMB_SYLLABUS) as JambPlanSubject[]).map((id) => ({
    id,
    name: JAMB_SYLLABUS[id].label,
    icon: JAMB_SYLLABUS[id].icon,
  }));

const REQUIRED_SUBJECTS: SyllabusSubjectChoice<JambPlanSubject>[] =
  JAMB_SUBJECT_CHOICES.filter((subject) => subject.id === "use_of_english");
const OPTIONAL_SUBJECTS: SyllabusSubjectChoice<JambPlanSubject>[] =
  JAMB_SUBJECT_CHOICES.filter((subject) => subject.id !== "use_of_english");

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateStreak(tasks: JambDailyTask[]) {
  const dates = tasks
    .filter((task) => task.isCompleted && task.completedAt)
    .map((task) => {
      const date = new Date(task.completedAt!);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .sort((a, b) => b - a);
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((today.getTime() - dates[0]) / (1000 * 60 * 60 * 24));
  if (difference > 1) return 0;

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const gap = Math.round((dates[index - 1] - dates[index]) / (1000 * 60 * 60 * 24));
    if (gap === 1) streak += 1;
    else break;
  }
  return streak;
}

interface JambDayLessonProps {
  task: JambDailyTask;
  canAdvance: boolean;
  onBack: () => void;
  onComplete: (masteryScore: number) => void;
}

function JambDayLesson({ task, canAdvance, onBack, onComplete }: JambDayLessonProps) {
  const [teachingTopic, setTeachingTopic] = useState<JambPlanTopic | null>(null);
  const [teachingCompleted, setTeachingCompleted] = useState(false);
  const syllabusSubject = JAMB_SYLLABUS[task.subject];

  const topicsContent = task.topics.length > 0 ? (
    <div className="space-y-4">
      {task.topics.map((topic) => (
        <SyllabusTopicAccordion
          key={topic.id}
          id={topic.id}
          title={topic.title}
          tag={`Topic ${topic.number}`}
          description={topic.sectionTitle}
          subtopics={topic.outline}
          actionLabel="Start Learning This Topic"
          onStart={() => setTeachingTopic(topic)}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <h3 className="font-medium mb-2">Review Day</h3>
      <p className="text-sm text-muted-foreground">
        Practice past questions and review concepts from previous days.
      </p>
    </div>
  );

  const tutorOverlay = teachingTopic ? (
    <JambAITutorPage
      embeddedSubject={teachingTopic.subject}
      embeddedTopicId={teachingTopic.id}
      embeddedDay={task.day}
      onClose={() => setTeachingTopic(null)}
      onComplete={() => {
        setTeachingCompleted(true);
        setTeachingTopic(null);
      }}
    />
  ) : undefined;

  return (
    <SyllabusDayLayout
      day={task.day}
      subjectName={syllabusSubject.label}
      subjectIcon={syllabusSubject.icon}
      subjectClassName={`subject-${task.subject}`}
      isCompleted={task.isCompleted}
      masteryScore={task.masteryScore}
      canAdvance={canAdvance || task.isCompleted}
      topics={topicsContent}
      topicCount={task.topics.length}
      learningObjectives={task.learningObjectives}
      checkpointQuestions={task.checkpointQuestions}
      onComplete={onComplete}
      onBack={onBack}
      fullScreenOverlay={tutorOverlay}
      markAllObjectivesComplete={teachingCompleted}
    />
  );
}

interface JambPlanCardProps {
  session: JambStudySession;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  onRename: (id: string, name: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

function JambPlanCard({
  session,
  canAdvanceToDay,
  onCompleteDay,
  onRename,
  onPause,
  onResume,
  onDelete,
}: JambPlanCardProps) {
  const { completedDays, percentage } = getJambStudySessionProgress(session.progress.dailyTasks);

  const subjects: SyllabusSessionSubjectView[] = session.subjects.map((subject) => ({
    id: subject,
    name: JAMB_SYLLABUS[subject].label,
    icon: JAMB_SYLLABUS[subject].icon,
    progress: session.progress.subjectProgress[subject] ?? 0,
  }));

  const days: SyllabusSessionDayView[] = session.progress.dailyTasks.map((task) => ({
    day: task.day,
    isCompleted: task.isCompleted,
    canAccess: canAdvanceToDay(session.id, task.day),
    isCurrent: task.day === session.progress.currentDay,
    subjectName: JAMB_SYLLABUS[task.subject].label,
    subjectIcon: JAMB_SYLLABUS[task.subject].icon,
  }));

  return (
    <SyllabusSessionCard
      id={session.id}
      name={session.name}
      status={session.status}
      currentDay={session.progress.currentDay}
      totalDays={JAMB_PLAN_DAYS}
      startDate={session.startDate}
      completedDays={completedDays}
      streak={calculateStreak(session.progress.dailyTasks)}
      progressPercent={percentage}
      subjects={subjects}
      days={days}
      onRename={onRename}
      onPause={onPause}
      onResume={onResume}
      onDelete={onDelete}
      renderDay={(day, onBack) => {
        const task = session.progress.dailyTasks.find((item) => item.day === day);
        if (!task) return null;
        return (
          <JambDayLesson
            task={task}
            canAdvance={canAdvanceToDay(session.id, day)}
            onBack={onBack}
            onComplete={(masteryScore) => {
              onCompleteDay(session.id, day, masteryScore);
              onBack();
            }}
          />
        );
      }}
    />
  );
}

export default function Jamb30DaySyllabusPage() {
  const navigate = useNavigate();
  const [showNewSession, setShowNewSession] = useState(false);
  const {
    sessions,
    createSession,
    deleteSession,
    completeDay,
    canAdvanceToDay,
    renameSession,
    pauseSession,
    resumeSession,
    isLoaded,
  } = useJamb30DaySessions();

  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [sessions],
  );

  const handleCreate = (
    name: string,
    subjects: JambPlanSubject[],
    startDate: string,
    dailyGoalMinutes: number,
  ) => {
    try {
      createSession(name, subjects, startDate, dailyGoalMinutes);
      setShowNewSession(false);
      toast.success("Study session created.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not create the study session.");
    }
  };

  const handleCompleteDay = (sessionId: string, day: number, masteryScore: number) => {
    if (masteryScore < 70) {
      toast.error("You need at least 70% mastery to complete this day.");
      return;
    }
    completeDay(sessionId, day, masteryScore);
    toast.success(`Day ${day} completed.`);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-medium">Restoring your saved study sessions…</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <ProgrammeSyllabusSetup<JambPlanSubject>
          title="30-Day JAMB Syllabus"
          requiredSubjects={REQUIRED_SUBJECTS}
          optionalSubjects={OPTIONAL_SUBJECTS}
          minimumOptionalSelections={3}
          maximumOptionalSelections={3}
          onStart={(subjects) => {
            createSession(
              "JAMB 30-Day Syllabus",
              subjects,
              localDateKey(),
              30,
            );
          }}
          onCancel={() => navigate("/jamb")}
        />
      </div>
    );
  }

  return (
    <SyllabusSessionListLayout
      sessionsCount={sortedSessions.length}
      programmeName="JAMB"
      onBack={() => navigate("/jamb")}
      onNewSession={() => setShowNewSession(true)}
      modal={(
        <ProgrammeNewSessionModal<JambPlanSubject>
          open={showNewSession}
          onClose={() => setShowNewSession(false)}
          onCreate={handleCreate}
          fixedSubjects={REQUIRED_SUBJECTS}
          selectableSubjects={OPTIONAL_SUBJECTS}
          minimumSelections={3}
          maximumSelections={3}
          defaultGoalMinutes={30}
          subjectLabel="Subjects (select three)"
        />
      )}
    >
      {sortedSessions.map((session) => (
        <JambPlanCard
          key={session.id}
          session={session}
          canAdvanceToDay={canAdvanceToDay}
          onCompleteDay={handleCompleteDay}
          onRename={renameSession}
          onPause={pauseSession}
          onResume={resumeSession}
          onDelete={deleteSession}
        />
      ))}
    </SyllabusSessionListLayout>
  );
}
