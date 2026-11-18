import { JAMB_SUBJECTS, type JambSubject } from "@/lib/jamb-config";

export type JambExamTarget = "this-session" | "next-session" | "early";

export interface JambStudyPreferences {
  subjects: JambSubject[];
  examTarget: JambExamTarget;
  dailyGoalMinutes: 15 | 30 | 60;
}

export const DEFAULT_JAMB_STUDY_PREFERENCES: JambStudyPreferences = {
  subjects: [],
  examTarget: "this-session",
  dailyGoalMinutes: 30,
};

export function normalizeJambStudyPreferences(value: unknown): JambStudyPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_JAMB_STUDY_PREFERENCES;
  const raw = value as Record<string, unknown>;
  const subjects = Array.isArray(raw.subjects)
    ? [...new Set(raw.subjects.filter((subject): subject is JambSubject =>
        typeof subject === "string" && JAMB_SUBJECTS.includes(subject as JambSubject)
      ))]
    : [];
  const examTarget: JambExamTarget =
    raw.examTarget === "next-session" || raw.examTarget === "early" ? raw.examTarget : "this-session";
  const dailyGoalMinutes: 15 | 30 | 60 =
    raw.dailyGoalMinutes === 15 || raw.dailyGoalMinutes === 60 ? raw.dailyGoalMinutes : 30;
  return { subjects, examTarget, dailyGoalMinutes };
}

export function orderJambSubjectsByPreference(
  availableSubjects: readonly JambSubject[],
  preferences: JambStudyPreferences,
): JambSubject[] {
  const available = [...new Set(availableSubjects)];
  const preferred = preferences.subjects.filter((subject) => available.includes(subject));
  return [...preferred, ...available.filter((subject) => !preferred.includes(subject))];
}
