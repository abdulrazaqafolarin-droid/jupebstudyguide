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


/** A JAMB workspace is identified by its route prefix, including shared-page aliases. */
export function isJambWorkspacePath(pathname: string): boolean {
  return pathname === "/jamb" || pathname.startsWith("/jamb/");
}

const JAMB_ROUTE_ALIASES: Record<string, string> = {
  "/": "/jamb",
  "/past-questions": "/jamb/past-questions",
  "/chat": "/jamb/chat",
  "/profile": "/jamb/profile",
  "/settings/profile": "/jamb/settings/profile",
  "/settings/security": "/jamb/settings/security",
  "/onboarding": "/jamb/onboarding",
  "/friends": "/jamb/friends",
  "/leaderboard": "/jamb/leaderboard",
  "/achievements": "/jamb/achievements",
  "/stats": "/jamb/stats",
  "/syllabus": "/jamb/syllabus",
  "/study-chat": "/jamb/ai",
  "/discover": "/jamb/discover",
};

/** Translate shared navigation destinations without changing programme context. */
export function getWorkspacePath(pathname: string, program: ExamProgramId): string {
  if (program !== "jamb") return pathname;
  return JAMB_ROUTE_ALIASES[pathname] ?? pathname;
}

/** Root workspace routes must be exact matches, not prefixes of every child route. */
export function isNavigationPathActive(pathname: string, route: string): boolean {
  if (route === "/" || route === "/jamb") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}
