import { useState, useCallback } from "react";
import type { StudyBookmark } from "@/types/study-questions";

const STORAGE_KEY = "jupeb_study_bookmarks";

function loadBookmarks(): StudyBookmark[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveBookmarks(b: StudyBookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<StudyBookmark[]>(loadBookmarks);

  const toggle = useCallback((questionId: string) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.questionId === questionId);
      const next = exists
        ? prev.filter((b) => b.questionId !== questionId)
        : [...prev, { questionId, createdAt: Date.now() }];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((questionId: string) => bookmarks.some((b) => b.questionId === questionId), [bookmarks]);

  return { bookmarks, toggle, isBookmarked };
}
