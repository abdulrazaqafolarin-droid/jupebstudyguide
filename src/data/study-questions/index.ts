import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { getChemistryQuestions } from "./chemistry";
import { getBiologyQuestions } from "./biology";
import { getMathQuestions } from "./math";
import { supabase } from "@/integrations/supabase/client";

const getters: Record<Subject, (year: number) => { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  chemistry: getChemistryQuestions,
  biology: getBiologyQuestions,
  math: getMathQuestions,
};

let merged: StudyQuestion[] | null = null;
let fetchStarted = false;
let mergedReady = false;

function loadLocal(): StudyQuestion[] {
  const all: StudyQuestion[] = [];
  for (const subject of Object.keys(getters) as Subject[]) {
    for (const year of getAllStudyYears()) {
      const data = getters[subject](year);
      all.push(...data.objective, ...data.theory, ...data.practical);
    }
  }
  return all;
}

function startFetch() {
  if (fetchStarted) return;
  fetchStarted = true;
  supabase.from("study_questions").select("*").then(({ data, error }) => {
    if (error || !data) return;
    const byId = new Map<string, StudyQuestion>();
    for (const q of loadLocal()) byId.set(q.id, q);
    for (const row of data) {
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
      byId.set(sq.id, sq);
    }
    merged = Array.from(byId.values());
    mergedReady = true;
  }).catch(() => {});
}

function getQuestions(): StudyQuestion[] {
  if (merged) return merged;
  if (!merged) merged = loadLocal();
  startFetch();
  return merged;
}

export function isMergedReady(): boolean {
  return mergedReady;
}

export function invalidateAndRefetch() {
  fetchStarted = false;
  mergedReady = false;
  merged = loadLocal();
  startFetch();
}

export function getStudyQuestionsByYear(year: number): StudyQuestion[] {
  return getQuestions().filter(q => q.year === year);
}

export function getStudyQuestionsBySubject(subject: Subject, year: number, category?: StudyCategory): StudyQuestion[] {
  let filtered = getQuestions().filter(q => q.subject === subject && q.year === year);
  if (category) filtered = filtered.filter(q => q.category === category);
  return filtered;
}

export function getAllStudyYears(): number[] {
  return [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
}

export function countStudyQuestionsByYear(): Record<number, number> {
  const all = getQuestions();
  const counts: Record<number, number> = {};
  for (const year of getAllStudyYears()) counts[year] = 0;
  for (const q of all) counts[q.year] = (counts[q.year] || 0) + 1;
  return counts;
}

export function countStudyQuestionsBySubject(subject: Subject): Record<number, number> {
  const all = getQuestions().filter(q => q.subject === subject);
  const counts: Record<number, number> = {};
  for (const year of getAllStudyYears()) counts[year] = 0;
  for (const q of all) counts[q.year] = (counts[q.year] || 0) + 1;
  return counts;
}

export function getAllStudyQuestionsForSubject(subject: Subject): StudyQuestion[] {
  return getQuestions().filter(q => q.subject === subject);
}

export function getAllStudyQuestions(): StudyQuestion[] {
  return getQuestions();
}

export function getAvailableSubjectsForYear(year: number): Subject[] {
  const byYear = getQuestions().filter(q => q.year === year);
  const subjects = new Set<Subject>();
  for (const q of byYear) subjects.add(q.subject);
  return Array.from(subjects);
}
