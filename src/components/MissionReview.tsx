import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SUBJECT_INFO, type Question } from "@/types/question";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";
import { buildMissionReview } from "@/lib/mission-review";
import QuestionMath from "@/components/QuestionMath";

interface MissionReviewProps {
  mission: DailyMissionRecord;
  questions: Question[];
  onBack: () => void;
}

/**
 * Read-only review of a saved mission — the surface previous missions open
 * in. Every question from the best attempt with what the student chose, the
 * correct answer, and the explanation. No mutation callbacks: history is
 * never rewritten from this screen.
 */
export function MissionReview({ mission, questions, onBack }: MissionReviewProps) {
  const review = useMemo(() => buildMissionReview(mission, questions), [mission, questions]);
  const completed = mission.stage === "completed";

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
              {completed ? (
                <Badge className="bg-emerald-600">
                  Completed{review.accuracy != null ? ` · ${review.accuracy}%` : ""}
                </Badge>
              ) : (
                <Badge variant="outline">Unfinished · saved</Badge>
              )}
              {mission.attempts.length > 0 && (
                <Badge variant="outline">
                  {mission.attempts.length} attempt{mission.attempts.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold md:text-3xl">
              <QuestionMath inline content={mission.topicName} />
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saved record of this mission — every question, your answer, and the correct one.
            </p>
          </div>
        </Card>

        {review.items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No questions were saved for this mission, so there's nothing to review yet.
          </Card>
        ) : (
          <Card className="space-y-5 p-6 md:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question review
              </p>
              {review.accuracy != null && (
                <span className="text-sm font-semibold">{review.accuracy}%</span>
              )}
            </div>

            {review.items.map(({ question, selectedAnswer, isCorrect }, index) => (
              <div key={question.id} className="space-y-2 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Question {index + 1} of {review.items.length} ·{" "}
                    {SUBJECT_INFO[question.subject]?.name ?? question.subject}
                  </p>
                  {selectedAnswer == null ? (
                    <span className="text-xs text-muted-foreground">Not answered</span>
                  ) : (
                    <Badge
                      variant={isCorrect ? "secondary" : "destructive"}
                      className={cn(isCorrect && "bg-emerald-600 text-white")}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  )}
                </div>

                <p className="font-medium">
                  <QuestionMath inline content={question.question} />
                </p>

                <div className="space-y-2">
                  {(question.options ?? []).map((option) => {
                    const isCorrectOption =
                      option.label.toUpperCase() === (question.correctAnswer ?? "").toUpperCase();
                    const isUserOption =
                      selectedAnswer != null && option.label.toUpperCase() === selectedAnswer.toUpperCase();
                    return (
                      <div
                        key={option.label}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          isCorrectOption && "border-emerald-500/50 bg-emerald-500/10",
                          isUserOption && !isCorrectOption && "border-destructive/50 bg-destructive/5",
                          !isCorrectOption && !isUserOption && "border-border",
                        )}
                      >
                        <span className="min-w-0 flex-1 text-sm">
                          <strong>{option.label}.</strong>{" "}
                          <QuestionMath inline content={option.text} />
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {isUserOption && (
                            <Badge variant="outline" className="text-[10px]">
                              Your answer
                            </Badge>
                          )}
                          {isCorrectOption && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/50 text-[10px] text-emerald-600"
                            >
                              Correct
                            </Badge>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {question.explanation && (
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation: </span>
                    <QuestionMath inline content={question.explanation} />
                  </p>
                )}
              </div>
            ))}

            {review.missingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {review.missingCount} question{review.missingCount === 1 ? "" : "s"} from this
                mission {review.missingCount === 1 ? "is" : "are"} no longer in the question bank.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default MissionReview;
