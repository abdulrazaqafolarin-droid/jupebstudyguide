import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { SUBJECT_INFO, Subject } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";
import { missionStreak } from "@/lib/daily-mission";
import QuestionMath from "@/components/QuestionMath";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  Play,
  Target,
  Trophy,
} from "lucide-react";

interface DailyMissionCardProps {
  session: StudySessionData | null;
  todayTask: DailyTask | null;
  todayMission: DailyMissionRecord | null;
  history: DailyMissionRecord[];
  suggestedElectives: { biology: boolean; math: boolean };
  onStartMission: (subjects: Subject[]) => void;
  onOpenMission: () => void;
  onViewPlan: () => void;
}

function TopicLine({ task }: { task: DailyTask }) {
  const names = task.topics.slice(0, 2).map((topic) => topic.name);
  if (names.length === 0) return <span>Review the syllabus and practise past questions</span>;
  const label = names.join(" · ") + (task.topics.length > 2 ? ` +${task.topics.length - 2} more` : "");
  return <QuestionMath inline content={label} />;
}

export function DailyMissionCard({
  session,
  todayTask,
  todayMission,
  history,
  suggestedElectives,
  onStartMission,
  onOpenMission,
  onViewPlan,
}: DailyMissionCardProps) {
  const [hasBiology, setHasBiology] = useState(suggestedElectives.biology);
  const [hasMath, setHasMath] = useState(suggestedElectives.math);

  useEffect(() => {
    setHasBiology(suggestedElectives.biology);
    setHasMath(suggestedElectives.math);
  }, [suggestedElectives.biology, suggestedElectives.math]);

  const start = () => {
    const subjects: Subject[] = ["physics", "chemistry"];
    if (hasBiology) subjects.push("biology");
    if (hasMath) subjects.push("math");
    onStartMission(subjects);
  };

  const missionCompleted = todayMission?.stage === "completed";

  return (
    <section aria-label="Daily mission" className="mb-12 animate-in-up stagger-1">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-6 md:p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Daily Mission</h2>
            <p className="text-sm text-muted-foreground">A focused lesson, adaptive questions, and recovery when you need it.</p>
          </div>
          {todayMission && (
            <Badge variant={missionCompleted ? "default" : "outline"} className="hidden text-xs sm:inline-flex">
              {missionCompleted ? "Completed today" : `Attempt ${todayMission.attemptNumber}`}
            </Badge>
          )}
        </div>

        <div className="space-y-4 p-6 md:p-8">
          {!session && !todayMission && (
            <>
              <p className="text-sm text-muted-foreground">
                Your first mission starts with the JUPEB syllabus. Physics and Chemistry are included; choose any electives you study.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHasBiology((value) => !value)}
                  aria-pressed={hasBiology}
                  className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all", hasBiology ? "border-biology bg-biology/10" : "border-border hover:border-biology/50")}
                >
                  <Checkbox checked={hasBiology} className="pointer-events-none" />
                  <span className="text-2xl">{SUBJECT_INFO.biology.icon}</span>
                  <span className="font-medium">Biology</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasMath((value) => !value)}
                  aria-pressed={hasMath}
                  className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all", hasMath ? "border-math bg-math/10" : "border-border hover:border-math/50")}
                >
                  <Checkbox checked={hasMath} className="pointer-events-none" />
                  <span className="text-2xl">{SUBJECT_INFO.math.icon}</span>
                  <span className="font-medium">Mathematics</span>
                </button>
              </div>
              <Button onClick={start} className="w-full gap-2 sm:w-auto">
                <Play className="h-4 w-4" /> Start my first mission
              </Button>
            </>
          )}

          {todayMission && missionCompleted && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Mission complete</Badge>
                <span className="text-sm text-muted-foreground"><QuestionMath inline content={todayMission.topicName} /></span>
              </div>
              <div>
                <p className="text-3xl font-bold">{todayMission.bestAccuracy ?? 0}%</p>
                <p className="text-sm text-muted-foreground">Best accuracy today · {todayMission.attempts.length} attempt(s)</p>
              </div>
              <p className="text-sm text-muted-foreground">Your next daily mission will be ready on your next local calendar day. You can still review your syllabus plan.</p>
              <Button variant="outline" onClick={onViewPlan} className="gap-2">View full plan <ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}

          {!session && todayMission && !missionCompleted && (
            <div className="space-y-4">
              <p className="font-medium"><QuestionMath inline content={todayMission.topicName} /></p>
              <p className="text-sm text-muted-foreground">Your mission is saved for today. Continue where you left off.</p>
              <Button onClick={onOpenMission} className="gap-2">
                <Play className="h-4 w-4" /> Continue today's mission
              </Button>
            </div>
          )}

          {session && !missionCompleted && todayTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-3 py-1.5 text-sm font-medium", `subject-${todayTask.subject}`)}>
                  {SUBJECT_INFO[todayTask.subject].icon} Day {todayTask.day} · {SUBJECT_INFO[todayTask.subject].name}
                </span>
                {missionStreak(session) > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Flame className="h-4 w-4 text-destructive" /> {missionStreak(session)} day mission streak
                  </span>
                )}
              </div>
              <p className="font-medium">{todayMission ? <QuestionMath inline content={todayMission.topicName} /> : <TopicLine task={todayTask} />}</p>
              <ul className="space-y-2">
                {todayTask.learningObjectives.slice(0, 3).map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <QuestionMath inline content={objective} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={onOpenMission} className="gap-2">
                  <Play className="h-4 w-4" /> {todayMission ? "Continue today's mission" : "Start today's lesson"}
                </Button>
                <Button variant="outline" onClick={onViewPlan} className="gap-1.5">
                  View full plan <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={session.progress.overallProgress} className="h-2" aria-label="Syllabus progress" />
              <p className="text-xs text-muted-foreground">{Math.round(session.progress.overallProgress)}% of your 30-day syllabus plan complete</p>
            </div>
          )}

          {session && !todayTask && !missionCompleted && (
            <div className="space-y-3 py-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
                <Trophy className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-bold">Syllabus plan complete!</h3>
              <p className="text-sm text-muted-foreground">You finished the current 30-day plan. Review your history or start another plan.</p>
              <Button variant="outline" onClick={onViewPlan}>View full plan</Button>
            </div>
          )}

          {history.filter((mission) => mission.id !== todayMission?.id).length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-semibold">Previous missions</h3>
              <div className="space-y-2">
                {[...history]
                  .filter((mission) => mission.id !== todayMission?.id)
                  .sort((a, b) => b.localDate.localeCompare(a.localDate))
                  .slice(0, 3)
                  .map((mission) => (
                    <div key={mission.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium"><QuestionMath inline content={mission.topicName} /></p>
                        <p className="text-xs text-muted-foreground">{mission.localDate} · Day {mission.syllabusDay}</p>
                      </div>
                      <Badge variant={mission.stage === "completed" ? "secondary" : "outline"} className="shrink-0">
                        {mission.stage === "completed"
                          ? `Completed · ${mission.bestAccuracy ?? 0}%`
                          : "Unfinished · saved"}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DailyMissionCard;
