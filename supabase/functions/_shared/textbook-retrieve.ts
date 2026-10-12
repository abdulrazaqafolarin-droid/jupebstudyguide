import { generateEmbedding } from "./textbook-embed.ts";

export interface RetrievedChunk {
  id: string;
  textbook_id: string;
  textbook_title: string;
  content: string;
  similarity: number;
}

export interface CitationReference {
  number: number;
  textbook_title: string;
  textbook_id: string;
  chunk_id: string;
  content: string;
  similarity: number;
}

export interface RAGContext {
  promptBlock: string;
  references: CitationReference[];
}

export interface RetrieveOptions {
  subject?: string;
  maxChunks?: number;
  similarityThreshold?: number;
  /** Resolved Gemini key(s) — vault first. Falls back to env when omitted. */
  embedKeys?: string | string[];
}

export async function retrieveRelevantChunks(
  supabaseUrl: string,
  supabaseKey: string,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const maxChunks = options.maxChunks ?? 5;
  const threshold = options.similarityThreshold ?? 0.5;

  const embedding = await generateEmbedding(query, options.embedKeys, "RETRIEVAL_QUERY");
  if (!embedding) return [];

  const vectorStr = `[${embedding.join(",")}]`;

  let url = `${supabaseUrl}/rest/v1/rpc/match_textbook_chunks`;
  if (options.subject) {
    url += `?subject=eq.${encodeURIComponent(options.subject)}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query_embedding: vectorStr,
      match_threshold: threshold,
      match_count: maxChunks,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    console.error(`[Retrieve] pgvector search failed (${res.status}): ${errText.slice(0, 200)}`);
    return [];
  }

  const data = await res.json();
  return (data || []).map((r: { id: string; textbook_id: string; textbook_title: string; content: string; similarity: number }) => ({
    id: r.id,
    textbook_id: r.textbook_id,
    textbook_title: r.textbook_title,
    content: r.content,
    similarity: r.similarity,
  }));
}

export function buildRAGContext(chunks: RetrievedChunk[]): RAGContext {
  if (chunks.length === 0) return { promptBlock: "", references: [] };

  const references: CitationReference[] = chunks.map((c, i) => ({
    number: i + 1,
    textbook_title: c.textbook_title,
    textbook_id: c.textbook_id,
    chunk_id: c.id,
    content: c.content,
    similarity: c.similarity,
  }));

  const sections = chunks.map(
    (c, i) => `[${i + 1}] (from "${c.textbook_title}")\n${c.content}`
  );

  const promptBlock = `\n\n=== RELEVANT TEXTBOOK CONTEXT ===\n${sections.join("\n\n")}\n\n=== INSTRUCTION ===\nUse the above references to answer the student's question. Cite sources using [1], [2], etc. inline. If no reference is relevant, answer from your own knowledge without citations.`;

  return { promptBlock, references };
}

export function serializeReferencesEvent(references: CitationReference[]): string {
  return `data: ${JSON.stringify({ type: "references", references })}\n\n`;
}
