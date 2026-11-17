export type ExamProgramId = "jupeb" | "jamb";

export interface ExamProgramDefinition {
  id: ExamProgramId;
  name: string;
  shortName: string;
  description: string;
  route: string;
}

export const EXAM_PROGRAMS: Record<ExamProgramId, ExamProgramDefinition> = {
  jupeb: {
    id: "jupeb",
    name: "JUPEB",
    shortName: "JUPEB",
    description: "Advanced-level examination preparation",
    route: "/",
  },
  jamb: {
    id: "jamb",
    name: "JAMB",
    shortName: "JAMB",
    description: "UTME examination preparation",
    route: "/jamb",
  },
};

export const isExamProgramId = (value: unknown): value is ExamProgramId =>
  value === "jupeb" || value === "jamb";

export function getExamProgramRoute(program: ExamProgramId): string {
  return EXAM_PROGRAMS[program].route;
}

export function getExamProgramStorageKey(
  userId: string,
  program: ExamProgramId,
  key: string,
): string {
  return `u:${userId}:${program}:${key}`;
}
