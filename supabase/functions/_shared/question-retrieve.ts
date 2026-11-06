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
  year?: number;
  category?: string;
  maxQuestions?: number;
  similarityThreshold?: number;
  /** Resolved Gemini key(s) — vault first. Falls back to env when omitted. */
  embedKey?: string | string[];
}

export interface QuestionChatMessage {
  role: string;
  content?: string | null;
}

/** Expand on-demand retrieval when the student explicitly requests a question set. */
export function getRequestedQuestionCount(query: string, defaultCount = 6): number {
  const clean = query.trim().toLowerCase();
  const explicitCount = clean.match(/\b(\d{1,2})\s+(?:(?:physics|chemistry|biology|math(?:ematics)?|objective|theory|practical|past|jupeb|201[4-9]|202[0-6])\s+){0,6}questions?\b);
  if (explicitCount) {
    return Math.min(Math.max(Number(explicitCount[1]), 1), 12);
  }
  if (/\b(?:all|every|complete list|full set)\b/.test(clean) &&
      /\b(?:questions?|question bank|objective|theory|practical)\b/.test(clean)) {
    return 12;
  }
  return Math.min(Math.max(defaultCount, 1), 12);
}

/** Preserve the current question for short follow-ups such as "why?" or "explain it". */
export function buildQuestionRetrievalQuery(
  explicitQuery: string | null | undefined,
  messages: QuestionChatMessage[] = [],
): string {
  const explicit = explicitQuery?.trim();
  if (explicit) return explicit.slice(0, 4000);

  const userMessages = messages
    .filter((message) => message.role === "user" && typeof message.content === "string" && message.content.trim())
    .slice(-3)
    .map((message) => message.content!.trim());

  const latest = userMessages[userMessages.length - 1] || "";
  const previous = userMessages[userMessages.length - 2] || "";
  if (latest.length <= 100 && previous) {
    return `Previous study question or topic: ${previous.slice(0, 1200)}\nStudent follow-up: ${latest.slice(0, 500)}`.slice(0, 2000);
  }
  return latest.slice(0, 2000);
}

/** Canonical document text used by both indexing and retrieval embeddings. */
export function formatQuestionForEmbedding(q: {
  subject: string;
  year: number | string;
  category: string;
  question: string;
  id?: string;
  options?: unknown;
  correct_answer?: string | null;
  explanation?: string | null;
  course?: string | null;
  difficulty?: string | null;
  image_url?: string | null;
}): string {
  const lines = [
    q.id ? `Question ID: ${q.id}` : "",
    `JUPEB ${q.subject} past question, ${q.year}, ${q.category}`,
    q.course ? `Topic: ${q.course}` : "",
    q.difficulty ? `Difficulty: ${q.difficulty}` : "",
    `Question: ${q.question || ""}`,
  ].filter(Boolean);
  if (q.options) lines.push(`Options: ${JSON.stringify(q.options)}`);
  if (q.correct_answer) lines.push(`Correct answer: ${q.correct_answer}`);
  if (q.explanation) lines.push(`Explanation: ${q.explanation}`);
  if (q.image_url) lines.push("An accompanying question image/diagram is available in the study app.");
  return lines.join("\n");
}

function detectFilters(query: string, subject?: string, year?: number, category?: string) {
  const lower = query.toLowerCase();
  const subjects = [
    ["physics", /\bphysics\b/],
    ["chemistry", /\bchemistry\b/],
    ["biology", /\bbiology\b/],
    ["math", /\b(?:math|mathematics)\b/],
  ] as const;
  const foundSubjects = subjects.filter(([, pattern]) => pattern.test(lower)).map(([name]) => name);
  const yearMatch = lower.match(/\b(201[4-9]|202[0-5])\b/);
  const foundCategory = /\bpractical\b/.test(lower)
    ? "practical"
    : /\b(?:theory|essay)\b/.test(lower)
      ? "theory"
      : /\b(?:objective|mcq|multiple.choice)\b/.test(lower)
        ? "objective"
        : undefined;

  return {
    subject: subject || (foundSubjects.length === 1 ? foundSubjects[0] : undefined),
    year: year ?? (yearMatch ? Number(yearMatch[1]) : undefined),
    category: category || foundCategory,
  };
}

type RankedQuestion = {
  question: RetrievedQuestion;
  score: number;
};

export function mergeQuestionMatches(
  vectorRows: RetrievedQuestion[],
  textRows: RetrievedQuestion[],
  maxQuestions: number,
): RetrievedQuestion[] {
  const ranked = new Map<string, RankedQuestion>();
  const add = (rows: RetrievedQuestion[]) => {
    rows.forEach((question, index) => {
      const key = question.question_id;
      const current = ranked.get(key);
      const score = 1 / (60 + index + 1);
      if (current) {
        current.score += score;
        if (question.similarity > current.question.similarity) current.question = question;
      } else {
        ranked.set(key, { question, score });
      }
    });
  };

  add(vectorRows);
  add(textRows);
  return [...ranked.values()]
    .sort((a, b) => b.score - a.score || b.question.similarity - a.question.similarity)
    .slice(0, Math.max(1, maxQuestions))
    .map((entry) => entry.question);
}

async function callQuestionRpc(
  supabaseUrl: string,
  supabaseKey: string,
  rpc: string,
  body: Record<string, unknown>,
): Promise<RetrievedQuestion[]> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(7_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.warn(`[QRetrieve] ${rpc} failed (${res.status}): ${errText.slice(0, 180)}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data as RetrievedQuestion[] : [];
  } catch (err) {
    console.warn(`[QRetrieve] ${rpc} request failed: ${String(err).slice(0, 160)}`);
    return [];
  }
}

async function embeddingWithinBudget(
  query: string,
  apiKey: string | string[] | undefined,
  budgetMs = 6_500,
): Promise<number[] | null> {
  const embeddingPromise = generateEmbedding(query, apiKey, "RETRIEVAL_QUERY")
    .catch((err) => {
      console.warn("[QRetrieve] query embedding unavailable:", String(err).slice(0, 160));
      return null;
    });

  return await new Promise<number[] | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), budgetMs);
    void embeddingPromise.then((embedding) => {
      clearTimeout(timer);
      resolve(embedding);
    });
  });
}

/**
 * Hybrid RAG: vector similarity finds semantic matches while Postgres full-text
 * search catches exact wording, option phrases, years and question identifiers.
 * Either source can return useful questions when the other is unavailable.
 */
export async function retrieveRelevantQuestions(
  supabaseUrl: string,
  supabaseKey: string,
  query: string,
  options: RetrieveQuestionsOptions = {},
): Promise<RetrievedQuestion[]> {
  const cleanQuery = query.trim().slice(0, 2000);
  if (!cleanQuery) return [];

  const maxQuestions = Math.min(Math.max(options.maxQuestions ?? 6, 1), 12);
  const candidateCount = Math.min(Math.max(maxQuestions * 3, 8), 24);
  const threshold = options.similarityThreshold ?? 0.35;
  const filters = detectFilters(cleanQuery, options.subject, options.year, options.category);

  const lexicalPromise = callQuestionRpc(supabaseUrl, supabaseKey, "match_study_questions_text", {
    query_text: cleanQuery,
    match_count: candidateCount,
    filter_subject: filters.subject || null,
    filter_year: filters.year || null,
    filter_category: filters.category || null,
  });

  const embedding = await embeddingWithinBudget(cleanQuery, options.embedKey);
  const vectorPromise = embedding
    ? callQuestionRpc(supabaseUrl, supabaseKey, "match_study_questions", {
        query_embedding: `[${embedding.join(",")}]`,
        match_threshold: threshold,
        match_count: candidateCount,
        filter_subject: filters.subject || null,
      })
    : Promise.resolve([] as RetrievedQuestion[]);

  const [lexicalRows, vectorRows] = await Promise.all([lexicalPromise, vectorPromise]);
  // Keep explicit year/category/subject requests tight across both retrieval wires.
  const filteredVectorRows = vectorRows.filter((question) =>
    (!filters.subject || question.subject === filters.subject) &&
    (!filters.year || question.year === filters.year) &&
    (!filters.category || question.category === filters.category)
  );
  return mergeQuestionMatches(filteredVectorRows, lexicalRows, maxQuestions);
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
      `Question: ${cap(q.question, 800)}`,
    ];
    const opts = formatOptions(q.options);
    if (opts) parts.push(`Options: ${cap(opts, 700)}`);
    if (q.correct_answer) parts.push(`Correct answer: ${cap(q.correct_answer, 250)}`);
    if (q.explanation) parts.push(`Explanation: ${cap(q.explanation, 900)}`);
    return parts.join("\n");
  });

  const promptBlock = `\n\n=== RETRIEVED QUESTIONS FROM THE LIVE JUPEB QUESTION BANK ===\n${sections.join("\n\n")}\n\n=== HOW TO USE THESE REFERENCES ===\n- These are retrieved records from the app's live question bank, not invented examples.\n- Prefer the student's selected/current question when one is supplied. Use these related questions as additional past-question examples.\n- Cite the exact year, subject and category using [Q1], [Q2], etc. Do not invent a year or claim an unrelated result is an exact match.\n- Restate the relevant question before solving it. Explain the reasoning step by step.\n- For theory and practical questions, explain the marking points or procedure when those details are present.\n- For objective questions, explain why the correct option is right and why likely alternatives are wrong.\n- At most 12 question records are retrieved in one reply. If the student asks for the entire bank or more than 12 records, be transparent that this answer shows the strongest retrieved batch and invite them to request the next batch or narrow by subject/year/category. Never imply that a 12-question result is the entire bank.\n- If retrieval returns no relevant match, say so briefly and teach from reliable subject knowledge without fabricating a source.`;

  return { promptBlock, references };
}

export function serializeQuestionReferencesEvent(references: QuestionReference[]): string {
  return `data: ${JSON.stringify({ type: "question-references", references })}\n\n`;
}
