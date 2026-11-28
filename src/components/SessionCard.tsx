import { StudySessionData } from "@/types/syllabus";
import { Subject, SUBJECT_INFO } from "@/types/question";
import { SyllabusDayView } from "./SyllabusDayView";
import {
  SyllabusSessionCard,
  type SyllabusSessionDayView,
  type SyllabusSessionSubjectView,
} from "@/components/syllabus/SyllabusSessionCard";

interface SessionCardProps {
  session: StudySessionData;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onRename: (id: string, name: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

function calculateStreak(tasks: StudySessionData["progress"]["dailyTasks"]): number {
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

export function SessionCard({
  session,
  onCompleteDay,
  canAdvanceToDay,
  onRename,
  onPause,
  onResume,
  onDelete,
}: SessionCardProps) {
  const { progress } = session;
  const completedDays = progress.dailyTasks.filter((task) => task.isCompleted).length;

  const subjects: SyllabusSessionSubjectView[] = session.subjects.map((subject: Subject) => ({
    id: subject,
    name: SUBJECT_INFO[subject].name,
    icon: SUBJECT_INFO[subject].icon,
    progress: progress.subjectProgress[subject] || 0,
  }));

  const days: SyllabusSessionDayView[] = progress.dailyTasks.map((task) => ({
    day: task.day,
    isCompleted: task.isCompleted,
    canAccess: canAdvanceToDay(session.id, task.day),
    isCurrent: task.day === progress.currentDay,
    subjectName: SUBJECT_INFO[task.subject].name,
    subjectIcon: SUBJECT_INFO[task.subject].icon,
  }));

  return (
    <SyllabusSessionCard
      id={session.id}
      name={session.name}
      status={session.status}
      currentDay={progress.currentDay}
      totalDays={progress.dailyTasks.length}
      startDate={session.startDate}
      completedDays={completedDays}
      streak={calculateStreak(progress.dailyTasks)}
      progressPercent={progress.overallProgress}
      subjects={subjects}
      days={days}
      onRename={onRename}
      onPause={onPause}
      onResume={onResume}
      onDelete={onDelete}
      renderDay={(day, onBack) => {
        const task = progress.dailyTasks.find((item) => item.day === day);
        if (!task) return null;
        return (
          <SyllabusDayView
            task={task}
            canAdvance={canAdvanceToDay(session.id, day) || task.isCompleted}
            onComplete={(mastery) => {
              onCompleteDay(session.id, day, mastery);
              onBack();
            }}
            onBack={onBack}
          />
        );
      }}
    />
  );
}

export default SessionCard;
