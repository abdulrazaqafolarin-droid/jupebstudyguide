import type { Subject } from "@/types/question";
import { STUDY_YEARS, type StudyQuestion, type StudyCategory } from "@/types/study-questions";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { getPersistedDeletedIds } from "@/lib/admin-questions-service";

const ALL_YEARS = STUDY_YEARS;

let currentData: StudyQuestion[] = [];
let currentDataUserId: string | null = null;
const listeners: Set<() => void> = new Set();
let fetchStarted = false;
let _ready = false;
let _lastError: string | null = null;
let fetchInFlight: Promise<void> | null = null;
let fetchGeneration = 0;
let authListenerInstalled = false;

function rowToQuestion(row: Record<string, unknown>): StudyQuestion {
  const sq: StudyQuestion = {
    id: row.id as string,
    subject: row.subject as Subject,
    year: row.year as number,
    category: row.category as StudyCategory,
    question: row.question as string,
    difficulty: (row.difficulty as StudyQuestion["difficulty"]) || "medium",
  };
  if (row.options) {
    try {
      sq.options = typeof row.options === "string"
        ? JSON.parse(row.options as string)
        : (row.options as StudyQuestion["options"]);
    } catch (error) {
      // One malformed legacy row must not prevent the rest of the question bank loading.
      console.error(`Invalid options JSON for study question ${String(row.id)}:`, error);
    }
  }
  if (row.correct_answer) sq.correctAnswer = row.correct_answer as string;
  if (row.explanation) sq.explanation = row.explanation as string;
  if (row.course) sq.topic = row.course as string;
  if (row.sort_order !== null && row.sort_order !== undefined) sq.sortOrder = row.sort_order as number;
  if (row.image_url) sq.imageUrl = row.image_url as string;
  if (row.image_urls) {
    try {
      const parsed = typeof row.image_urls === "string"
        ? JSON.parse(row.image_urls as string)
        : row.image_urls;
      if (Array.isArray(parsed)) {
        sq.imageUrls = parsed.filter((url): url is string => typeof url === "string" && url.length > 0);
      }
    } catch (error) {
      console.error(`Invalid image_urls JSON for study question ${String(row.id)}:`, error);
    }
  }
  if ((!sq.imageUrls || sq.imageUrls.length === 0) && sq.imageUrl) sq.imageUrls = [sq.imageUrl];
  if (row.image_position) sq.imagePosition = row.image_position as StudyQuestion["imagePosition"];
  return sq;
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function setDataOwner(userId: string | null) {
  if (currentDataUserId === userId) return;

  // Never let a previous account's in-memory question snapshot survive a
  // sign-out or account switch. In-flight requests from the old account are
  // ignored by the generation check in fetchAll().
  fetchGeneration += 1;
  currentData = [];
  currentDataUserId = userId;
  fetchInFlight = null;
  fetchStarted = false;
  _ready = false;
  _lastError = null;
  notifyListeners();
}

function installAuthListener() {
  if (authListenerInstalled) return;
  authListenerInstalled = true;

  // The screen is mounted behind ProtectedRoute, but session restoration and
  // token refresh can still race the idle database fetch. Retry an empty or
  // interrupted first load whenever Supabase confirms a usable session.
  supabase.auth.onAuthStateChange((event, session) => {
    const nextUserId = session?.user.id ?? null;
    setDataOwner(nextUserId);

    if (
      session &&
      (event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED")
    ) {
      globalThis.setTimeout(() => {
        if (!fetchStarted && (!_ready || currentData.length === 0)) {
          initDataLayer("immediate");
        }
      }, 0);
    }
  });
}

async function fetchAll() {
  // Concurrent route mounts share one live Supabase request. No question bank
  // is bundled in the APK or persisted as an offline/downloadable file.
  if (fetchInFlight) return fetchInFlight;

  const task = (async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = sessionData.session?.user.id;
    if (!userId) {
      setDataOwner(null);
      throw new Error("Your sign-in session is unavailable. Sign in again, then retry loading JUPEB questions.");
    }

    setDataOwner(userId);
    const requestGeneration = fetchGeneration;
    const locallyDeleted = getPersistedDeletedIds();
    const PAGE_SIZE = 1000;
    const columns = [
      "id", "subject", "year", "category", "question", "difficulty",
      "options", "correct_answer", "explanation", "course", "sort_order",
      "image_url", "image_urls", "image_position",
    ].join(",");

    const allData: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("study_questions")
        .select(columns)
        .eq("exam_program_id", "jupeb")
        .eq("review_status", "published")
        .eq("hidden", false)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
        .abortSignal(AbortSignal.timeout(15_000));

      if (error) throw error;
      if (!data || data.length === 0) break;

      const page = data as unknown as Record<string, unknown>[];
      allData.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // A session can change while multiple 1000-row pages are loading. Never
    // commit that old session's result to the new user's in-memory snapshot.
    if (requestGeneration !== fetchGeneration || currentDataUserId !== userId) return;

    const nextData = allData
      .filter(row => !locallyDeleted.has(row.id as string))
      .map(rowToQuestion);

    // Do not silently cache an RLS-filtered empty response as a healthy bank.
    // Keep a last-good same-user snapshot, and show a retry state when there
    // is no data to display.
    if (nextData.length > 0) {
      currentData = nextData;
      _lastError = null;
    } else if (currentData.length === 0) {
      _lastError = "No JUPEB questions were returned for this session. Check your account access or sign in again, then retry.";
    }
    _ready = true;
    notifyListeners();
  })();

  fetchInFlight = task;
  try {
    await task;
  } catch (error) {
    console.error("Failed to load study questions from Supabase:", error);
    _lastError = error instanceof Error
      ? error.message
      : "Could not load JUPEB questions. Check your connection and retry.";
    // Keep the last good snapshot for this same user; otherwise let the page
    // render an actionable error instead of appearing to have an empty bank.
    _ready = true;
    fetchStarted = false;
    notifyListeners();
  } finally {
    if (fetchInFlight === task) fetchInFlight = null;
  }
}

export function initDataLayer(priority: "idle" | "immediate" = "idle") {
  installAuthListener();
  if (fetchStarted || (_ready && currentData.length > 0)) return;
  fetchStarted = true;

  const start = () => {
    void fetchAll();
  };

  if (priority === "immediate") {
    start();
    return;
  }

  // Let the first screen paint before querying the question bank. The data is
  // still fetched from Supabase normally as soon as the browser is idle.
  if (typeof window === "undefined") {
    start();
    return;
  }

  const requestIdle = (window as unknown as {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (typeof requestIdle === "function") {
    requestIdle(start, { timeout: 900 });
  } else {
    globalThis.setTimeout(start, 400);
  }

  const retryWhenOnline = () => {
    if (!_ready && !fetchStarted) initDataLayer("immediate");
  };
  window.addEventListener("online", retryWhenOnline, { once: true });
}

export function isDataReady(): boolean {
  return _ready;
}

export function getDataError(): string | null {
  return _lastError;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function refreshData(): Promise<void> {
  installAuthListener();
  _lastError = null;
  fetchStarted = true;
  notifyListeners();
  return fetchAll();
}

export function getStudyQuestionsByYear(year: number): StudyQuestion[] {
  return currentData.filter(q => q.year === year);
}

export function getStudyQuestionsBySubject(subject: Subject, year: number, category?: StudyCategory): StudyQuestion[] {
  let filtered = currentData.filter(q => q.subject === subject && q.year === year);
  if (category) filtered = filtered.filter(q => q.category === category);
  return filtered.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

export function getAllStudyYears(): number[] {
  return ALL_YEARS;
}

export function countStudyQuestionsByYear(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const year of ALL_YEARS) counts[year] = 0;
  for (const q of currentData) counts[q.year] = (counts[q.year] || 0) + 1;
  return counts;
}

export function countStudyQuestionsBySubject(subject: Subject): Record<number, number> {
  const all = currentData.filter(q => q.subject === subject);
  const counts: Record<number, number> = {};
  for (const year of ALL_YEARS) counts[year] = 0;
  for (const q of all) counts[q.year] = (counts[q.year] || 0) + 1;
  return counts;
}

export function getAllStudyQuestionsForSubject(subject: Subject): StudyQuestion[] {
  return currentData.filter(q => q.subject === subject);
}

export function getAllStudyQuestions(): StudyQuestion[] {
  return currentData;
}

export function getAvailableSubjectsForYear(year: number): Subject[] {
  const byYear = currentData.filter(q => q.year === year);
  const subjects = new Set<Subject>();
  for (const q of byYear) subjects.add(q.subject);
  return Array.from(subjects);
}

export function useQuestions() {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick(t => t + 1)), []);
  return currentData;
}
