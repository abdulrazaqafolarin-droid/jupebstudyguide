import { useState } from "react";
import { StudySessionData } from "@/types/syllabus";
import { SessionCard } from "./SessionCard";
import { NewSessionModal } from "./NewSessionModal";
import { Subject } from "@/types/question";
import { SyllabusSessionListLayout } from "@/components/syllabus/SyllabusSessionListLayout";

interface SessionListViewProps {
  sessions: StudySessionData[];
  onCreateSession: (name: string, subjects: Subject[], startDate: string, dailyGoalMinutes: number) => void;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onRenameSession: (id: string, name: string) => void;
  onPauseSession: (id: string) => void;
  onResumeSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onBack: () => void;
  onStartTeaching?: (session: StudySessionData, day: number) => void;
}

export function SessionListView({
  sessions,
  onCreateSession,
  onCompleteDay,
  canAdvanceToDay,
  onRenameSession,
  onPauseSession,
  onResumeSession,
  onDeleteSession,
  onBack,
  onStartTeaching,
}: SessionListViewProps) {
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <SyllabusSessionListLayout
      sessionsCount={sessions.length}
      programmeName="JUPEB"
      onBack={onBack}
      onNewSession={() => setShowNewModal(true)}
      modal={(
        <NewSessionModal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreate={(name, subjects, startDate, dailyGoal) => {
            onCreateSession(name, subjects, startDate, dailyGoal);
            setShowNewModal(false);
          }}
        />
      )}
    >
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onCompleteDay={onCompleteDay}
          canAdvanceToDay={canAdvanceToDay}
          onRename={onRenameSession}
          onPause={onPauseSession}
          onResume={onResumeSession}
          onDelete={onDeleteSession}
          onStartTeaching={onStartTeaching}
        />
      ))}
    </SyllabusSessionListLayout>
  );
}

export default SessionListView;
