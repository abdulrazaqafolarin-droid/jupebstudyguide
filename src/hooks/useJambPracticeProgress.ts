import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";
import { reconcileJambProgress } from "@/lib/jamb-local-sync";

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

    const sync = async () => {
      const userId = user.id;
      const { data, error } = await supabase
        .from("exam_user_progress")
        .select("question_id,last_selected_option,last_answered_at,viewed_count")
        .eq("user_id", userId)
        .eq("exam_program_id", "jamb");
      if (!active) return;
      if (error) {
        if (!/exam_user_progress|schema cache|does not exist/i.test(error.message)) {
          console.warn("[JAMB progress] Cloud sync unavailable:", error.message);
        }
        return;
      }

      // Read the latest local snapshot after the request resolves. A student
      // may have answered more questions while the cloud query was in flight.
      const localSnapshot = savedAnswersRef.current;
      const remoteRows = (data ?? []).map((row) => ({
        questionId: row.question_id,
        selected: row.last_selected_option,
        savedAt: row.last_answered_at ? new Date(row.last_answered_at).getTime() : 0,
      }));
      const { merged, pendingUpserts } = reconcileJambProgress(localSnapshot, remoteRows);
      if (JSON.stringify(merged) !== JSON.stringify(localSnapshot)) setSavedAnswers(merged);

      if (pendingUpserts.length > 0) {
        const now = new Date().toISOString();
        const viewedCounts = new Map((data ?? []).map((row) => [row.question_id, row.viewed_count ?? 1]));
        const { error: syncError } = await supabase.from("exam_user_progress").upsert(
          pendingUpserts.map(([questionId, answer]) => {
            const savedAt = new Date(answer.savedAt || Date.now()).toISOString();
            return {
              user_id: userId,
              exam_program_id: "jamb",
              question_id: questionId,
              last_selected_option: answer.selected,
              last_answered_at: savedAt,
              last_viewed_at: now,
              viewed_count: viewedCounts.get(questionId) ?? 1,
            };
          }),
          { onConflict: "user_id,exam_program_id,question_id" },
        );
        if (syncError) console.warn("[JAMB progress] Could not sync local answers:", syncError.message);
      }
    };

    void sync();
    const syncWhenAvailable = () => { void sync(); };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", syncWhenAvailable);
    window.addEventListener("focus", syncWhenAvailable);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      active = false;
      window.removeEventListener("online", syncWhenAvailable);
      window.removeEventListener("focus", syncWhenAvailable);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [user?.id, loading, isReady, setSavedAnswers]);

  const saveAnswer = useCallback((questionId: string, selected: string) => {
    if (!isReady || !questionId || !/^[A-E]$/.test(selected)) return;
    const savedAt = Date.now();
    setSavedAnswers((previous) => ({ ...previous, [questionId]: { selected, savedAt } }));
    if (!user?.id) return;
    void (async () => {
      const { data: existing, error: readError } = await supabase
        .from("exam_user_progress")
        .select("viewed_count")
        .eq("user_id", user.id)
        .eq("exam_program_id", "jamb")
        .eq("question_id", questionId)
        .maybeSingle();
      if (readError) {
        console.warn("[JAMB progress] Cloud read failed; local answer retained for reconnect:", readError.message);
        return;
      }
      const { error } = await supabase.from("exam_user_progress").upsert({
        user_id: user.id,
        exam_program_id: "jamb",
        question_id: questionId,
        last_selected_option: selected,
        last_answered_at: new Date(savedAt).toISOString(),
        last_viewed_at: new Date(savedAt).toISOString(),
        viewed_count: existing?.viewed_count ?? 1,
      }, { onConflict: "user_id,exam_program_id,question_id" });
      if (error) console.warn("[JAMB progress] Cloud write failed; local answer retained:", error.message);
    })();
  }, [isReady, setSavedAnswers, user?.id]);

  return { savedAnswers, saveAnswer, isReady };
}
