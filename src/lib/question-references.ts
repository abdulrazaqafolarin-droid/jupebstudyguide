export interface QuestionRef {
  question_id: string;
  subject: string;
  year: number;
  category: string;
}

/** Validate citation metadata loaded from storage or a streamed RAG event. */
export function normalizeQuestionRefs(value: unknown): QuestionRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): QuestionRef[] => {
    if (!item || typeof item !== "object") return [];
    const ref = item as Record<string, unknown>;
    if (
      typeof ref.question_id !== "string" || !ref.question_id.trim() ||
      typeof ref.subject !== "string" || !ref.subject.trim() ||
      typeof ref.year !== "number" || !Number.isInteger(ref.year) ||
      typeof ref.category !== "string" || !ref.category.trim()
    ) return [];
    return [{
      question_id: ref.question_id,
      subject: ref.subject,
      year: ref.year,
      category: ref.category,
    }];
  }).slice(0, 12);
}
