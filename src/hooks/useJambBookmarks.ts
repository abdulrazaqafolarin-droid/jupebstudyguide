import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";

/** JAMB bookmarks are locally available first and synchronized to the shared
 * Rutex database when the programme-aware schema is available. */
export function useJambBookmarks() {
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks, { isReady }] = useUserStorage<string[]>("jamb-bookmarks", []);
  const bookmarksRef = useRef(bookmarks);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);

  useEffect(() => {
    if (loading || !user?.id || !isReady) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("exam_user_bookmarks")
        .select("question_id")
        .eq("user_id", user.id)
        .eq("exam_program_id", "jamb");
      if (!active) return;
      if (error) {
        // Before the additive JAMB migration, keep the per-account local copy.
        if (!/exam_user_bookmarks|schema cache|does not exist/i.test(error.message)) {
          console.warn("[JAMB bookmarks] Cloud sync unavailable:", error.message);
        }
        return;
      }
      const remoteIds = (data ?? []).map((row) => row.question_id);
      const localSnapshot = bookmarksRef.current;
      const merged = [...new Set([...localSnapshot, ...remoteIds])];
      const hasChanged = merged.length !== localSnapshot.length || merged.some((id, index) => id !== localSnapshot[index]);
      if (hasChanged) setBookmarks(merged);

      const missingOnServer = localSnapshot.filter((id) => !remoteIds.includes(id));
      if (missingOnServer.length > 0) {
        const { error: syncError } = await supabase
          .from("exam_user_bookmarks")
          .upsert(
            missingOnServer.map((questionId) => ({
              user_id: user.id,
              exam_program_id: "jamb",
              question_id: questionId,
            })),
            { onConflict: "user_id,exam_program_id,question_id", ignoreDuplicates: true },
          );
        if (syncError) console.warn("[JAMB bookmarks] Could not sync local bookmarks:", syncError.message);
      }
    })();
    return () => { active = false; };
  }, [user?.id, loading, isReady, setBookmarks]);

  const toggle = useCallback((questionId: string) => {
    if (!isReady || !questionId) return;
    const exists = bookmarks.includes(questionId);
    setBookmarks((previous) => exists
      ? previous.filter((id) => id !== questionId)
      : [...previous, questionId]);
    if (!user?.id) return;

    const request = exists
      ? supabase.from("exam_user_bookmarks").delete()
          .eq("user_id", user.id).eq("exam_program_id", "jamb").eq("question_id", questionId)
      : supabase.from("exam_user_bookmarks").upsert(
          { user_id: user.id, exam_program_id: "jamb", question_id: questionId },
          { onConflict: "user_id,exam_program_id,question_id" },
        );
    void request.then(({ error }) => {
      if (error) console.warn("[JAMB bookmarks] Cloud write failed; local copy retained:", error.message);
    });
  }, [bookmarks, isReady, setBookmarks, user?.id]);

  const isBookmarked = useCallback(
    (questionId: string) => bookmarks.includes(questionId),
    [bookmarks],
  );

  return { bookmarks, toggle, isBookmarked, isReady };
}
