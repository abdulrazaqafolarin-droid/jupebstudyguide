import type { Question } from "@/types/question";
import type { StudyQuestion } from "@/types/study-questions";

export function toQuestion(sq: StudyQuestion): Question {
  return {
    id: sq.id,
    subject: sq.subject,
    year: sq.year,
    type: sq.category === "objective" ? "mcq" : sq.category === "practical" ? "practical" : "essay",
    topic: sq.topic,
    question: sq.question,
    options: sq.options,
    correctAnswer: sq.correctAnswer ?? "",
    explanation: sq.explanation ?? sq.answerGuide ?? "",
    difficulty: sq.difficulty,
    imageUrl: sq.imageUrl,
    imageUrls: sq.imageUrls?.length ? [...sq.imageUrls] : sq.imageUrl ? [sq.imageUrl] : undefined,
    imagePosition: sq.imagePosition,
  };
}

export function toQuestions(studyQuestions: StudyQuestion[]): Question[] {
  return studyQuestions.map(toQuestion);
}
