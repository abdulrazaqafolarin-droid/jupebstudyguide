import type { Subject } from "@/types/question";
import type { StudyQuestion } from "@/types/study-questions";
import { getPhysicsQuestions as getPhysicsImported } from "./new-data-files/physics-imported";
import { getChemistryQuestions as getChemistryImported } from "./new-data-files/chemistry-imported";
import { getBiologyQuestions as getBiologyImported } from "./new-data-files/biology-imported";
import { getMathQuestions as getMathImported } from "./new-data-files/math-imported";

const importGetters: Record<Subject, (year: number) => { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  physics: getPhysicsImported,
  chemistry: getChemistryImported,
  biology: getBiologyImported,
  math: getMathImported,
};

export function getImportedQuestions(subject: Subject, year: number): StudyQuestion[] {
  const data = importGetters[subject](year);
  return [...data.objective, ...data.theory, ...data.practical];
}
