import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { getPersistedDeletedIds } from "@/lib/admin-questions-service";

const ALL_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

let currentData: StudyQuestion[] = [];
let listeners: Set<() => void> = new Set();
let fetchStarted = false;
let _ready = false;

function rowToQuestion(row: Record<string, unknown>): StudyQuestion {
  const sq: StudyQuestion = {
    id: row.id as string,
    subject: row.subject as Subject,
    year: row.year as number,
    category: row.category as StudyCategory,
    question: row.question as string,
    difficulty: (row.difficulty as string) || "medium",
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
  const locallyDeleted = getPersistedDeletedIds();
  const PAGE_SIZE = 1000;

  let allData: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("study_questions")
      .select("*")
      .eq("hidden", false)
      .range(from, from + PAGE_SIZE - 1);

    if (error) break;
    if (!data || data.length === 0) break;

    allData = allData.concat(data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  currentData = allData
    .filter(row => !locallyDeleted.has(row.id as string))
    .map(rowToQuestion);
  _ready = true;
  notifyListeners();
}

export function initDataLayer() {
  if (fetchStarted) return;
  fetchStarted = true;
  fetchAll();
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
