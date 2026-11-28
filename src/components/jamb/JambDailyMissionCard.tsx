import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardPanelShell } from "@/components/DashboardPanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays, CheckCircle2, ClipboardList, Flame, Play, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getJambMissionSummary,
  jambLocalDateKey,
  type JambDailyMissionRecord,
} from "@/lib/jamb-daily-mission";
import { JAMB_SUBJECT_INFO } from "@/lib/jamb-config";

interface JambDailyMissionCardProps {
  history: JambDailyMissionRecord[];
  ready: boolean;
}

function missionStreak(history: JambDailyMissionRecord[]) {
  const completedDates = new Set(
    history.filter((mission) => mission.status === "completed").map((mission) => mission.localDate),
  );
  const cursor = new Date();
  if (!completedDates.has(jambLocalDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (completedDates.has(jambLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatMissionDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** JAMB data adapter rendered through the same JUPEB daily-mission panel shell. */
export function JambDailyMissionCard({ history, ready }: JambDailyMissionCardProps) {
  const navigate = useNavigate();
  const [showAllPrevious, setShowAllPrevious] = useState(false);
  const today = jambLocalDateKey();

  const todayMissions = useMemo(
    () => history.filter((mission) => mission.localDate === today)
      .sort((a, b) => a.subject.localeCompare(b.subject)),
    [history, today],
  );
  const activeMission = todayMissions.find((mission) => mission.status === "in_progress") ?? null;
  const latestMission = activeMission ?? todayMissions[0] ?? null;
  const completedToday = todayMissions.length > 0 && todayMissions.every((mission) => mission.status === "completed");
  const todayTotals = todayMissions
    .map(getJambMissionSummary)
    .reduce((total, result) => ({
      questions: total.questions + result.totalQuestions,
      answered: total.answered + result.answeredQuestions,
      checked: total.checked + result.checkedQuestions,
      graded: total.graded + result.gradableQuestions,
      correct: total.correct + result.correctAnswers,
    }), { questions: 0, answered: 0, checked: 0, graded: 0, correct: 0 });
  const todayAccuracy = todayTotals.graded > 0
    ? Math.round((todayTotals.correct / todayTotals.graded) * 100)
    : null;
  const streak = missionStreak(history);

  const week = useMemo(() => {
    const byDate = new Map<string, JambDailyMissionRecord[]>();
    for (const mission of history) {
      const current = byDate.get(mission.localDate) ?? [];
      current.push(mission);
      byDate.set(mission.localDate, current);
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const date = jambLocalDateKey(day);
      const missions = byDate.get(date) ?? [];
      const results = missions.map(getJambMissionSummary);
      const graded = results.reduce((sum, result) => sum + result.gradableQuestions, 0);
      const correct = results.reduce((sum, result) => sum + result.correctAnswers, 0);
      return {
        date,
        label: dayNames[day.getDay()],
        accuracy: graded > 0 ? Math.round((correct / graded) * 100) : null,
        state: missions.length === 0
          ? "none" as const
          : missions.every((mission) => mission.status === "completed")
            ? "done" as const
            : "partial" as const,
      };
    });
  }, [history]);

  const previousMissions = useMemo(
    () => history
      .filter((mission) => mission.localDate !== today)
      .sort((a, b) => b.localDate.localeCompare(a.localDate) || b.updatedAt.localeCompare(a.updatedAt)),
    [history, today],
  );
  const visiblePrevious = showAllPrevious ? previousMissions : previousMissions.slice(0, 3);

  return (
    <DashboardPanelShell
      icon={CalendarDays}
      title="Daily Mission"
      description="A focused practice set with adaptive questions."
      trailing={latestMission ? (
        <Badge variant={completedToday ? "default" : "outline"} className="hidden text-xs sm:inline-flex">
          {completedToday ? "Completed today" : "In progress"}
        </Badge>
      ) : null}
      ariaLabel="Daily mission"
    >
      {!ready ? (
        <div className="py-3 text-sm text-muted-foreground">Restoring today's mission…</div>
      ) : !latestMission ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose a subject and practise with up to 10 reviewed questions.</p>
          <Button onClick={() => navigate("/jamb/daily-mission")} className="w-full gap-2 sm:w-auto">
            <Play className="h-4 w-4" /> Start today's mission
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={completedToday ? "gap-1 bg-emerald-600" : "gap-1"} variant={completedToday ? "default" : "outline"}>
              {completedToday ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
              {completedToday ? "Mission complete" : "Today's mission"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {JAMB_SUBJECT_INFO[latestMission.subject].label}
              {todayMissions.length > 1 ? ` · +${todayMissions.length - 1} other subject(s)` : ""}
            </span>
          </div>

          {completedToday ? (
            <div>
              <p className="text-3xl font-bold">{todayAccuracy === null ? "—" : `${todayAccuracy}%`}</p>
              <p className="text-sm text-muted-foreground">
                {todayAccuracy === null
                  ? "No graded answers yet"
                  : `Accuracy · ${todayTotals.graded} graded`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{todayTotals.answered} of {todayTotals.questions} answered</span>
                <span>{todayTotals.checked} checked</span>
              </div>
              <Progress
                value={todayTotals.questions > 0 ? (todayTotals.answered / todayTotals.questions) * 100 : 0}
                className="h-2"
              />
            </div>
          )}

          <Button
            variant={completedToday ? "outline" : "default"}
            onClick={() => navigate(`/jamb/daily-mission/${latestMission.id}`)}
            className="w-full gap-2 sm:w-auto"
          >
            {completedToday ? <ClipboardList className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {completedToday ? "Review today's questions" : "Continue today's mission"}
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">This week</h3>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-destructive" /> {streak} day streak
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2" aria-label="JAMB mission results for the last seven days">
            {week.map(({ date, label, accuracy, state }) => (
              <div
                key={date}
                className="flex flex-1 flex-col items-center gap-1"
                title={state === "none" ? `${date} · no mission` : `${date} · ${accuracy === null ? "not graded" : `${accuracy}%`}`}
              >
                <div className="flex h-14 w-full max-w-7 items-end rounded-md bg-muted/40 px-0.5">
                  <div
                    className={cn(
                      "w-full rounded-sm",
                      state === "done" ? "bg-emerald-500" : state === "partial" ? "bg-amber-500" : "bg-border",
                    )}
                    style={{ height: `${Math.max(8, accuracy ?? 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previousMissions.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Previous missions</h3>
            {previousMissions.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowAllPrevious((value) => !value)}
              >
                {showAllPrevious ? "Show fewer" : `View all ${previousMissions.length}`}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {visiblePrevious.map((mission) => {
              const result = getJambMissionSummary(mission);
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => navigate(`/jamb/daily-mission/${mission.id}`)}
                  aria-label={`Review ${JAMB_SUBJECT_INFO[mission.subject].label} mission from ${mission.localDate}`}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3 text-left transition-[transform,border-color] duration-150 hover:border-primary/40 active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{JAMB_SUBJECT_INFO[mission.subject].label}</p>
                    <p className="text-xs text-muted-foreground">{formatMissionDate(mission.localDate)}</p>
                  </div>
                  <Badge variant={mission.status === "completed" ? "secondary" : "outline"} className="shrink-0">
                    {mission.status === "completed"
                      ? `Completed · ${result.accuracy === null ? "—" : `${result.accuracy}%`}`
                      : "In progress · saved"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </DashboardPanelShell>
  );
}

export default JambDailyMissionCard;
