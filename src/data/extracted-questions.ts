import type { Subject } from "@/types/question";
import type { StudyQuestion } from "@/types/study-questions";
import { getMathQuestions as getMathExtracted } from "./extracted/math";
import { getChemistryQuestions as getChemExtracted } from "./extracted/chemistry";
import { getPhysicsQuestions as getPhyExtracted } from "./extracted/physics";

const extractGetters: Record<Subject, (year?: number) => StudyQuestion[]> = {
  physics: getPhyExtracted,
  chemistry: getChemExtracted,
  math: getMathExtracted,
};

export function getExtractedQuestions(subject: Subject, year: number): StudyQuestion[] {
  const getter = extractGetters[subject];
  if (!getter) return [];
  const all = getter(year);
  return all.filter(q => q.year === year);
}
