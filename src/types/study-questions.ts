import type { Subject, Difficulty, MCQOption } from "./question";

export type StudyCategory = "objective" | "theory" | "practical";

export interface TheoryQuestion {
  id: string;
  subject: Subject;
  year: number;
  type: "theory";
  topic?: string;
  question: string;
  answerGuide: string;
  markScheme?: { point: string; marks: number }[];
  totalMarks: number;
  difficulty?: Difficulty;
}

export interface PracticalQuestion {
  id: string;
  subject: Subject;
  year: number;
  type: "practical";
  topic?: string;
  title: string;
  objective: string;
  apparatus?: string[];
  procedure: string;
  observations?: { label: string; value: string }[];
  questions: { id: string; text: string; answerGuide: string }[];
  totalMarks: number;
  difficulty?: Difficulty;
}

export interface StudyQuestion {
  id: string;
  subject: Subject;
  year: number;
  category: StudyCategory;
  course?: string;
  topic?: string;
  sortOrder?: number;
  question: string;
  options?: MCQOption[];
  correctAnswer?: string;
  explanation?: string;
  answerGuide?: string;
  markScheme?: { point: string; marks: number }[];
  totalMarks?: number;
  title?: string;
  objective?: string;
  apparatus?: string[];
  procedure?: string;
  subQuestions?: { id: string; text: string; answerGuide: string }[];
  difficulty?: Difficulty;
  imageUrl?: string;
  imagePosition?: "text-only" | "image-only" | "image-above" | "image-beside";
}

export interface YearData {
  year: number;
  subjects: Record<Subject, SubjectYearData>;
}

export interface SubjectYearData {
  objective: StudyQuestion[];
  theory: StudyQuestion[];
  practical: StudyQuestion[];
}

export interface StudyBookmark {
  questionId: string;
  createdAt: number;
  notes?: string;
}

export interface StudyProgressEntry {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  attemptedAt: number;
}

export interface StudySessionData {
  subject: Subject;
  category: StudyCategory;
  year: number;
  totalQuestions: number;
  correct: number;
  startTime: number;
  endTime?: number;
  answers: { questionId: string; chosenAnswer?: string; isCorrect: boolean; timeSpent: number }[];
}

export interface SubjectMeta {
  subject: Subject;
  icon: string;
  gradient: string;
  lightGradient: string;
  color: string;
  description: string;
}

export const STUDY_SUBJECT_INFO: Record<Subject, SubjectMeta> = {
  physics: {
    subject: "physics",
    icon: "⚛️",
    gradient: "from-physics/80 to-physics/30",
    lightGradient: "from-physics/10 to-physics/5",
    color: "hsl(var(--physics))",
    description: "Solve and master calculations",
  },
  chemistry: {
    subject: "chemistry",
    icon: "🧪",
    gradient: "from-chemistry/80 to-chemistry/30",
    lightGradient: "from-chemistry/10 to-chemistry/5",
    color: "hsl(var(--chemistry))",
    description: "Explore reactions and equations",
  },
  biology: {
    subject: "biology",
    icon: "🧬",
    gradient: "from-biology/80 to-biology/30",
    lightGradient: "from-biology/10 to-biology/5",
    color: "hsl(var(--biology))",
    description: "Understand life and organisms",
  },
  math: {
    subject: "math",
    icon: "📐",
    gradient: "from-math/80 to-math/30",
    lightGradient: "from-math/10 to-math/5",
    color: "hsl(var(--math))",
    description: "Calculate and prove theorems",
  },
};

export const STUDY_YEARS = Array.from({ length: 12 }, (_, i) => 2014 + i);
