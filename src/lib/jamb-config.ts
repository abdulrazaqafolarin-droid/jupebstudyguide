// Optional science subjects used by the onboarding preference picker.
export const JAMB_SUBJECTS = ["physics", "chemistry", "biology"] as const;

// All JAMB question-bank subjects, including the compulsory Use of English paper.
export const JAMB_QUESTION_BANK_SUBJECTS = [
  "physics",
  "chemistry",
  "biology",
  "use_of_english",
] as const;
export type JambSubject = (typeof JAMB_QUESTION_BANK_SUBJECTS)[number];

export const JAMB_SUBJECT_INFO: Record<JambSubject | "math", {
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
  use_of_english: {
    label: "Use of English",
    icon: "📘",
    description: "Comprehension, lexis and structure, oral forms and communication",
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
  subject: JambSubject;
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
