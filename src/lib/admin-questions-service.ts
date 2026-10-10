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
  sortOrder?: number;
  imageUrl?: string | null;
}

function toDbRow(input: QuestionInput) {
  return {
    id: input.id,
    subject: input.subject,
    year: input.year,
    category: input.category,
    question: input.question || null,
    options: input.options ? JSON.stringify(input.options) : null,
    correct_answer: input.correctAnswer || null,
    explanation: input.explanation || null,
    difficulty: input.difficulty || "medium",
    course: input.topic || null,
    sort_order: input.sortOrder ?? 0,
    image_url: input.imageUrl || null,
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
  input: QuestionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbRow = toDbRow(input);
    const { error } = await supabase
      .from("study_questions")
      .upsert(dbRow, { onConflict: "id" });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function batchUpdateSortOrder(
  updates: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const u of updates) {
      const { error } = await supabase
        .from("study_questions")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
      if (error) return { success: false, error: error.message };
    }
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

const DELETED_IDS_STORAGE_KEY = "jupeb_deleted_question_ids";

function readDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

export function getPersistedDeletedIds(): Set<string> {
  return readDeletedIds();
}

export function persistDeletedId(id: string): void {
  try {
    const ids = readDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function removePersistedDeletedId(id: string): void {
  try {
    const ids = readDeletedIds();
    ids.delete(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable — ignore
  }
}

export function generateQuestionId(subject: Subject, year: number, category: StudyCategory): string {
  const prefix = subject === "chemistry" ? "che" : subject === "physics" ? "phy" : subject === "biology" ? "bio" : "mat";
  const type = category === "objective" ? "mq" : category === "theory" ? "th" : "pr";
  const timestamp = Date.now().toString(36).slice(-4);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${year}-${type}-${timestamp}${random}`;
}

const STORAGE_BUCKET = "question-images";

export function getQuestionImagePublicUrl(questionId: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(questionId);
  return data.publicUrl;
}

export async function uploadQuestionImage(
  questionId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${questionId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) return { success: false, error: uploadError.message };

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function deleteQuestionImage(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: fileList } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(undefined, { search: questionId });

    if (fileList && fileList.length > 0) {
      const filesToDelete = fileList.map(f => f.name);
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filesToDelete);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
}
