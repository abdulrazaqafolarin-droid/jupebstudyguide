import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { SUBJECT_INFO, Subject } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";
import { missionStreak } from "@/lib/daily-mission";
import {
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Flame,
  Lock,
  Play,
  Target,
  Trophy,
} from "lucide-react";

interface DailyMissionCardProps {
  /** Most recent active study session, or null when the student has none. */
  session: StudySessionData | null;
  /** Today's pending task from the session, or null. */
  todayTask: DailyTask | null;
  /** Pre-ticked electives derived from the student's studied subjects. */
  suggestedElectives: { biology: boolean; math: boolean };
  onStartMission: (subjects: Subject[]) => void;
  onCompleteDay: (sessionId: string, day: number, masteryScore: number) => void;
  onViewPlan: () => void;
}

function TopicLine({ task }: { task: DailyTask }) {
  const names = task.topics.slice(0, 2).map((t) => t.name);
  if (names.length === 0) return <span>Review day — practice past questions</span>;
  return (
    <span>
      {names.join(" · ")}
      {task.topics.length > 2 && ` +${task.topics.length - 2} more`}
    </span>
  );
}

export function DailyMissionCard({
  session,
  todayTask,
  suggestedElectives,
  onStartMission,
  onCompleteDay,
  onViewPlan,
}: DailyMissionCardProps) {
  const [hasBiology, setHasBiology] = useState(suggestedElectives.biology);
  const [hasMath, setHasMath] = useState(suggestedElectives.math);
  const [mastery, setMastery] = useState(80);
  const [confirming, setConfirming] = useState(false);

  const start = () => {
    const subjects: Subject[] = ["physics", "chemistry"];
    if (hasBiology) subjects.push("biology");
    if (hasMath) subjects.push("math");
    onStartMission(subjects);
  };

  return (
    <section aria-label="Daily mission" className="mb-12 animate-in-up stagger-1">
      <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Daily Mission</h2>
            <p className="text-sm text-muted-foreground">
              A fresh task every day, built from the courses you offer
            </p>
          </div>
          {session && (
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              Day {session.progress.currentDay} of {session.progress.dailyTasks.length}
            </Badge>
          )}
        </div>

        {!session && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Physics and Chemistry are included automatically. Tick any other
              courses you offer:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setHasBiology(!hasBiology)}
                aria-pressed={hasBiology}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3",
                  hasBiology
                    ? "border-biology bg-biology/10"
                    : "border-border hover:border-biology/50"
                )}
              >
                <Checkbox checked={hasBiology} className="pointer-events-none" />
                <span className="text-2xl">{SUBJECT_INFO.biology.icon}</span>
                <span className="font-medium">Biology</span>
              </button>
              <button
                onClick={() => setHasMath(!hasMath)}
                aria-pressed={hasMath}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3",
                  hasMath
                    ? "border-math bg-math/10"
                    : "border-border hover:border-math/50"
                )}
              >
                <Checkbox checked={hasMath} className="pointer-events-none" />
                <span className="text-2xl">{SUBJECT_INFO.math.icon}</span>
                <span className="font-medium">Mathematics</span>
              </button>
            </div>
            <Button onClick={start} className="w-full sm:w-auto gap-2">
              <Play className="w-4 h-4" />
              Start My Daily Mission
            </Button>
          </div>
        )}

        {session && todayTask && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  `subject-${todayTask.subject}`
                )}
              >
                {SUBJECT_INFO[todayTask.subject].icon} Day {todayTask.day} ·{" "}
                {SUBJECT_INFO[todayTask.subject].name}
              </span>
              {missionStreak(session) > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4 text-destructive" />
                  {missionStreak(session)} day mission streak
                </span>
              )}
            </div>

            <p className="font-medium">
              <TopicLine task={todayTask} />
            </p>
            <ul className="space-y-1.5">
              {todayTask.learningObjectives.slice(0, 3).map((obj, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>

            {!confirming ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setConfirming(true)} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Mark Day {todayTask.day} Complete
                </Button>
                <Button variant="outline" onClick={onViewPlan} className="gap-1.5">
                  View Full Plan
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Card className="p-4 space-y-3 bg-secondary/30">
                <p className="text-sm font-medium">
                  How well did you master today&apos;s topics? ({mastery}%)
                </p>
                <Slider
                  value={[mastery]}
                  onValueChange={([v]) => setMastery(v)}
                  min={0}
                  max={100}
                  step={5}
                  aria-label="Mastery score"
                />
                {mastery < 70 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Below 70% still completes the day, but the next day stays
                    locked until mastery reaches 70%.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      onCompleteDay(session.id, todayTask.day, mastery);
                      setConfirming(false);
                      setMastery(80);
                    }}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Complete
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            <Progress
              value={session.progress.overallProgress}
              className="h-2"
              aria-label="Overall mission progress"
            />
            <p className="text-xs text-muted-foreground">
              {Math.round(session.progress.overallProgress)}% of your 30-day
              mission complete
            </p>
          </div>
        )}

        {session && !todayTask && (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7 text-accent" />
            </div>
            <p className="font-bold text-lg">
              {session.status === "completed"
                ? "Mission Accomplished!"
                : `Day ${session.progress.currentDay - 1} Complete!`}
            </p>
            <p className="text-sm text-muted-foreground">
              {session.status === "completed"
                ? "You finished all 30 days. Start a new mission to keep the streak alive."
                : "Come back tomorrow for your next mission — or review the full plan."}
            </p>
            <Button variant="outline" onClick={onViewPlan} className="gap-1.5">
              View Full Plan
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default DailyMissionCard;
