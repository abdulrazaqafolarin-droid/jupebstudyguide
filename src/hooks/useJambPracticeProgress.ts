import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";

export interface JambSavedAnswer {
  selected: string;
  savedAt: number;
}
type SavedAnswers = Record<string, JambSavedAnswer>;

/** Separate per-user JAMB practice progress with local-first and cloud sync. */
export function useJambPracticeProgress() {
  const { user, loading } = useAuth();
  const [savedAnswers, setSavedAnswers, { isReady }] = useUserStorage<SavedAnswers>(
    "jamb-practice-answers",
    {},
  );
  const savedAnswersRef = useRef(savedAnswers);
  useEffect(() => { savedAnswersRef.current = savedAnswers; }, [savedAnswers]);

  useEffect(() => {
    if (loading || !user?.id || !isReady) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("exam_user_progress")
        .select("question_id,last_selected_option,last_answered_at")
        .eq("user_id", user.id)
        .eq("exam_program_id", "jamb");
      if (!active) return;
      if (error) {
        if (!/exam_user_progress|schema cache|does not exist/i.test(error.message)) {
          console.warn("[JAMB progress] Cloud sync unavailable:", error.message);
        }
        return;
      }

      const localSnapshot = savedAnswersRef.current;
      const merged: SavedAnswers = { ...localSnapshot };
      for (const row of data ?? []) {
        if (!row.last_selected_option) continue;
        const remote = {
          selected: row.last_selected_option,
          savedAt: row.last_answered_at ? new Date(row.last_answered_at).getTime() : 0,
        };
        const local = merged[row.question_id];
        if (!local || remote.savedAt > local.savedAt) merged[row.question_id] = remote;
      }
      if (JSON.stringify(merged) !== JSON.stringify(localSnapshot)) setSavedAnswers(merged);

      const remoteIds = new Set((data ?? []).map((row) => row.question_id));
      const missing = Object.entries(merged).filter(([questionId]) => !remoteIds.has(questionId));
      if (missing.length > 0) {
        const { error: syncError } = await supabase.from("exam_user_progress").upsert(
          missing.map(([questionId, answer]) => ({
            user_id: user.id,
            exam_program_id: "jamb",
            question_id: questionId,
            last_selected_option: answer.selected,
            last_answered_at: new Date(answer.savedAt || Date.now()).toISOString(),
            last_viewed_at: new Date(answer.savedAt || Date.now()).toISOString(),
            viewed_count: 1,
          })),
          { onConflict: "user_id,exam_program_id,question_id" },
        );
        if (syncError) console.warn("[JAMB progress] Could not sync local progress:", syncError.message);
      }
    })();
    return () => { active = false; };
  }, [user?.id, loading, isReady, setSavedAnswers]);

  const saveAnswer = useCallback((questionId: string, selected: string) => {
    if (!isReady || !questionId || !/^[A-E]$/.test(selected)) return;
    const savedAt = Date.now();
    setSavedAnswers((previous) => ({ ...previous, [questionId]: { selected, savedAt } }));
    if (!user?.id) return;
    void supabase.from("exam_user_progress").upsert({
      user_id: user.id,
      exam_program_id: "jamb",
      question_id: questionId,
      last_selected_option: selected,
      last_answered_at: new Date(savedAt).toISOString(),
      last_viewed_at: new Date(savedAt).toISOString(),
      viewed_count: 1,
    }, { onConflict: "user_id,exam_program_id,question_id" }).then(({ error }) => {
      if (error) console.warn("[JAMB progress] Cloud write failed; local progress retained:", error.message);
    });
  }, [isReady, setSavedAnswers, user?.id]);

  return { savedAnswers, saveAnswer, isReady };
}
