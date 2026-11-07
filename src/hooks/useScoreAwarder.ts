import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QuestionRewardResult {
  success?: boolean;
  attempt_awarded?: boolean;
  correct_awarded?: boolean;
  is_correct?: boolean;
  duplicate?: boolean;
}

/**
 * Records a submitted official past-question answer.
 *
 * The database reads the authoritative answer key and awards fixed points
 * through a private per-user claim ledger. The client never sends point values,
 * a correctness flag, or a user ID.
 */
export function useScoreAwarder() {
  const { user } = useAuth();

  const recordQuestionAttempt = useCallback(
    async (questionId: string, submittedAnswer: string): Promise<boolean> => {
      const normalizedQuestionId = questionId.trim();
      const normalizedAnswer = submittedAnswer.trim();

      if (!user || !normalizedQuestionId || !normalizedAnswer) return false;

      try {
        const { data, error } = await supabase.rpc("record_question_attempt", {
          p_question_id: normalizedQuestionId,
          p_answer: normalizedAnswer,
        });

        if (error) {
          console.error("Question reward could not be recorded:", error.message);
          return false;
        }

        const result = data as unknown as QuestionRewardResult | null;
        return Boolean(result?.attempt_awarded || result?.correct_awarded);
      } catch (error) {
        console.error("Question reward request failed:", error);
        return false;
      }
    },
    [user],
  );

  return { recordQuestionAttempt };
}
