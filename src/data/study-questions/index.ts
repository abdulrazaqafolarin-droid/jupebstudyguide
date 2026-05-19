import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { getPhysicsQuestions } from "./physics";
import { getChemistryQuestions } from "./chemistry";
import { getBiologyQuestions } from "./biology";
import { getMathQuestions } from "./math";
import { getImportedQuestions } from "@/data/imported-questions";

const getters: Record<Subject, (year: number) => { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  physics: getPhysicsQuestions,
  chemistry: getChemistryQuestions,
  biology: getBiologyQuestions,
  math: getMathQuestions,
};

function getMergedAll(subject: Subject, year: number, category?: StudyCategory): StudyQuestion[] {
  const base = getters[subject](year);
  const imported = getImportedQuestions(subject, year);
  if (category === "objective") return [...base.objective, ...imported.filter(q => q.category === "objective")];
  if (category === "theory") return [...base.theory, ...imported.filter(q => q.category === "theory")];
  if (category === "practical") return [...base.practical, ...imported.filter(q => q.category === "practical")];
  return [...base.objective, ...base.theory, ...base.practical, ...imported];
}

export function getStudyQuestionsByYear(year: number): StudyQuestion[] {
  const all: StudyQuestion[] = [];
  for (const subject of Object.keys(getters) as Subject[]) {
    const data = getMergedAll(subject, year);
    all.push(...data);
  }
  return all;
}

export function getStudyQuestionsBySubject(subject: Subject, year: number, category?: StudyCategory): StudyQuestion[] {
  return getMergedAll(subject, year, category);
}

export function getAllStudyYears(): number[] {
  return [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
}

export function countStudyQuestionsByYear(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const year of getAllStudyYears()) {
    counts[year] = getStudyQuestionsByYear(year).length;
  }
  return counts;
}

export function countStudyQuestionsBySubject(subject: Subject): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const year of getAllStudyYears()) {
    const data = getters[subject](year);
    const imported = getImportedQuestions(subject, year);
    counts[year] = data.objective.length + data.theory.length + data.practical.length + imported.length;
  }
  return counts;
}

export function getAvailableSubjectsForYear(year: number): Subject[] {
  return (Object.keys(getters) as Subject[]).filter((s) => {
    const data = getters[s](year);
    const imported = getImportedQuestions(s, year);
    return data.objective.length > 0 || data.theory.length > 0 || data.practical.length > 0 || imported.length > 0;
  });
}
