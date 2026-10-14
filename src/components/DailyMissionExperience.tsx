import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, CircleHelp, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/types/question";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";
import { prepareRecoveryAttempt, submitMissionAttempt } from "@/lib/daily-mission-engine";

interface DailyMissionExperienceProps {
  mission: DailyMissionRecord;
  questions: Question[];
  history: DailyMissionRecord[];
  onBack: () => void;
  onUpdate: (missionId: string, update: (mission: DailyMissionRecord) => DailyMissionRecord) => void;
  onComplete: (mission: DailyMissionRecord) => void;
}

export function DailyMissionExperience({
  mission,
  questions,
  history,
  onBack,
  onUpdate,
  onComplete,
}: DailyMissionExperienceProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const currentQuestions = useMemo(
    () => mission.currentQuestionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q)),
    [mission.currentQuestionIds, byId],
  );

  useEffect(() => {
    const initial: Record<string, string> = {};
    mission.currentAnswers.forEach((answer) => { initial[answer.questionId] = answer.selectedAnswer; });
    setAnswers(initial);
  }, [mission.id, mission.attemptNumber, mission.stage, mission.currentAnswers]);

  const latestAttempt = mission.attempts[mission.attempts.length - 1];
  const latestAnswers = new Map((latestAttempt?.answers ?? []).map((answer) => [answer.questionId, answer]));

  const beginQuestions = () => {
    onUpdate(mission.id, (current) => ({
      ...current,
      stage: "quiz",
      currentAnswers: [],
      updatedAt: new Date().toISOString(),
    }));
  };

  const submit = () => {
    const submitted = mission.currentQuestionIds.map((questionId) => ({
      questionId,
      selectedAnswer: answers[questionId] ?? "",
      isCorrect: false,
    }));
    const result = submitMissionAttempt(mission, questions, submitted);
    onUpdate(mission.id, () => result);
    if (result.stage === "completed") onComplete(result);
  };

  const retry = () => {
    const next = prepareRecoveryAttempt(mission, questions, history);
    onUpdate(mission.id, () => next);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <Button variant="ghost" onClick={onBack} className="-ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>

        <Card className="overflow-hidden border-border">
          <div className="bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{mission.localDate}</Badge>
              <Badge variant="secondary">Day {mission.syllabusDay}</Badge>
              <Badge variant="outline">{mission.difficulty} difficulty</Badge>
              {mission.stage === "completed" && <Badge className="bg-emerald-600">Completed</Badge>}
            </div>
            <h1 className="mt-4 text-2xl font-bold md:text-3xl">{mission.topicName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One focused lesson, then questions. You need at least 70% accuracy to complete today's mission.
            </p>
          </div>
        </Card>

        {mission.stage === "lesson" && (
          <Card className="space-y-5 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick lesson</p>
                <h2 className="text-xl font-semibold">{mission.lessonTitle}</h2>
              </div>
            </div>
            <div className="whitespace-pre-line leading-7 text-foreground/90">{mission.lessonText}</div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Read the lesson, explain the main idea in your own words, then test your understanding.
            </div>
            <Button onClick={beginQuestions} className="w-full gap-2 sm:w-auto">
              <Target className="h-4 w-4" /> Start {mission.currentQuestionIds.length} questions
            </Button>
          </Card>
        )}

        {mission.stage === "quiz" && (
          <Card className="space-y-6 p-6 md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attempt {mission.attemptNumber}</p>
              <h2 className="mt-1 text-xl font-semibold">Check your understanding</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose one answer for each question. Unanswered questions count as incorrect.</p>
            </div>
            {currentQuestions.length === 0 ? (
              <div className="rounded-xl border border-destructive/30 p-4 text-sm">
                The saved question set is unavailable. Return to the dashboard and reopen today's mission.
              </div>
            ) : currentQuestions.map((question, index) => (
              <fieldset key={question.id} className="space-y-3 rounded-xl border border-border p-4">
                <legend className="px-2 text-sm font-semibold">Question {index + 1} of {currentQuestions.length}</legend>
                <p className="leading-6">{question.question}</p>
                <div className="space-y-2">
                  {(question.options ?? []).map((option) => (
                    <label
                      key={option.label}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${answers[question.id] === option.label ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <input
                        type="radio"
                        name={`mission-${mission.id}-${question.id}`}
                        value={option.label}
                        checked={answers[question.id] === option.label}
                        onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option.label }))}
                        className="mt-1 accent-primary"
                      />
                      <span className="text-sm"><strong>{option.label}.</strong> {option.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <Button onClick={submit} disabled={currentQuestions.length === 0} className="w-full gap-2 sm:w-auto">
              <CheckCircle2 className="h-4 w-4" /> Submit answers
            </Button>
          </Card>
        )}

        {mission.stage === "recovery" && (
          <Card className="space-y-5 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3"><CircleHelp className="h-5 w-5 text-amber-600" /></div>
              <div>
                <h2 className="text-xl font-semibold">Let's strengthen this topic</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You scored {latestAttempt?.accuracy ?? 0}%. The mission stays open. Review the explanations, then try a fresh targeted set.
                </p>
              </div>
            </div>
            {mission.currentQuestionIds.map((questionId, index) => {
              const question = byId.get(questionId);
              const answer = latestAnswers.get(questionId);
              if (!question || answer?.isCorrect) return null;
              const correctOption = question.options?.find((option) => option.label.toUpperCase() === question.correctAnswer.toUpperCase());
              return (
                <div key={questionId} className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review question {index + 1}</p>
                  <p className="font-medium">{question.question}</p>
                  <p className="text-sm"><span className="font-semibold">Correct answer:</span> {question.correctAnswer}{correctOption ? ` — ${correctOption.text}` : ""}</p>
                  {question.explanation && <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{question.explanation}</p>}
                </div>
              );
            })}
            <Button onClick={retry} className="w-full gap-2 sm:w-auto">
              <RotateCcw className="h-4 w-4" /> Try a new targeted set
            </Button>
          </Card>
        )}

        {mission.stage === "completed" && (
          <Card className="space-y-5 p-6 text-center md:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold">Today's mission complete!</h2>
            <p className="text-muted-foreground">
              You reached the 70% target. Best accuracy: {mission.bestAccuracy ?? latestAttempt?.accuracy ?? 0}%.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Attempts</p>
                <p className="text-2xl font-bold">{mission.attempts.length}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Best accuracy</p>
                <p className="text-2xl font-bold">{mission.bestAccuracy ?? 0}%</p>
              </div>
            </div>
            <Button onClick={onBack} className="w-full sm:w-auto">Return to dashboard</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
