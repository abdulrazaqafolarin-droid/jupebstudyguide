import { useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, CheckCircle, Lock, MessageCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import QuestionMath from "@/components/QuestionMath";

interface SyllabusDayLayoutProps {
  day: number;
  subjectName: string;
  subjectIcon: string;
  subjectClassName?: string;
  isCompleted: boolean;
  masteryScore?: number;
  canAdvance: boolean;
  topics: ReactNode;
  topicCount: number;
  learningObjectives: string[];
  checkpointQuestions: string[];
  onComplete: (masteryScore: number) => void;
  onBack: () => void;
}

/**
 * The shared JUPEB/JAMB day-lesson frame. Topic data and tutor behaviour are
 * supplied by each programme; the UI, order, font scale and controls are one
 * implementation.
 */
export function SyllabusDayLayout({
  day,
  subjectName,
  subjectIcon,
  subjectClassName,
  isCompleted,
  masteryScore,
  canAdvance,
  topics,
  topicCount,
  learningObjectives,
  checkpointQuestions,
  onComplete,
  onBack,
}: SyllabusDayLayoutProps) {
  const [selfAssessment, setSelfAssessment] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [showMasteryCheck, setShowMasteryCheck] = useState(false);
  const checkedCount = Object.values(selfAssessment).filter(Boolean).length;
  const allObjectivesChecked = learningObjectives.length > 0 &&
    learningObjectives.every((_, index) => selfAssessment[`obj-${index}`]);

  const complete = () => {
    const score = learningObjectives.length > 0
      ? (checkedCount / learningObjectives.length) * 100
      : 100;
    onComplete(Math.round(score));
  };

  if (!canAdvance && !isCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Day Locked</h2>
            <p className="text-muted-foreground mb-4">
              Complete the previous day with at least 70% mastery to unlock this day.
            </p>
            <Button onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium",
                subjectClassName ?? `subject-${subjectName.toLowerCase().replace(/\s+/g, "-")}`,
              )}>
                {subjectIcon} Day {day}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              {isCompleted ? (
                <span className="flex items-center gap-1 text-accent">
                  <CheckCircle className="w-4 h-4" /> Completed
                </span>
              ) : "In Progress"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl">Day {day} Learning Plan</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {topicCount > 0 ? `${topicCount} topic(s) to cover` : "Review and practice day"}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>{topics}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {learningObjectives.map((objective, index) => (
                <label key={index} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={Boolean(selfAssessment[`obj-${index}`])}
                    onChange={() => setSelfAssessment((previous) => ({
                      ...previous,
                      [`obj-${index}`]: !previous[`obj-${index}`],
                    }))}
                    className="mt-1 rounded border-border"
                  />
                  <span className={cn(
                    "text-sm transition-colors",
                    selfAssessment[`obj-${index}`]
                      ? "text-accent line-through"
                      : "text-foreground group-hover:text-primary",
                  )}>
                    <QuestionMath inline content={objective} />
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <Progress
                value={learningObjectives.length > 0 ? (checkedCount / learningObjectives.length) * 100 : 0}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {checkedCount} of {learningObjectives.length} objectives completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
              Self-Check Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkpointQuestions.map((question, index) => (
              <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  <QuestionMath inline content={question} />
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write your notes, key insights, or questions here..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {!isCompleted && (
          <div className="sticky bottom-4">
            <Button
              onClick={() => allObjectivesChecked ? complete() : setShowMasteryCheck(true)}
              disabled={checkedCount === 0}
              className="w-full py-6 text-lg gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Complete Day {day}
            </Button>
            {showMasteryCheck && !allObjectivesChecked && (
              <p className="text-center text-sm text-destructive mt-2">
                Please complete all learning objectives before marking this day as complete.
              </p>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Day Completed - {masteryScore ?? 100}% Mastery</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SyllabusDayLayout;
