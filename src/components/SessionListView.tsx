import { useState } from 'react';
import { StudySessionData } from '@/types/syllabus';
import { Button } from './ui/button';
import { Plus, ArrowLeft, GraduationCap, BookOpen } from 'lucide-react';
import SessionCard from './SessionCard';
import NewSessionModal from './NewSessionModal';
import { Subject } from '@/types/question';

interface SessionListViewProps {
  sessions: StudySessionData[];
  onCreateSession: (name: string, subjects: Subject[], startDate: string, dailyGoalMinutes: number) => void;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onRenameSession: (id: string, name: string) => void;
  onPauseSession: (id: string) => void;
  onResumeSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onReorderSubjects?: (sessionId: string, ordered: Subject[]) => void;
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
  onReorderSubjects,
  onBack,
  onStartTeaching,
}: SessionListViewProps) {
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              30-Day Syllabus
            </h1>

            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Study Sessions Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Create your first 30-day study session to start mastering the JUPEB syllabus with AI-guided learning.
            </p>
            <Button
              size="lg"
              onClick={() => setShowNewModal(true)}
              className="gap-2 bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="w-5 h-5" />
              Create Your First Session
            </Button>
          </div>
        )}

        {/* Session cards */}
        <div className="space-y-4">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onCompleteDay={onCompleteDay}
              canAdvanceToDay={canAdvanceToDay}
              onRename={onRenameSession}
              onPause={onPauseSession}
              onResume={onResumeSession}
              onDelete={onDeleteSession}
              onReorderSubjects={onReorderSubjects ? (ordered) => onReorderSubjects(session.id, ordered) : undefined}
              onStartTeaching={onStartTeaching}
            />
          ))}
        </div>

        {/* Quick tip */}
        {sessions.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Pro Tip</p>
                <p>
                  You can create multiple sessions to focus on different subjects or study goals.
                  Each session tracks its own progress independently.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Session Modal */}
      <NewSessionModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={(name, subjects, startDate, dailyGoal) => {
          onCreateSession(name, subjects, startDate, dailyGoal);
          setShowNewModal(false);
        }}
      />
    </div>
  );
}

export default SessionListView;
