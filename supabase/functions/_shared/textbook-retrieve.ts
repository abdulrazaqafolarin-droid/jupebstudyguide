const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `${EMBED_BASE}/models/gemini-embedding-001:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding?.values || null;
  } catch {
    return null;
  }
}

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
}

export async function retrieveRelevantChunks(
  supabaseUrl: string,
  supabaseKey: string,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const maxChunks = options.maxChunks ?? 5;
  const threshold = options.similarityThreshold ?? 0.5;

  const embedding = await generateEmbedding(query);
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
  return (data || []).map((r: any) => ({
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
