import { supabase } from "@/integrations/supabase/client";
import type { Subject } from "@/types/question";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";

interface MCQOption {
  label: string;
  text: string;
}

interface QuestionInput {
  id: string;
  subject: Subject;
  year: number;
  category: StudyCategory;
  question: string;
  options?: MCQOption[] | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  difficulty?: string;
  topic?: string | null;
}

function toDbRow(input: QuestionInput) {
  return {
    id: input.id,
    subject: input.subject,
    year: input.year,
    category: input.category,
    question: input.question,
    options: input.options ? JSON.stringify(input.options) : null,
    correct_answer: input.correctAnswer || null,
    explanation: input.explanation || null,
    difficulty: input.difficulty || "medium",
    course: input.topic || null,
  };
}

export async function addQuestion(input: QuestionInput): Promise<{ success: boolean; error?: string }> {
  try {
    const dbRow = toDbRow(input);
    const { error } = await supabase
      .from("study_questions")
      .insert(dbRow);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateQuestion(
  id: string,
  updates: Partial<QuestionInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.question !== undefined) dbUpdates.question = updates.question;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.options !== undefined) dbUpdates.options = updates.options ? JSON.stringify(updates.options) : null;
    if (updates.correctAnswer !== undefined) dbUpdates.correct_answer = updates.correctAnswer || null;
    if (updates.explanation !== undefined) dbUpdates.explanation = updates.explanation || null;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.topic !== undefined) dbUpdates.course = updates.topic || null;

    const { error } = await supabase
      .from("study_questions")
      .update(dbUpdates)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteQuestion(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("study_questions")
      .delete()
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function generateQuestionId(subject: Subject, year: number, category: StudyCategory): string {
  const prefix = subject === "chemistry" ? "che" : subject === "physics" ? "phy" : subject === "biology" ? "bio" : "mat";
  const type = category === "objective" ? "mq" : category === "theory" ? "th" : "pr";
  const timestamp = Date.now().toString(36).slice(-4);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${year}-${type}-${timestamp}${random}`;
}
