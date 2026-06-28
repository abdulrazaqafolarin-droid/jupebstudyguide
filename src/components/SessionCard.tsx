import { useState } from 'react';
import { StudySessionData, DailyTask } from '@/types/syllabus';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Lock,
  Play,
  Calendar,
  MoreHorizontal,
  Pencil,
  Pause,
  PlayCircle,
  Trash2,
  Shuffle,
} from 'lucide-react';
import SyllabusDayView from './SyllabusDayView';
import SubjectReorder from './SubjectReorder';

interface SessionCardProps {
  session: StudySessionData;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  canAdvanceToDay: (sessionId: string, day: number) => boolean;
  onRename: (id: string, name: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderSubjects?: (ordered: Subject[]) => void;
  onStartTeaching?: (session: StudySessionData, day: number) => void;
}

function calculateStreak(tasks: DailyTask[]): number {
  const dates = tasks
    .filter(t => t.isCompleted && t.completedAt)
    .map(t => {
      const d = new Date(t.completedAt!);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
    .sort((a, b) => b - a);
  if (dates.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - dates[0]) / (1000 * 60 * 60 * 24));
  if (diff > 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));
    if (gap === 1) streak++;
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
  onReorderSubjects,
  onStartTeaching,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReorder, setShowReorder] = useState(false);

  const { progress } = session;
  const completedDays = progress.dailyTasks.filter(t => t.isCompleted).length;
  const streak = calculateStreak(progress.dailyTasks);
  const startDate = new Date(session.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const statusColors: Record<string, string> = {
    active: 'bg-accent/20 text-accent border-accent/30',
    paused: 'bg-muted text-muted-foreground border-border',
    completed: 'bg-primary/20 text-primary border-primary/30',
  };

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== session.name) {
      onRename(session.id, newName.trim());
    }
    setRenaming(false);
  };

  if (selectedDay !== null) {
    const task = progress.dailyTasks.find(t => t.day === selectedDay);
    if (task) {
      return (
        <SyllabusDayView
          task={task}
          canAdvance={canAdvanceToDay(session.id, selectedDay)}
          onComplete={(score) => {
            onCompleteDay(session.id, selectedDay, score);
            setSelectedDay(null);
          }}
          onBack={() => setSelectedDay(null)}
          onAskTutor={(topic, question) => {
            if (onStartTeaching) onStartTeaching(session, selectedDay);
          }}
        />
      );
    }
  }

  return (
    <Card className={cn('border-border/60 overflow-hidden transition-all duration-300', session.status === 'paused' && 'opacity-80')}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                  onBlur={handleRename}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium"
                  autoFocus
                />
              </div>
            ) : (
              <h3 className="font-bold text-base truncate">{session.name}</h3>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {session.subjects.map(subject => {
                const info = SUBJECT_INFO[subject];
                return (
                  <Badge key={subject} variant="outline" className="text-xs gap-1">
                    <span>{info.icon}</span>
                    {info.name}
                  </Badge>
                );
              })}
              <Badge className={cn('text-xs', statusColors[session.status])}>
                {session.status === 'active' ? 'Active' : session.status === 'paused' ? 'Paused' : 'Completed'}
              </Badge>
            </div>
          </div>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); setRenaming(true); setNewName(session.name); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                  >
                    <Pencil className="w-4 h-4" /> Rename
                  </button>
                  {session.status === 'active' ? (
                    <button
                      onClick={() => { setMenuOpen(false); onPause(session.id); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  ) : session.status === 'paused' ? (
                    <button
                      onClick={() => { setMenuOpen(false); onResume(session.id); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                    >
                      <PlayCircle className="w-4 h-4" /> Resume
                    </button>
                  ) : null}
                  {onReorderSubjects && (
                    <button
                      onClick={() => { setMenuOpen(false); setShowReorder(true); setExpanded(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                    >
                      <Shuffle className="w-4 h-4" /> Reorder subjects
                    </button>
                  )}
                  {confirmDelete ? (
                    <div className="px-4 py-2 space-y-2">
                      <p className="text-xs text-destructive font-medium">Delete this session?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => { onDelete(session.id); setConfirmDelete(false); }} className="flex-1">
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setConfirmDelete(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive text-left"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress row */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Day {progress.currentDay} <span className="text-muted-foreground font-normal">of 30</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{completedDays} days done</span>
            <span>{streak} day streak</span>
          </div>
          <Progress value={progress.overallProgress} className="h-2.5" />
        </div>

        {/* Subject progress mini bars */}
        <div className="mt-3 flex gap-2">
          {session.subjects.map(subject => {
            const pct = progress.subjectProgress[subject] || 0;
            const info = SUBJECT_INFO[subject];
            return (
              <div key={subject} className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{info.icon}</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>

        {/* Expand / Continue */}
        <div className="mt-4 flex items-center gap-2">
          {session.status === 'active' && progress.currentDay <= 30 && (
            <Button
              size="sm"
              onClick={() => setSelectedDay(progress.currentDay)}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Continue Day {progress.currentDay}
            </Button>
          )}
          {session.status === 'paused' && (
            <Button size="sm" variant="outline" onClick={() => onResume(session.id)} className="gap-1.5 text-xs">
              <PlayCircle className="w-3.5 h-3.5" />
              Resume
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1.5 text-xs ml-auto"
          >
            {expanded ? (
              <>Less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>All Days <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded day grid */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {showReorder && onReorderSubjects && (
            <SubjectReorder
              subjects={session.subjects}
              onApply={(ordered) => {
                onReorderSubjects(ordered);
                setShowReorder(false);
              }}
            />
          )}
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
            {progress.dailyTasks.map(task => {
              const canAccess = canAdvanceToDay(session.id, task.day);
              const isCurrent = task.day === progress.currentDay;
              const subjectInfo = SUBJECT_INFO[task.subject];
              return (
                <button
                  key={task.day}
                  onClick={() => canAccess && setSelectedDay(task.day)}
                  disabled={!canAccess && !task.isCompleted}
                  title={`Day ${task.day}: ${subjectInfo.name}`}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center p-0.5',
                    'text-[10px] font-medium transition-all duration-200 border min-w-0',
                    task.isCompleted && 'bg-accent/15 border-accent text-accent hover:bg-accent/25',
                    !task.isCompleted && canAccess && 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 hover:border-primary',
                    !task.isCompleted && !canAccess && 'bg-secondary/30 border-border/50 text-muted-foreground opacity-60',
                    isCurrent && !task.isCompleted && 'ring-1 ring-primary ring-offset-1 ring-offset-background animate-pulse',
                  )}
                >
                  {task.isCompleted ? (
                    <CheckCircle className="w-3 h-3 shrink-0" />
                  ) : !canAccess ? (
                    <Lock className="w-2.5 h-2.5 shrink-0" />
                  ) : isCurrent ? (
                    <Play className="w-2.5 h-2.5 shrink-0" />
                  ) : (
                    <span className="text-xs leading-none">{subjectInfo.icon}</span>
                  )}
                  <span className="text-[8px] leading-none mt-0.5 font-bold">{task.day}</span>
                </button>
              );
            })}
          </div>

          {/* Completion */}
          {completedDays >= 30 && (
            <div className="mt-4 text-center py-4 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl">
              <p className="font-bold text-lg">Session Complete!</p>
              <p className="text-sm text-muted-foreground">All 30 days finished.</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default SessionCard;
