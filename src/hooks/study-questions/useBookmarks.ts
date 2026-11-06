import { useCallback } from "react";
import { useUserStorage } from "@/hooks/useUserStorage";
import type { StudyBookmark } from "@/types/study-questions";

/**
 * Bookmarks are account data, not device-global preferences. The old key
 * remains available only as a migration source for the explicit backup flow.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks, { isReady }] = useUserStorage<StudyBookmark[]>(
    "study-bookmarks",
    [],
  );

  const toggle = useCallback((questionId: string) => {
    if (!isReady || !questionId) return;
    setBookmarks(prev => {
      const exists = prev.some(bookmark => bookmark.questionId === questionId);
      return exists
        ? prev.filter(bookmark => bookmark.questionId !== questionId)
        : [...prev, { questionId, createdAt: Date.now() }];
    });
  }, [isReady, setBookmarks]);

  const isBookmarked = useCallback(
    (questionId: string) => bookmarks.some(bookmark => bookmark.questionId === questionId),
    [bookmarks],
  );

  return { bookmarks, toggle, isBookmarked, isReady };
}
