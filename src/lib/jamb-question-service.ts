import { supabase } from "@/integrations/supabase/client";
import type { Subject, MCQOption } from "@/types/question";

export interface JambQuestion {
  id: string;
  subject: Exclude<Subject, "math">;
  year: number;
  category: "objective";
  question: string;
  options: MCQOption[];
  topic?: string;
  sortOrder: number;
  imageUrl?: string;
  imageUrls: string[];
  imagePosition?: string;
  sourceReference?: string;
  sourcePage?: number;
  sourceQuestionNumber?: string;
}

export interface JambSubjectSummary {
  subject: Exclude<Subject, "math">;
  count: number;
  years: number[];
}

type QuestionRow = {
  id: string;
  subject: Subject;
  year: number;
  category: string;
  question: string | null;
  options: unknown;
  course: string | null;
  sort_order: number | null;
  image_url: string | null;
  image_urls: unknown;
  image_position: string | null;
  source_ref: string | null;
  source_document: string | null;
  source_page: number | null;
  source_question_number: string | null;
};

const QUESTION_COLUMNS = [
  "id", "subject", "year", "category", "question", "options", "course",
  "sort_order", "image_url", "image_urls", "image_position", "source_ref",
  "source_document", "source_page", "source_question_number",
].join(",");

function mapOptions(value: unknown): MCQOption[] {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry): MCQOption[] => {
      if (typeof entry === "string") return [];
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const label = String(record.label ?? "").trim().toUpperCase();
      const text = String(record.text ?? "").trim();
      return /^[A-E]$/.test(label) && text ? [{ label, text }] : [];
    });
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).flatMap(([label, value]): MCQOption[] => {
      const text = String(value ?? "").trim();
      return /^[A-E]$/i.test(label) && text
        ? [{ label: label.toUpperCase(), text }]
        : [];
    });
  }
  return [];
}

function mapQuestion(row: QuestionRow): JambQuestion {
  let imageUrls: string[] = [];
  if (Array.isArray(row.image_urls)) {
    imageUrls = row.image_urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  } else if (typeof row.image_urls === "string") {
    try {
      const parsed = JSON.parse(row.image_urls);
      if (Array.isArray(parsed)) imageUrls = parsed.filter((url): url is string => typeof url === "string" && url.length > 0);
    } catch { /* keep the legacy single-image field */ }
  }
  if (imageUrls.length === 0 && row.image_url) imageUrls = [row.image_url];

  return {
    id: row.id,
    subject: row.subject as Exclude<Subject, "math">,
    year: row.year,
    category: "objective",
    question: row.question ?? "",
    options: mapOptions(row.options),
    topic: row.course ?? undefined,
    sortOrder: row.sort_order ?? 0,
    imageUrl: row.image_url ?? imageUrls[0],
    imageUrls,
    imagePosition: row.image_position ?? undefined,
    sourceReference: row.source_ref ?? row.source_document ?? undefined,
    sourcePage: row.source_page ?? undefined,
    sourceQuestionNumber: row.source_question_number ?? undefined,
  };
}

function isMissingJambSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01" ||
    /column .* does not exist|relation .* does not exist|schema cache/i.test(error.message ?? "");
}

export class JambSchemaUnavailableError extends Error {
  constructor(message = "The JAMB database migration has not been applied yet.") {
    super(message);
    this.name = "JambSchemaUnavailableError";
  }
}

export async function getJambSubjectSummaries(): Promise<JambSubjectSummary[]> {
  const subjects: Array<Exclude<Subject, "math">> = ["physics", "chemistry", "biology"];
  const results = await Promise.all(subjects.map(async (subject) => {
    const { data, error, count } = await supabase
      .from("study_questions")
      .select("year", { count: "exact" })
      .eq("exam_program_id", "jamb")
      .eq("review_status", "published")
      .eq("hidden", false)
      .eq("subject", subject)
      .eq("category", "objective")
      .order("year", { ascending: false })
      .limit(5000);

    if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
    if (error) throw error;
    const years = [...new Set((data ?? []).map((row) => row.year))].sort((a, b) => b - a);
    return { subject, count: count ?? data?.length ?? 0, years };
  }));
  return results;
}

export async function getJambQuestionYears(
  subject: Exclude<Subject, "math">,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("study_questions")
    .select("year")
    .eq("exam_program_id", "jamb")
    .eq("review_status", "published")
    .eq("hidden", false)
    .eq("subject", subject)
    .eq("category", "objective")
    .order("year", { ascending: false })
    .limit(5000);

  if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.year))].sort((a, b) => b - a);
}

export async function searchJambQuestions(args: {
  subject: Exclude<Subject, "math">;
  year?: number | null;
  search?: string;
  offset?: number;
  limit?: number;
}): Promise<{ questions: JambQuestion[]; count: number }> {
  const { subject, year, search, offset = 0, limit = 20 } = args;
  let query = supabase
    .from("study_questions")
    .select(QUESTION_COLUMNS, { count: "exact" })
    .eq("exam_program_id", "jamb")
    .eq("review_status", "published")
    .eq("hidden", false)
    .eq("subject", subject)
    .eq("category", "objective")
    .order("year", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (year) query = query.eq("year", year);
  if (search?.trim()) query = query.ilike("question", `%${search.trim().replace(/[%_]/g, "\\$&")}%`);

  const { data, error, count } = await query;
  if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
  if (error) throw error;

  return {
    questions: ((data ?? []) as unknown as QuestionRow[]).map(mapQuestion),
    count: count ?? 0,
  };
}

export async function getJambPublishedQuestionById(questionId: string): Promise<JambQuestion | null> {
  const { data, error } = await supabase
    .from("study_questions")
    .select(QUESTION_COLUMNS)
    .eq("id", questionId)
    .eq("exam_program_id", "jamb")
    .eq("review_status", "published")
    .eq("hidden", false)
    .maybeSingle();

  if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
  if (error) throw error;
  return data ? mapQuestion(data as unknown as QuestionRow) : null;
}

/** The public question projection deliberately does not select answer keys or explanations. */
export function toSafeJambQuestionPayload(question: JambQuestion) {
  return {
    id: question.id,
    subject: question.subject,
    year: question.year,
    category: question.category,
    question: question.question,
    options: question.options,
    topic: question.topic ?? null,
    imageUrl: question.imageUrl ?? null,
    imageUrls: question.imageUrls,
    imagePosition: question.imagePosition ?? null,
    sourceReference: question.sourceReference ?? null,
  };
}
