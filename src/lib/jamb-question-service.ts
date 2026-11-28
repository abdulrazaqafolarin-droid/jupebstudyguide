import { supabase } from "@/integrations/supabase/client";
import type { MCQOption } from "@/types/question";
import { JAMB_QUESTION_BANK_SUBJECTS, type JambSubject } from "@/lib/jamb-config";
import { JAMB_STUDENT_QUESTION_VISIBILITY } from "@/lib/jamb-question-visibility";

export interface JambQuestion {
  id: string;
  subject: JambSubject;
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
  /** Admin-only fields are returned only by the protected question manager endpoint. */
  correctAnswer?: string;
  explanation?: string;
  answerKeyStatus?: string;
  answerKeyVerified?: boolean;
  answerConfidence?: "unrated" | "low" | "medium" | "high";
  confidenceNote?: string;
  evidenceReference?: string;
  draftVersion?: number;
  /** Present only in the protected admin question-manager response. */
  reviewStatus?: string;
  hidden?: boolean;
  difficulty?: "easy" | "medium" | "hard" | string;
  sourceDocument?: string;
  rightsNote?: string;
}

export interface JambSubjectSummary {
  subject: JambSubject;
  count: number;
  years: number[];
}

type QuestionRow = {
  id: string;
  subject: JambSubject;
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

interface SearchCacheEntry {
  loadedAt: number;
  questions: JambQuestion[];
}

const jambQuestionSearchCache = new Map<string, SearchCacheEntry>();
const JAMB_QUESTION_SEARCH_CACHE_TTL_MS = 60_000;
const JAMB_QUESTION_SEARCH_CACHE_MAX_ENTRIES = 16;

function getSourceQuestionSequence(value?: string): { number: number; suffix: string } | null {
  const sourceNumber = String(value ?? "").trim();
  const match = /(\d+)/.exec(sourceNumber);
  if (!match) return null;
  const suffix = sourceNumber.slice((match.index ?? 0) + match[0].length)
    .match(/^[a-z]+/i)?.[0]?.toLowerCase() ?? "";
  return { number: Number(match[0]), suffix };
}

/**
 * Preserve explicit admin ordering where present. Legacy/imported JAMB rows
 * often have sort_order=0, so use their printed source number as the fallback.
 * This prevents IDs from deciding question order and keeps Q29/Q29b together.
 */
export function compareJambQuestionOrder(a: JambQuestion, b: JambQuestion): number {
  if (a.year !== b.year) return b.year - a.year;

  const aSequence = getSourceQuestionSequence(a.sourceQuestionNumber);
  const bSequence = getSourceQuestionSequence(b.sourceQuestionNumber);
  const aOrder = a.sortOrder > 0 ? a.sortOrder : aSequence?.number ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.sortOrder > 0 ? b.sortOrder : bSequence?.number ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  const aHasExplicitOrder = a.sortOrder > 0;
  const bHasExplicitOrder = b.sortOrder > 0;
  if (aHasExplicitOrder !== bHasExplicitOrder) return aHasExplicitOrder ? -1 : 1;

  if (aSequence && bSequence && aSequence.number === bSequence.number) {
    const suffixOrder = aSequence.suffix.localeCompare(bSequence.suffix);
    if (suffixOrder !== 0) return suffixOrder;
  }

  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
}

/** Clear cached learner question lists after the admin manager changes a bank. */
export function invalidateJambQuestionSearchCache(): void {
  jambQuestionSearchCache.clear();
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
    subject: row.subject as JambSubject,
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
  const subjects: readonly JambSubject[] = JAMB_QUESTION_BANK_SUBJECTS;
  const results = await Promise.all(subjects.map(async (subject) => {
    const { data, error, count } = await supabase
      .from("study_questions")
      .select("year", { count: "exact" })
      .eq("exam_program_id", "jamb")
      .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
      .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
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


/** Mirrors the JAMB CBT server's exact A-D candidate eligibility rule. */
export function isJambCbtQuestionCandidate(candidate: { question: unknown; options: unknown }): boolean {
  const question = String(candidate.question ?? "").trim();
  let parsed = candidate.options;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return false; }
  }
  if (!Array.isArray(parsed)) return false;

  const options = parsed.flatMap((value): Array<{ label: string; text: string }> => {
    if (!value || typeof value !== "object") return [];
    const option = value as Record<string, unknown>;
    const label = String(option.label ?? "").toUpperCase();
    const text = String(option.text ?? "");
    return /^[A-E]$/.test(label) && text.trim() ? [{ label, text }] : [];
  });
  return question.length >= 8 &&
    ((options.length === 4 && options.map((option) => option.label).join(",") === "A,B,C,D") ||
      (options.length === 5 && options.map((option) => option.label).join(",") === "A,B,C,D,E"));
}

/** Count the same first 500 published candidates the server can draw from. */
export async function getJambCbtAvailableQuestionCount(
  subject: JambSubject,
): Promise<number> {
  const { data, error } = await supabase
    .from("study_questions")
    .select("question,options")
    .eq("exam_program_id", "jamb")
    .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
    .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
    .eq("subject", subject)
    .eq("category", "objective")
    .limit(500);

  if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
  if (error) throw error;
  return (data ?? []).filter(isJambCbtQuestionCandidate).length;
}

export interface JambQuestionMetadata {
  id: string;
  subject: JambSubject;
  year: number;
}

/** Read only public metadata needed to group a learner's JAMB activity. */
export async function getJambQuestionMetadataByIds(questionIds: string[]): Promise<JambQuestionMetadata[]> {
  const uniqueIds = [...new Set(questionIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (uniqueIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    chunks.push(uniqueIds.slice(index, index + 100));
  }

  const rows = await Promise.all(chunks.map(async (ids) => {
    const { data, error } = await supabase
      .from("study_questions")
      .select("id,subject,year")
      .eq("exam_program_id", "jamb")
      .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
      .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
      .in("id", ids);

    if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      subject: row.subject as JambSubject,
      year: row.year,
    }));
  }));

  return rows.flat();
}

/**
 * Load the public metadata for the complete published JAMB bank.
 * Answer keys and explanations are deliberately not selected here.
 * Pagination keeps subject totals and spaced-repetition statistics accurate
 * without loading question text or protected answers into the learner client.
 */
export async function getJambPublishedQuestionMetadata(): Promise<JambQuestionMetadata[]> {
  const subjects: readonly JambSubject[] = JAMB_QUESTION_BANK_SUBJECTS;
  const pageSize = 1000;
  const perSubject = await Promise.all(subjects.map(async (subject) => {
    const rows: JambQuestionMetadata[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("study_questions")
        .select("id,subject,year")
        .eq("exam_program_id", "jamb")
        .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
        .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
        .eq("subject", subject)
        .eq("category", "objective")
        .order("year", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
      if (error) throw error;

      const page = (data ?? []).map((row) => ({
        id: row.id,
        subject: row.subject as JambSubject,
        year: row.year,
      }));
      rows.push(...page);

      if (page.length < pageSize) break;
      offset += pageSize;
    }
    return rows;
  }));

  return perSubject.flat();
}

export interface JambQuestionYearSummaries {
  years: number[];
  counts: Record<number, number>;
}

export async function getJambQuestionYearSummaries(
  subject: JambSubject,
): Promise<JambQuestionYearSummaries> {
  const { data, error } = await supabase
    .from("study_questions")
    .select("year")
    .eq("exam_program_id", "jamb")
    .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
    .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
    .eq("subject", subject)
    .eq("category", "objective")
    .order("year", { ascending: false })
    .limit(5000);

  if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
  if (error) throw error;

  const counts: Record<number, number> = {};
  for (const row of data ?? []) counts[row.year] = (counts[row.year] ?? 0) + 1;
  return { years: Object.keys(counts).map(Number).sort((a, b) => b - a), counts };
}

export async function getJambQuestionYears(subject: JambSubject): Promise<number[]> {
  return (await getJambQuestionYearSummaries(subject)).years;
}

export async function searchJambQuestions(args: {
  subject: JambSubject;
  year?: number | null;
  search?: string;
  offset?: number;
  limit?: number;
}): Promise<{ questions: JambQuestion[]; count: number }> {
  const { subject, year, search, offset = 0, limit = 20 } = args;
  const normalizedSearch = search?.trim() ?? "";
  const cacheKey = [subject, year ?? "all", normalizedSearch.toLocaleLowerCase()].join("|");
  const cached = jambQuestionSearchCache.get(cacheKey);
  const now = Date.now();
  let entry = cached && now - cached.loadedAt < JAMB_QUESTION_SEARCH_CACHE_TTL_MS
    ? cached
    : undefined;

  if (!entry) {
    const pageSize = 500;
    const allRows: QuestionRow[] = [];
    let exactCount = 0;

    while (true) {
      let query = supabase
        .from("study_questions")
        .select(QUESTION_COLUMNS, { count: "exact" })
        .eq("exam_program_id", "jamb")
        .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
        .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
        .eq("subject", subject)
        .eq("category", "objective")
        .order("id", { ascending: true });

      if (year) query = query.eq("year", year);
      if (normalizedSearch) {
        query = query.ilike("question", `%${normalizedSearch.replace(/[%_]/g, "\\$&")}%`);
      }

      const pageOffset = allRows.length;
      const { data, error, count } = await query.range(pageOffset, pageOffset + pageSize - 1);
      if (isMissingJambSchema(error)) throw new JambSchemaUnavailableError();
      if (error) throw error;

      if (pageOffset === 0) exactCount = count ?? Number.MAX_SAFE_INTEGER;
      const page = (data ?? []) as unknown as QuestionRow[];
      allRows.push(...page);
      if (page.length < pageSize || allRows.length >= exactCount) break;
    }

    const questions = allRows.map(mapQuestion).sort(compareJambQuestionOrder);
    entry = { loadedAt: now, questions };
    if (jambQuestionSearchCache.size >= JAMB_QUESTION_SEARCH_CACHE_MAX_ENTRIES) {
      const oldestKey = jambQuestionSearchCache.keys().next().value;
      if (oldestKey) jambQuestionSearchCache.delete(oldestKey);
    }
    jambQuestionSearchCache.set(cacheKey, entry);
  }

  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  return {
    questions: entry.questions.slice(safeOffset, safeOffset + safeLimit),
    count: entry.questions.length,
  };
}

export async function getJambPublishedQuestionById(questionId: string): Promise<JambQuestion | null> {
  const { data, error } = await supabase
    .from("study_questions")
    .select(QUESTION_COLUMNS)
    .eq("id", questionId)
    .eq("exam_program_id", "jamb")
    .eq("review_status", JAMB_STUDENT_QUESTION_VISIBILITY.review_status)
    .eq("hidden", JAMB_STUDENT_QUESTION_VISIBILITY.hidden)
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
