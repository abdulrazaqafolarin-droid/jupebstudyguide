import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";
import { reconcileJambBookmarks } from "@/lib/jamb-local-sync";

/** JAMB bookmarks are local-first and retain deletion tombstones until cloud sync succeeds. */
export function useJambBookmarks() {
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks, { isReady }] = useUserStorage<string[]>("jamb-bookmarks", []);
  const [deletedBookmarkIds, setDeletedBookmarkIds] = useUserStorage<string[]>(
    "jamb-bookmark-deletions",
    [],
  );
  const bookmarksRef = useRef(bookmarks);
  const deletedBookmarkIdsRef = useRef(deletedBookmarkIds);

  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { deletedBookmarkIdsRef.current = deletedBookmarkIds; }, [deletedBookmarkIds]);

  useEffect(() => {
    if (loading || !user?.id || !isReady) return;
    let active = true;

    const sync = async () => {
      const userId = user.id;
      const { data, error } = await supabase
        .from("exam_user_bookmarks")
        .select("question_id")
        .eq("user_id", userId)
        .eq("exam_program_id", "jamb");
      if (!active) return;
      if (error) {
        if (!/exam_user_bookmarks|schema cache|does not exist/i.test(error.message)) {
          console.warn("[JAMB bookmarks] Cloud sync unavailable:", error.message);
        }
        return;
      }

      // Read the refs after the request resolves so toggles made while the
      // network request was in flight are included in this reconciliation.
      const localSnapshot = bookmarksRef.current;
      const deletedSnapshot = deletedBookmarkIdsRef.current;
      const remoteIds = (data ?? []).map((row) => row.question_id);
      const reconciliation = reconcileJambBookmarks(localSnapshot, remoteIds, deletedSnapshot);
      const merged = reconciliation.merged;
      const hasChanged = merged.length !== localSnapshot.length ||
        merged.some((id, index) => id !== localSnapshot[index]);
      if (hasChanged) setBookmarks(merged);

      if (reconciliation.remoteToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("exam_user_bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("exam_program_id", "jamb")
          .in("question_id", reconciliation.remoteToDelete);
        if (!active) return;
        if (deleteError) {
          console.warn("[JAMB bookmarks] Could not sync offline removals; retry retained:", deleteError.message);
        } else {
          const deleted = new Set(reconciliation.remoteToDelete);
          setDeletedBookmarkIds((previous) => previous.filter((id) => !deleted.has(id)));
        }
      }

      if (reconciliation.localToUpsert.length > 0) {
        const { error: syncError } = await supabase
          .from("exam_user_bookmarks")
          .upsert(
            reconciliation.localToUpsert.map((questionId) => ({
              user_id: userId,
              exam_program_id: "jamb",
              question_id: questionId,
            })),
            { onConflict: "user_id,exam_program_id,question_id", ignoreDuplicates: true },
          );
        if (syncError) console.warn("[JAMB bookmarks] Could not sync local bookmarks:", syncError.message);
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
  }, [user?.id, loading, isReady, setBookmarks, setDeletedBookmarkIds]);

  const toggle = useCallback((questionId: string) => {
    if (!isReady || !questionId) return;
    const exists = bookmarksRef.current.includes(questionId);
    if (exists) {
      setBookmarks((previous) => previous.filter((id) => id !== questionId));
      setDeletedBookmarkIds((previous) => previous.includes(questionId) ? previous : [...previous, questionId]);
    } else {
      setBookmarks((previous) => previous.includes(questionId) ? previous : [...previous, questionId]);
      // Re-adding a question cancels a pending offline removal.
      setDeletedBookmarkIds((previous) => previous.filter((id) => id !== questionId));
    }

    if (!user?.id) return;
    const request = exists
      ? supabase.from("exam_user_bookmarks").delete()
          .eq("user_id", user.id).eq("exam_program_id", "jamb").eq("question_id", questionId)
      : supabase.from("exam_user_bookmarks").upsert(
          { user_id: user.id, exam_program_id: "jamb", question_id: questionId },
          { onConflict: "user_id,exam_program_id,question_id" },
        );
    void request.then(({ error }) => {
      if (error) {
        console.warn("[JAMB bookmarks] Cloud write failed; local change retained:", error.message);
        return;
      }
      if (exists) {
        setDeletedBookmarkIds((previous) => previous.filter((id) => id !== questionId));
      }
    });
  }, [isReady, setBookmarks, setDeletedBookmarkIds, user?.id]);

  const isBookmarked = useCallback(
    (questionId: string) => bookmarks.includes(questionId),
    [bookmarks],
  );

  return { bookmarks, toggle, isBookmarked, isReady };
}
