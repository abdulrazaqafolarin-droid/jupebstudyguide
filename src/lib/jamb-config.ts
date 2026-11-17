import type { Subject } from "@/types/question";

export const JAMB_SUBJECTS: Array<Exclude<Subject, "math">> = ["physics", "chemistry", "biology"];

export const JAMB_SUBJECT_INFO: Record<Subject, {
  label: string;
  icon: string;
  description: string;
}> = {
  physics: {
    label: "Physics",
    icon: "⚛️",
    description: "Mechanics, electricity, waves and modern physics",
  },
  chemistry: {
    label: "Chemistry",
    icon: "🧪",
    description: "Matter, reactions, calculations and organic chemistry",
  },
  biology: {
    label: "Biology",
    icon: "🧬",
    description: "Cells, organisms, ecology and human biology",
  },
  math: {
    label: "Mathematics",
    icon: "📐",
    description: "Not enabled in the initial JAMB science content pack",
  },
};

export const JAMB_TARGET_EXAM_YEAR = 2027;
export const JAMB_INITIAL_QUESTION_PAGE_SIZE = 20;
export const JAMB_CBT_MAX_QUESTIONS = 40;

export interface JambCbtPracticeConfig {
  subject: Exclude<Subject, "math">;
  questionCount: 10 | 20 | 40;
  durationMinutes: 10 | 20 | 40 | 60;
}

export const JAMB_CBT_PRACTICE_PRESETS: Array<{
  questionCount: JambCbtPracticeConfig["questionCount"];
  durationMinutes: JambCbtPracticeConfig["durationMinutes"];
  label: string;
}> = [
  { questionCount: 10, durationMinutes: 10, label: "Quick practice · 10 questions" },
  { questionCount: 20, durationMinutes: 20, label: "Focused practice · 20 questions" },
  { questionCount: 40, durationMinutes: 40, label: "Extended practice · 40 questions" },
];

export const JAMB_FULL_MOCK_ENABLED = false;
export const JAMB_SYLLABUS_VERIFIED = false;
