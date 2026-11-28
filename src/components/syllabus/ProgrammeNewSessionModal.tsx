import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AlertCircle, CalendarDays, Clock, Plus, X } from "lucide-react";
import type { SyllabusSubjectChoice } from "@/components/syllabus/ProgrammeSyllabusSetup";

interface ProgrammeNewSessionModalProps<T extends string> {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, subjects: T[], startDate: string, dailyGoalMinutes: number) => void;
  fixedSubjects?: SyllabusSubjectChoice<T>[];
  selectableSubjects: SyllabusSubjectChoice<T>[];
  minimumSelections: number;
  maximumSelections: number;
  defaultGoalMinutes?: number;
  subjectLabel?: string;
}

function todayLocalDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Shared JUPEB/JAMB new-session modal with programme-specific selection rules. */
export function ProgrammeNewSessionModal<T extends string>({
  open,
  onClose,
  onCreate,
  fixedSubjects = [],
  selectableSubjects,
  minimumSelections,
  maximumSelections,
  defaultGoalMinutes = 30,
  subjectLabel,
}: ProgrammeNewSessionModalProps<T>) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<T[]>([]);
  const [startDate, setStartDate] = useState(todayLocalDate());
  const [dailyGoal, setDailyGoal] = useState(defaultGoalMinutes);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleToggle = (subject: T) => {
    setError("");
    setSelected((previous) => {
      if (previous.includes(subject)) return previous.filter((item) => item !== subject);
      if (previous.length >= maximumSelections) {
        setError(`You can select a maximum of ${maximumSelections} subjects`);
        return previous;
      }
      return [...previous, subject];
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Please enter a session name");
      return;
    }
    if (selected.length < minimumSelections || selected.length > maximumSelections) {
      setError(
        minimumSelections === maximumSelections
          ? `Please select exactly ${minimumSelections} subjects`
          : `Please select between ${minimumSelections} and ${maximumSelections} subjects`,
      );
      return;
    }
    if (!startDate || !Number.isFinite(Date.parse(startDate))) {
      setError("Please choose a valid start date");
      return;
    }
    if (!Number.isInteger(dailyGoal) || dailyGoal < 5 || dailyGoal > 480) {
      setError("Daily study goal must be between 5 and 480 minutes");
      return;
    }
    onCreate(name.trim(), [...fixedSubjects.map((subject) => subject.id), ...selected], startDate, dailyGoal);
    setName("");
    setSelected([]);
    setStartDate(todayLocalDate());
    setDailyGoal(defaultGoalMinutes);
    setError("");
  };

  const allSelected = [...fixedSubjects, ...selectableSubjects.filter((subject) => selected.includes(subject.id))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            New Study Session
          </h2>
          <button type="button" onClick={onClose} aria-label="Close new study session" className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(event) => { setError(""); setName(event.target.value); }}
              placeholder="e.g. Physics Deep Dive"
              className="w-full"
              maxLength={64}
            />
          </div>

          <div className="space-y-2">
            <Label>{subjectLabel ?? `Subjects (select ${minimumSelections} or ${maximumSelections})`}</Label>
            <div className="grid grid-cols-2 gap-2">
              {fixedSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="p-3 rounded-xl border-2 border-primary bg-primary/10 text-left flex items-center gap-2"
                >
                  <Checkbox checked disabled className="pointer-events-none" />
                  <span className="text-lg">{subject.icon}</span>
                  <span className="text-sm font-medium">{subject.name}</span>
                </div>
              ))}
              {selectableSubjects.map((subject) => {
                const isSelected = selected.includes(subject.id);
                const limitReached = !isSelected && selected.length >= maximumSelections;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={limitReached}
                    onClick={() => handleToggle(subject.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2",
                      isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                      limitReached && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <span className="text-lg">{subject.icon}</span>
                    <span className="text-sm font-medium">{subject.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full h-10 pl-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily-goal">Daily Study Goal (minutes)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="daily-goal"
                type="number"
                min={5}
                max={480}
                value={dailyGoal}
                onChange={(event) => setDailyGoal(Number(event.target.value))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-3 text-sm text-center text-muted-foreground">
            {allSelected.length > 0 ? (
              <span>
                Studying <strong className="text-foreground">{allSelected.map((subject) => subject.name).join(" & ")}</strong>
                {" "}over <strong className="text-foreground">30 days</strong>
                {dailyGoal > 0 && <> — <strong className="text-foreground">{dailyGoal} min/day</strong></>}
              </span>
            ) : (
              <span>Select subjects to begin</span>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1 gap-2">
              <Plus className="w-4 h-4" />
              Create Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgrammeNewSessionModal;
