import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { getPersistedDeletedIds } from "@/lib/admin-questions-service";

const ALL_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

let currentData: StudyQuestion[] = [];
const listeners: Set<() => void> = new Set();
let fetchStarted = false;
let _ready = false;
let fetchInFlight: Promise<void> | null = null;

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
    sq.options = typeof row.options === "string"
      ? JSON.parse(row.options as string)
      : (row.options as StudyQuestion["options"]);
  }
  if (row.correct_answer) sq.correctAnswer = row.correct_answer as string;
  if (row.explanation) sq.explanation = row.explanation as string;
  if (row.course) sq.topic = row.course as string;
  if (row.sort_order !== null && row.sort_order !== undefined) sq.sortOrder = row.sort_order as number;
  if (row.image_url) sq.imageUrl = row.image_url as string;
  if (row.image_position) sq.imagePosition = row.image_position as StudyQuestion["imagePosition"];
  return sq;
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

async function fetchAll() {
  // Concurrent route mounts share one live Supabase request. No question bank
  // is bundled in the APK or persisted as an offline/downloadable file.
  if (fetchInFlight) return fetchInFlight;

  const task = (async () => {
    const locallyDeleted = getPersistedDeletedIds();
    const PAGE_SIZE = 1000;
    const columns = [
      "id", "subject", "year", "category", "question", "difficulty",
      "options", "correct_answer", "explanation", "course", "sort_order",
      "image_url", "image_position",
    ].join(",");

    const allData: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("study_questions")
        .select(columns)
        .eq("hidden", false)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      const page = data as unknown as Record<string, unknown>[];
      allData.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Replace the in-memory snapshot only after every Supabase page succeeds.
    currentData = allData
      .filter(row => !locallyDeleted.has(row.id as string))
      .map(rowToQuestion);
    _ready = true;
    notifyListeners();
  })();

  fetchInFlight = task;
  try {
    await task;
  } catch (error) {
    console.error("Failed to load study questions from Supabase:", error);
    // Keep the last good snapshot if a refresh fails. A first-load failure
    // can be retried when the device comes back online.
    if (!_ready) fetchStarted = false;
  } finally {
    if (fetchInFlight === task) fetchInFlight = null;
  }
}

export function initDataLayer(priority: "idle" | "immediate" = "idle") {
  if (fetchStarted || _ready) return;
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

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function refreshData(): Promise<void> {
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
