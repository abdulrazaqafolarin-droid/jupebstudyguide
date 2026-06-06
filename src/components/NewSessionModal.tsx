import { useState } from 'react';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Plus, X, CalendarDays, Clock, AlertCircle } from 'lucide-react';

interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, subjects: Subject[], startDate: string, dailyGoalMinutes: number) => void;
}

const ALL_SUBJECTS: Subject[] = ['physics', 'chemistry', 'biology', 'math'];
const MAX_SUBJECTS = 2;
const DEFAULT_GOAL = 30;

export function NewSessionModal({ open, onClose, onCreate }: NewSessionModalProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Subject[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_GOAL);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleToggle = (subject: Subject) => {
    setError('');
    setSelected(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      }
      if (prev.length >= MAX_SUBJECTS) {
        setError(`You can select a maximum of ${MAX_SUBJECTS} subjects`);
        return prev;
      }
      return [...prev, subject];
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please enter a session name');
      return;
    }
    if (selected.length === 0) {
      setError('Please select at least one subject');
      return;
    }
    onCreate(name.trim(), selected, startDate, dailyGoal);
    setName('');
    setSelected([]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDailyGoal(DEFAULT_GOAL);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            New Study Session
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              value={name}
              onChange={e => { setError(''); setName(e.target.value); }}
              placeholder="e.g. Physics Deep Dive"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Subjects (select 1 or 2)</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SUBJECTS.map(subject => {
                const info = SUBJECT_INFO[subject];
                const isSelected = selected.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() => handleToggle(subject)}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-sm font-medium">{info.name}</span>
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
                onChange={e => setStartDate(e.target.value)}
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
                onChange={e => setDailyGoal(Number(e.target.value))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-3 text-sm text-center text-muted-foreground">
            {selected.length > 0 ? (
              <span>
                Studying <strong className="text-foreground">{selected.map(s => SUBJECT_INFO[s].name).join(' & ')}</strong>
                {' '}over <strong className="text-foreground">30 days</strong>
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

export default NewSessionModal;
