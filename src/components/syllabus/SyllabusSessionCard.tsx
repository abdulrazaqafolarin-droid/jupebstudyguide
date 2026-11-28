import { useState, type ReactNode } from "react";
import {
  CheckCircle, ChevronDown, ChevronUp, Lock, MoreHorizontal, Pause,
  Pencil, Play, PlayCircle, Trash2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SyllabusSessionStatus = "active" | "paused" | "completed";

export interface SyllabusSessionSubjectView {
  id: string;
  name: string;
  icon: string;
  progress: number;
}

export interface SyllabusSessionDayView {
  day: number;
  isCompleted: boolean;
  canAccess: boolean;
  isCurrent: boolean;
  subjectName: string;
  subjectIcon: string;
}

interface SyllabusSessionCardProps {
  id: string;
  name: string;
  status: SyllabusSessionStatus;
  currentDay: number;
  totalDays?: number;
  startDate: string;
  completedDays: number;
  streak: number;
  progressPercent: number;
  subjects: SyllabusSessionSubjectView[];
  days: SyllabusSessionDayView[];
  onRename: (id: string, name: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  renderDay: (day: number, onBack: () => void) => ReactNode;
}

/**
 * Shared JUPEB/JAMB multi-session card. All layout and interaction treatment
 * is common; each programme supplies only the subject/day view model and its
 * own day lesson renderer.
 */
export function SyllabusSessionCard({
  id,
  name,
  status,
  currentDay,
  totalDays = 30,
  startDate,
  completedDays,
  streak,
  progressPercent,
  subjects,
  days,
  onRename,
  onPause,
  onResume,
  onDelete,
  renderDay,
}: SyllabusSessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusColors: Record<SyllabusSessionStatus, string> = {
    active: "bg-accent/20 text-accent border-accent/30",
    paused: "bg-muted text-muted-foreground border-border",
    completed: "bg-primary/20 text-primary border-primary/30",
  };

  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays);

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== name) onRename(id, newName.trim());
    setRenaming(false);
  };

  if (selectedDay !== null) {
    return <>{renderDay(selectedDay, () => setSelectedDay(null))}</>;
  }

  return (
    <Card className={cn("border-border/60 overflow-hidden transition-all duration-300", status === "paused" && "opacity-80")}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleRename();
                    if (event.key === "Escape") setRenaming(false);
                  }}
                  onBlur={handleRename}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium"
                  autoFocus
                />
              </div>
            ) : (
              <h3 className="font-bold text-base truncate">{name}</h3>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {subjects.map((subject) => (
                <Badge key={subject.id} variant="outline" className="text-xs gap-1">
                  <span>{subject.icon}</span>
                  {subject.name}
                </Badge>
              ))}
              <Badge className={cn("text-xs", statusColors[status])}>
                {status === "active" ? "Active" : status === "paused" ? "Paused" : "Completed"}
              </Badge>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Study session actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close session actions"
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setRenaming(true); setNewName(name); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                  >
                    <Pencil className="w-4 h-4" /> Rename
                  </button>
                  {status === "active" ? (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onPause(id); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  ) : status === "paused" ? (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onResume(id); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50 text-left"
                    >
                      <PlayCircle className="w-4 h-4" /> Resume
                    </button>
                  ) : null}
                  {confirmDelete ? (
                    <div className="px-4 py-2 space-y-2">
                      <p className="text-xs text-destructive font-medium">Delete this session?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => { onDelete(id); setConfirmDelete(false); }} className="flex-1">
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
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

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Day {currentDay} <span className="text-muted-foreground font-normal">of {totalDays}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {start.toLocaleDateString()} – {end.toLocaleDateString()}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{completedDays} days done</span>
            <span>{streak} day streak</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </div>

        <div className="mt-3 flex gap-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{subject.icon}</span>
                <span>{Math.round(subject.progress)}%</span>
              </div>
              <Progress value={subject.progress} className="h-1.5" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {status === "active" && currentDay <= totalDays && (
            <Button
              size="sm"
              onClick={() => setSelectedDay(currentDay)}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Continue Day {currentDay}
            </Button>
          )}
          {status === "paused" && (
            <Button size="sm" variant="outline" onClick={() => onResume(id)} className="gap-1.5 text-xs">
              <PlayCircle className="w-3.5 h-3.5" /> Resume
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            className="gap-1.5 text-xs ml-auto"
          >
            {expanded
              ? <>Less <ChevronUp className="w-3.5 h-3.5" /></>
              : <>All Days <ChevronDown className="w-3.5 h-3.5" /></>}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
            {days.map((task) => (
              <button
                key={task.day}
                type="button"
                onClick={() => (task.canAccess || task.isCompleted) && setSelectedDay(task.day)}
                disabled={!task.canAccess && !task.isCompleted}
                title={`Day ${task.day}: ${task.subjectName}`}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center p-0.5",
                  "text-[10px] font-medium transition-all duration-200 border min-w-0",
                  task.isCompleted && "bg-accent/15 border-accent text-accent hover:bg-accent/25",
                  !task.isCompleted && task.canAccess && "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 hover:border-primary",
                  !task.isCompleted && !task.canAccess && "bg-secondary/30 border-border/50 text-muted-foreground opacity-60",
                  task.isCurrent && !task.isCompleted && "ring-1 ring-primary ring-offset-1 ring-offset-background animate-pulse",
                )}
              >
                {task.isCompleted ? (
                  <CheckCircle className="w-3 h-3 shrink-0" />
                ) : !task.canAccess ? (
                  <Lock className="w-2.5 h-2.5 shrink-0" />
                ) : task.isCurrent ? (
                  <Play className="w-2.5 h-2.5 shrink-0" />
                ) : (
                  <span className="text-xs leading-none">{task.subjectIcon}</span>
                )}
                <span className="text-[8px] leading-none mt-0.5 font-bold">{task.day}</span>
              </button>
            ))}
          </div>

          {completedDays >= totalDays && (
            <div className="mt-4 text-center py-4 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl">
              <p className="font-bold text-lg">Session Complete!</p>
              <p className="text-sm text-muted-foreground">All {totalDays} days finished.</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default SyllabusSessionCard;
