import { generateEmbedding } from "./textbook-embed.ts";

export interface RetrievedQuestion {
  question_id: string;
  subject: string;
  year: number;
  category: string;
  question: string;
  options: unknown;
  correct_answer: string | null;
  explanation: string | null;
  similarity: number;
}

export interface QuestionReference {
  kind: "question";
  number: number;
  question_id: string;
  subject: string;
  year: number;
  category: string;
  similarity: number;
}

export interface RetrieveQuestionsOptions {
  subject?: string;
  maxQuestions?: number;
  similarityThreshold?: number;
  /** Resolved Gemini key(s) — vault first. Falls back to env when omitted. */
  embedKey?: string | string[];
}

/** Canonical text used both for indexing (RETRIEVAL_DOCUMENT) and querying. */
export function formatQuestionForEmbedding(q: {
  subject: string;
  year: number | string;
  category: string;
  question: string;
  options?: unknown;
  correct_answer?: string | null;
  explanation?: string | null;
}): string {
  const lines = [
    `${q.subject} (${q.year} ${q.category})`,
    `Q: ${q.question}`,
  ];
  if (q.options) {
    lines.push(`Options: ${JSON.stringify(q.options)}`);
  }
  if (q.correct_answer) {
    lines.push(`Answer: ${q.correct_answer}`);
  }
  if (q.explanation) {
    lines.push(`Explanation: ${q.explanation}`);
  }
  return lines.join("\n");
}

export async function retrieveRelevantQuestions(
  supabaseUrl: string,
  supabaseKey: string,
  query: string,
  options: RetrieveQuestionsOptions = {}
): Promise<RetrievedQuestion[]> {
  const maxQuestions = options.maxQuestions ?? 5;
  const threshold = options.similarityThreshold ?? 0.45;

  const embedding = await generateEmbedding(query, options.embedKey, "RETRIEVAL_QUERY");
  if (!embedding) return [];

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_study_questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query_embedding: `[${embedding.join(",")}]`,
      match_threshold: threshold,
      match_count: maxQuestions,
      filter_subject: options.subject || null,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    console.error(`[QRetrieve] match_study_questions failed (${res.status}): ${errText.slice(0, 200)}`);
    return [];
  }

  const data = await res.json();
  return (data || []) as RetrievedQuestion[];
}

function formatOptions(options: unknown): string {
  if (!options) return "";
  try {
    if (Array.isArray(options)) {
      return options
        .map((o) => {
          if (typeof o === "string") return o;
          if (o && typeof o === "object") {
            const rec = o as Record<string, unknown>;
            const label = String(rec.label ?? rec.key ?? rec.id ?? "").trim();
            const text = String(rec.text ?? rec.value ?? rec.option ?? "").trim();
            return label ? `${label}) ${text}` : text;
          }
          return String(o);
        })
        .filter(Boolean)
        .join(" | ");
    }
    if (typeof options === "object") {
      return Object.entries(options as Record<string, unknown>)
        .map(([k, v]) => `${k}) ${v}`)
        .join(" | ");
    }
    return String(options);
  } catch {
    return "";
  }
}

export function buildQuestionRAGContext(questions: RetrievedQuestion[]): {
  promptBlock: string;
  references: QuestionReference[];
} {
  if (questions.length === 0) return { promptBlock: "", references: [] };

  const references: QuestionReference[] = questions.map((q, i) => ({
    kind: "question",
    number: i + 1,
    question_id: q.question_id,
    subject: q.subject,
    year: q.year,
    category: q.category,
    similarity: q.similarity,
  }));

  const cap = (s: string | null, n: number): string =>
    !s ? "" : s.length > n ? s.slice(0, n) + "…" : s;

  const sections = questions.map((q, i) => {
    const label = `${q.year} ${q.subject} (${q.category})`;
    const parts = [
      `[Q${i + 1}] (${label})`,
      `Question: ${cap(q.question, 600)}`,
    ];
    const opts = formatOptions(q.options);
    if (opts) parts.push(`Options: ${cap(opts, 600)}`);
    if (q.correct_answer) parts.push(`Correct answer: ${cap(q.correct_answer, 200)}`);
    if (q.explanation) parts.push(`Explanation: ${cap(q.explanation, 800)}`);
    return parts.join("\n");
  });

  const promptBlock = `\n\n=== RELEVANT PAST QUESTIONS (from this app's question bank) ===\n${sections.join("\n\n")}\n\n=== HOW TO USE THEM ===\n- These are real JUPEB-style questions on this platform. Reference them when teaching (e.g. "see 2019 Physics Q3 above" — restate the question when you cite it).\n- Use them as worked examples: walk through the solution step by step.\n- When the student is ready, quiz them with one of these questions BEFORE revealing its answer.\n- Cite like [Q1], [Q2] inline. If none is relevant, teach from your own knowledge without citing.`;

  return { promptBlock, references };
}

export function serializeQuestionReferencesEvent(references: QuestionReference[]): string {
  return `data: ${JSON.stringify({ type: "question-references", references })}\n\n`;
}
