import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStorage } from "@/hooks/useUserStorage";
import { reconcileJambBookmarks } from "@/lib/jamb-local-sync";

/** JAMB bookmarks are local-first and retain deletion tombstones until cloud sync succeeds. */
export function useJambBookmarks() {
  const { user, loading } = useAuth();
  const [bookmarks, setBookmarks, { isReady }] = useUserStorage<string[]>("jamb-bookmarks", []);
  const [deletedBookmarkIds, setDeletedBookmarkIds, { isReady: isDeletedReady }] = useUserStorage<string[]>(
    "jamb-bookmark-deletions",
    [],
  );
  const bookmarksRef = useRef(bookmarks);
  const deletedBookmarkIdsRef = useRef(deletedBookmarkIds);

  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { deletedBookmarkIdsRef.current = deletedBookmarkIds; }, [deletedBookmarkIds]);

  useEffect(() => {
    if (loading || !user?.id || !isReady || !isDeletedReady) return;
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
      const remoteIdSet = new Set(remoteIds);
      const reconciliation = reconcileJambBookmarks(localSnapshot, remoteIds, deletedSnapshot);
      const merged = reconciliation.merged;
      const hasChanged = merged.length !== localSnapshot.length ||
        merged.some((id, index) => id !== localSnapshot[index]);
      if (hasChanged) {
        bookmarksRef.current = merged;
        setBookmarks(merged);
      }

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
          const readdedWhileDeleting = reconciliation.remoteToDelete
            .filter((id) => bookmarksRef.current.includes(id) && !deletedBookmarkIdsRef.current.includes(id));
          deletedBookmarkIdsRef.current = deletedBookmarkIdsRef.current.filter((id) => !deleted.has(id));
          setDeletedBookmarkIds(deletedBookmarkIdsRef.current);

          // A user may re-add an item while the cloud delete is in flight.
          // Restore that newer local intent after the delete completes.
          if (readdedWhileDeleting.length > 0) {
            const { error: restoreError } = await supabase
              .from("exam_user_bookmarks")
              .upsert(
                readdedWhileDeleting.map((questionId) => ({
                  user_id: userId,
                  exam_program_id: "jamb",
                  question_id: questionId,
                })),
                { onConflict: "user_id,exam_program_id,question_id", ignoreDuplicates: true },
              );
            if (restoreError) console.warn("[JAMB bookmarks] Could not restore a bookmark re-added during sync:", restoreError.message);
          }
        }
      }

      // A successful remote read confirms that tombstones already absent from
      // the server no longer need to be retained locally.
      const alreadyAbsent = deletedSnapshot.filter((id) =>
        !remoteIdSet.has(id) && !bookmarksRef.current.includes(id)
      );
      if (alreadyAbsent.length > 0) {
        const absent = new Set(alreadyAbsent);
        deletedBookmarkIdsRef.current = deletedBookmarkIdsRef.current.filter((id) => !absent.has(id));
        setDeletedBookmarkIds(deletedBookmarkIdsRef.current);
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
  }, [user?.id, loading, isReady, isDeletedReady, setBookmarks, setDeletedBookmarkIds]);

  const toggle = useCallback((questionId: string) => {
    if (!isReady || !isDeletedReady || !questionId) return;
    const currentBookmarks = bookmarksRef.current;
    const exists = currentBookmarks.includes(questionId);
    const nextBookmarks = exists
      ? currentBookmarks.filter((id) => id !== questionId)
      : [...currentBookmarks, questionId];
    bookmarksRef.current = nextBookmarks;
    setBookmarks(nextBookmarks);

    if (exists) {
      const nextDeleted = deletedBookmarkIdsRef.current.includes(questionId)
        ? deletedBookmarkIdsRef.current
        : [...deletedBookmarkIdsRef.current, questionId];
      deletedBookmarkIdsRef.current = nextDeleted;
      setDeletedBookmarkIds(nextDeleted);
    } else {
      // Re-adding a question cancels a pending offline removal.
      const nextDeleted = deletedBookmarkIdsRef.current.filter((id) => id !== questionId);
      deletedBookmarkIdsRef.current = nextDeleted;
      setDeletedBookmarkIds(nextDeleted);
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
  }, [isReady, isDeletedReady, setBookmarks, setDeletedBookmarkIds, user?.id]);

  const isBookmarked = useCallback(
    (questionId: string) => bookmarks.includes(questionId),
    [bookmarks],
  );

  return { bookmarks, toggle, isBookmarked, isReady: isReady && isDeletedReady };
}
