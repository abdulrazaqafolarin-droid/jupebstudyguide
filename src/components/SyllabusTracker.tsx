import React, { useState } from 'react';
import { SyllabusProgress, DailyTask, SyllabusTopic } from '@/types/syllabus';
import { SUBJECT_INFO } from '@/types/question';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CheckCircle,
  Lock,
  Play,
  Trophy,
  Flame,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import SyllabusDayView from './SyllabusDayView';
import { AITutor } from './AITutor';
import { Question, Subject } from '@/types/question';
import SubjectReorder from './SubjectReorder';

interface SyllabusTrackerProps {
  progress: SyllabusProgress;
  onCompleteDay: (day: number, masteryScore: number) => void;
  canAdvanceToDay: (day: number) => boolean;
  onReorderSubjects?: (ordered: Subject[]) => void;
  onReset: () => void;
  onBack: () => void;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({
  progress,
  onCompleteDay,
  canAdvanceToDay,
  onReorderSubjects,
  onReset,
  onBack,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAITutor, setShowAITutor] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState<Question | null>(null);

  const completedDays = progress.dailyTasks.filter(t => t.isCompleted).length;
  const currentStreak = calculateStreak(progress.dailyTasks);

  const handleAskTutor = (topic: SyllabusTopic, question: string) => {
    setTutorQuestion({
      id: topic.id,
      subject: progress.dailyTasks.find(t => t.topics.includes(topic))?.subject || 'physics',
      year: new Date().getFullYear(),
      type: 'essay',
      topic: topic.name,
      question: question,
      correctAnswer: '',
      explanation: topic.description,
    });
    setShowAITutor(true);
  };

  if (selectedDay !== null) {
    const task = progress.dailyTasks.find(t => t.day === selectedDay);
    if (task) {
      return (
        <>
          <SyllabusDayView
            task={task}
            canAdvance={canAdvanceToDay(selectedDay)}
            onComplete={(score) => {
              onCompleteDay(selectedDay, score);
              setSelectedDay(null);
            }}
            onBack={() => setSelectedDay(null)}
            onAskTutor={handleAskTutor}
          />
          {showAITutor && tutorQuestion && (
            <AITutor
              question={tutorQuestion}
              isOpen={showAITutor}
              onClose={() => setShowAITutor(false)}
            />
          )}
        </>
      );
    }
  }

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
              30-Day JUPEB Syllabus
            </h1>

            <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-3xl font-bold">{completedDays}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Days Completed</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-destructive/5 border-destructive/20">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                <Flame className="w-5 h-5" />
                <span className="text-3xl font-bold">{currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-accent/5 border-accent/20">
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-accent mb-2">
                <Trophy className="w-5 h-5" />
                <span className="text-3xl font-bold">{Math.round(progress.overallProgress)}%</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Total Completion</span>
                <span className="text-primary font-bold">{Math.round(progress.overallProgress)}%</span>
              </div>
              <Progress value={progress.overallProgress} className="h-3" />
            </div>
            
            {/* Per-subject progress */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(progress.subjectProgress).map(([subject, percent]) => {
                const info = SUBJECT_INFO[subject as keyof typeof SUBJECT_INFO];
                if (!info) return null;
                
                const allSubjects = [...progress.combination.core, ...progress.combination.elective];
                if (!allSubjects.includes(subject as Subject)) return null;
                
                return (
                  <div key={subject} className="space-y-2 p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="text-lg">{info.icon}</span>
                        <span>{info.name}</span>
                      </span>
                      <span className="text-muted-foreground">{Math.round(percent)}%</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subject reorder */}
        {onReorderSubjects && (
          <div className="flex justify-end">
            <SubjectReorder
              subjects={[...progress.combination.core, ...progress.combination.elective] as Subject[]}
              onApply={onReorderSubjects}
            />
          </div>
        )}

        {/* Day Grid */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              📅 Daily Learning Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
              {progress.dailyTasks.map(task => {
                const canAccess = canAdvanceToDay(task.day);
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
          </CardContent>
        </Card>

        {/* Continue Button */}
        {progress.currentDay <= 30 && (
          <Button
            onClick={() => setSelectedDay(progress.currentDay)}
            className="w-full py-7 text-lg gap-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg"
          >
            <Play className="w-6 h-6" />
            Continue Day {progress.currentDay}
          </Button>
        )}

        {completedDays >= 30 && (
          <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
            <CardContent className="pt-8 pb-8 text-center">
              <Trophy className="w-20 h-20 mx-auto text-accent mb-4" />
              <h2 className="text-3xl font-bold mb-3">Congratulations! 🎉</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You've completed the entire 30-day JUPEB syllabus! You're now ready for your exams.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

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
  const todayMs = today.getTime();
  
  const diff = Math.round((todayMs - dates[0]) / (1000 * 60 * 60 * 24));
  if (diff > 1) return 0;
  
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));
    if (gap === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

export default SyllabusTracker;