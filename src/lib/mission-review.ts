import type { Question } from "@/types/question";
import type { DailyMissionRecord } from "@/lib/daily-mission-engine";

export interface MissionReviewItem {
  question: Question;
  /** The option label the student picked, or null when unanswered. */
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export interface MissionReview {
  /** Which answer set the review is built from. */
  source: "best-attempt" | "saved";
  /** 1-based attempt number of the scored attempt, when one exists. */
  attemptNumber: number | null;
  /** Accuracy of that attempt (falls back to the mission best). */
  accuracy: number | null;
  items: MissionReviewItem[];
  /** Attempted questions whose text no longer exists in the question bank. */
  missingCount: number;
}

/**
 * Build a read-only review of a (usually past) daily mission: every question
 * from the student's best attempt — or the saved in-progress set when the
 * mission never reached a submission — paired with what they chose and
 * whether it was right. Pure so it can be tested without React.
 */
export function buildMissionReview(
  mission: DailyMissionRecord,
  questions: Question[],
): MissionReview {
  const byId = new Map(questions.map((question) => [question.id, question]));

  let best: DailyMissionRecord["attempts"][number] | null = null;
  for (const attempt of mission.attempts) {
    if (!best || attempt.accuracy > best.accuracy) best = attempt;
  }

  const questionIds = best?.questionIds ?? mission.currentQuestionIds;
  const answers = best?.answers ?? mission.currentAnswers;
  const answerById = new Map(answers.map((answer) => [answer.questionId, answer]));

  const items: MissionReviewItem[] = [];
  let missingCount = 0;
  for (const questionId of questionIds) {
    const question = byId.get(questionId);
    if (!question) {
      missingCount++;
      continue;
    }
    const stored = answerById.get(questionId);
    const selectedAnswer = stored?.selectedAnswer?.trim() ? stored.selectedAnswer : null;
    // Stored correctness wins (the engine graded it); the correctAnswer
    // fallback covers saved in-progress sets whose flags are always false.
    const isCorrect = Boolean(
      stored?.isCorrect ||
        (selectedAnswer &&
          question.correctAnswer &&
          selectedAnswer.toUpperCase() === question.correctAnswer.toUpperCase()),
    );
    items.push({ question, selectedAnswer, isCorrect });
  }

  return {
    source: best ? "best-attempt" : "saved",
    attemptNumber: best ? mission.attempts.indexOf(best) + 1 : null,
    accuracy: best ? best.accuracy : mission.bestAccuracy,
    items,
    missingCount,
  };
}
