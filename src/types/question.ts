export type Subject = 'physics' | 'chemistry' | 'biology' | 'math';
export type QuestionType = 'mcq' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';

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
