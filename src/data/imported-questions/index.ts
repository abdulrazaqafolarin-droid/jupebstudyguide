import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import { getPhysicsQuestions } from "./physics";
import { getChemistryQuestions } from "./chemistry";
import { getBiologyQuestions } from "./biology";
import { getMathQuestions } from "./math";

const getters: Record<Subject, (year: number) => { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  physics: getPhysicsQuestions,
  chemistry: getChemistryQuestions,
  biology: getBiologyQuestions,
  math: getMathQuestions,
};

export function getImportedQuestions(subject: Subject, year: number, category?: StudyCategory): StudyQuestion[] {
  const data = getters[subject](year);
  if (category === "objective") return data.objective;
  if (category === "theory") return data.theory;
  if (category === "practical") return data.practical;
  return [...data.objective, ...data.theory, ...data.practical];
}

export function getImportedYears(): number[] {
  const years = new Set<number>();
  const allSubjects: Subject[] = ["physics", "chemistry", "biology", "math"];
  for (const subject of allSubjects) {
    for (const y of [2015, 2018, 2020, 2021, 2022, 2025]) {
      const data = getters[subject](y);
      if (data.objective.length > 0 || data.theory.length > 0 || data.practical.length > 0) {
        years.add(y);
      }
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}
