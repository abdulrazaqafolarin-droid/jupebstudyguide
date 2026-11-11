export type Subject = 'physics' | 'chemistry' | 'biology' | 'math';
export type QuestionType = 'mcq' | 'essay' | 'practical';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionImagePosition =
  | 'text-only'
  | 'image-only'
  | 'image-above'
  | 'image-beside'
  | `image-inline:${number}`
  | `image-inline:${number},${number}${string}`;

export interface MCQOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  subject: Subject;
  year: number;
  type: QuestionType;
  topic?: string;
  question: string;
  options?: MCQOption[];
  correctAnswer: string;
  explanation: string;
  difficulty?: Difficulty;
  imageUrl?: string;
  /** All images attached to the question; imageUrl remains the legacy first-image field. */
  imageUrls?: string[];
  imagePosition?: QuestionImagePosition;
  document_name?: string;
}

export interface StudyProgress {
  questionId: string;
  lastReviewed: Date;
  nextReview: Date;
  repetitions: number;
  easeFactor: number;
  interval: number;
  isLearned: boolean;
}

export interface StudySession {
  date: Date;
  questionsStudied: number;
  correctAnswers: number;
  subject?: Subject;
}

export const SUBJECT_INFO: Record<Subject, { name: string; icon: string; color: string }> = {
  physics: { name: 'Physics', icon: '⚛️', color: 'physics' },
  chemistry: { name: 'Chemistry', icon: '🧪', color: 'chemistry' },
  biology: { name: 'Biology', icon: '🧬', color: 'biology' },
  math: { name: 'Mathematics', icon: '📐', color: 'math' },
};
