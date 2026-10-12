const {  createClient  } = await import("npm:@supabase/supabase-js@2");
import { routerText, routerJSON, routerStream } from "./ai-router.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function aiChatText(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

async function aiChatJSON(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<any> {
  return routerJSON(systemPrompt, messages, opts);
}

async function aiChatStream(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<ReadableStream> {
  return routerStream(systemPrompt, messages, opts);
}


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
}

async function retrieveRelevantChunks(
  supabase: any,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const maxChunks = options.maxChunks ?? 5;
  const threshold = options.similarityThreshold ?? 0.5;

  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const vectorStr = `[${embedding.join(",")}]`;

  let dbQuery = supabase.rpc("match_textbook_chunks", {
    query_embedding: vectorStr,
    match_threshold: threshold,
    match_count: maxChunks,
  });

  if (options.subject) {
    dbQuery = dbQuery.eq("subject", options.subject);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("[Retrieve] pgvector search failed:", error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    textbook_id: r.textbook_id,
    textbook_title: r.textbook_title,
    content: r.content,
    similarity: r.similarity,
  }));
}

function buildRAGContext(chunks: RetrievedChunk[]): RAGContext {
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

function serializeReferencesEvent(references: CitationReference[]): string {
  return `data: ${JSON.stringify({ type: "references", references })}\n\n`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const encoder = new TextEncoder();
    const { action, systemPrompt, messages, text, subject } = await req.json();

    if (action === "embed") {
      const ollamaRes = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: text || "" }),
      });
      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text();
        return new Response(
          JSON.stringify({
            embedding: [],
            error: `Ollama embedding failed (${ollamaRes.status}): ${errText}`,
            note: "Ensure Ollama is running locally with: ollama pull nomic-embed-text",
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const ollamaData = await ollamaRes.json();
      return new Response(
        JSON.stringify({ embedding: ollamaData.embedding || [] }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    let systemMsg = systemPrompt || "You are a helpful assistant for JUPEB exam preparation.";
    let referencesEvent = "";

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const chunks = await retrieveRelevantChunks(supabase, lastUserMsg.content, {
        subject: subject || undefined,
        maxChunks: 3,
      });
      const rag = buildRAGContext(chunks);
      if (rag.promptBlock) {
        systemMsg += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
    }

    const chatMessages = (messages || []).filter((m: any) => m.role !== "system").map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const aiStream = await aiChatStream(
      Deno.env,
      systemMsg,
      chatMessages,
      { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 2048 }
    );

    const combinedStream = new ReadableStream({
      async start(controller) {
        if (referencesEvent) {
          controller.enqueue(encoder.encode(referencesEvent));
        }
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
