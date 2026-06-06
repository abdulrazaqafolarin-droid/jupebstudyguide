import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ScoreReason =
  | "answered_question"
  | "correct_answer"
  | "streak_day"
  | "syllabus_day"
  | "achievement"
  | "quiz_complete";

const SCORE_VALUES: Record<ScoreReason, number> = {
  answered_question: 5,
  correct_answer: 10,
  streak_day: 20,
  syllabus_day: 50,
  achievement: 100,
  quiz_complete: 25,
};

export function useScoreAwarder() {
  const { user } = useAuth();
  const pendingRef = useRef<Map<string, Promise<unknown>>>(new Map());

  const award = useCallback(
    async (
      reason: ScoreReason,
      referenceKey: string,
      extraAmount?: number
    ): Promise<boolean> => {
      if (!user) return false;

      const refId = `${reason}:${referenceKey}:${user.id}`;

      // Deduplicate in-flight requests
      if (pendingRef.current.has(refId)) {
        const result = await pendingRef.current.get(refId);
        return result?.data?.duplicate === false;
      }

      const amount = extraAmount ?? SCORE_VALUES[reason];
      const promise = supabase.rpc("award_score", {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
        p_reference_id: refId,
      });

      pendingRef.current.set(refId, promise);
      try {
        const { data, error } = await promise;
        if (error) {
          console.error("Score award error:", error);
          return false;
        }
        return data?.duplicate === false;
      } finally {
        pendingRef.current.delete(refId);
      }
    },
    [user]
  );

  const answerQuestion = useCallback(
    (questionId: string) => award("answered_question", questionId),
    [award]
  );

  const correctAnswer = useCallback(
    (questionId: string) => award("correct_answer", questionId),
    [award]
  );

  const streakDay = useCallback(
    (dateStr: string) => award("streak_day", dateStr),
    [award]
  );

  const syllabusDay = useCallback(
    (day: number) => award("syllabus_day", String(day)),
    [award]
  );

  const achievement = useCallback(
    (achievementId: string) => award("achievement", achievementId),
    [award]
  );

  const quizComplete = useCallback(
    (sessionId: string) => award("quiz_complete", sessionId),
    [award]
  );

  return {
    answerQuestion,
    correctAnswer,
    streakDay,
    syllabusDay,
    achievement,
    quizComplete,
    award,
  };
}
