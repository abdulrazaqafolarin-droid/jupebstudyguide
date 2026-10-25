import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS, aiChatStream, aiChatText, guardAiAccess } from "../_shared/ai.ts";
import { retrieveRelevantChunks, buildRAGContext, serializeReferencesEvent, type RetrievedChunk } from "../_shared/textbook-retrieve.ts";
import { retrieveRelevantQuestions, buildQuestionRAGContext, serializeQuestionReferencesEvent, type RetrievedQuestion } from "../_shared/question-retrieve.ts";
import { generateEmbedding, generateEmbeddings, resolveEmbedKeys, lastEmbedError } from "../_shared/textbook-embed.ts";

interface InboundMessage {
  role: string;
  content?: string;
  attachment?: { base64?: string; mimeType?: string; name?: string } | null;
}

interface RagOutcome {
  chunks: RetrievedChunk[];
  questions: RetrievedQuestion[];
}

const RAG_DEADLINE_MS = 12_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const blocked = await guardAiAccess(supabase, user);
  if (blocked) return blocked;

  try {
    const encoder = new TextEncoder();
    const { action, systemPrompt, messages, text, texts, subject } = await req.json();

    // Single embedding (client use). Vault keys first, env fallback.
    if (action === "embed") {
      const embedKeys = await resolveEmbedKeys(supabaseUrl, supabaseKey, Deno.env.get("KEY_ENCRYPTION_SECRET"));
      if (embedKeys.length === 0) {
        return new Response(
          JSON.stringify({ embedding: [], error: "No Gemini embedding key configured" }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const embedding = await generateEmbedding(text || "", embedKeys, "RETRIEVAL_QUERY");
      if (!embedding) {
        return new Response(
          JSON.stringify({ embedding: [], error: "Gemini embedding failed" }),
          { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ embedding }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Admin-only batch embeddings for backfilling the question-bank index.
    // Body: { action: "embed-batch", texts: string[] } (max 25 per call).
    if (action === "embed-batch") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();
      if (!profile?.is_admin) {
        return new Response(
          JSON.stringify({ error: "Admin only" }),
          { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      if (!Array.isArray(texts) || texts.length === 0 || texts.length > 25) {
        return new Response(
          JSON.stringify({ error: "texts must be an array of 1-25 strings" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const embedKeys = await resolveEmbedKeys(supabaseUrl, supabaseKey, Deno.env.get("KEY_ENCRYPTION_SECRET"));
      if (embedKeys.length === 0) {
        return new Response(
          JSON.stringify({ error: "No Gemini embedding key configured" }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const embeddings = await generateEmbeddings(texts, embedKeys, "RETRIEVAL_DOCUMENT");
      return new Response(
        JSON.stringify({ embeddings, embedError: lastEmbedError }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    let systemMsg = systemPrompt || "You are a helpful assistant for JUPEB exam preparation.";
    let referencesEvent = "";
    let questionRefsEvent = "";

    const lastUserMsg = [...messages].reverse().find((m: InboundMessage) => m.role === "user");
    if (lastUserMsg?.content) {
      const embedKeys = await resolveEmbedKeys(supabaseUrl, supabaseKey, Deno.env.get("KEY_ENCRYPTION_SECRET"));
      // Hard deadline: retrieval must never stall the chat. If embedding or
      // vector search misbehaves we drop RAG and still stream an answer.
      const ragPromise: Promise<RagOutcome> = Promise.all([
        retrieveRelevantChunks(supabaseUrl, supabaseKey, lastUserMsg.content, {
          subject: subject || undefined,
          maxChunks: 3,
          embedKeys,
        }),
        retrieveRelevantQuestions(supabaseUrl, supabaseKey, lastUserMsg.content, {
          subject: subject || undefined,
          maxQuestions: 5,
          embedKey: embedKeys,
        }),
      ])
        .then(([chunks, questions]) => ({ chunks, questions }))
        .catch((err: unknown) => {
          console.error("[RAG] retrieval failed:", String(err).slice(0, 200));
          return { chunks: [] as RetrievedChunk[], questions: [] as RetrievedQuestion[] };
        });
      const outcome = await Promise.race([
        ragPromise,
        new Promise<RagOutcome>((resolve) => {
          const timer = setTimeout(() => {
            console.error(`[RAG] retrieval exceeded ${RAG_DEADLINE_MS}ms — continuing without RAG`);
            resolve({ chunks: [], questions: [] });
          }, RAG_DEADLINE_MS);
          void ragPromise.then(() => clearTimeout(timer));
        }),
      ]);
      const rag = buildRAGContext(outcome.chunks);
      if (rag.promptBlock) {
        systemMsg += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
      const qrag = buildQuestionRAGContext(outcome.questions);
      if (qrag.promptBlock) {
        systemMsg += qrag.promptBlock;
        questionRefsEvent = serializeQuestionReferencesEvent(qrag.references);
      }
    }

    const chatMessages = (messages || []).filter((m: InboundMessage) => m.role !== "system").map((m: InboundMessage) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content ?? "",
      ...(m.attachment?.base64 ? { attachment: { base64: m.attachment.base64, mimeType: m.attachment.mimeType ?? "application/octet-stream", name: m.attachment.name ?? "attachment" } } : {}),
    }));

    // Prepend the RAG reference events to whichever payload stream we end up
    // sending (streamed answer, non-stream fallback, or structured error).
    const withReferenceEvents = (base: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> =>
      new ReadableStream({
        async start(controller) {
          if (referencesEvent) {
            controller.enqueue(encoder.encode(referencesEvent));
          }
          if (questionRefsEvent) {
            controller.enqueue(encoder.encode(questionRefsEvent));
          }
          const reader = base.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });

    // Try streaming first (strict → throws on total election failure so we can
    // fall back). During Gemini capacity crunches the streaming endpoint can
    // 503 or hang while plain generateContent still answers — this keeps the
    // AI usable by delivering the whole answer as a single choices delta.
    let aiStream: ReadableStream<Uint8Array> | null = null;
    let fallbackText: string | null = null;
    let streamFailure = "";
    try {
      aiStream = await aiChatStream(
        Deno.env,
        systemMsg,
        chatMessages,
        { temperature: 0.7, maxTokens: 2048 },
        true
      );
    } catch (err) {
      streamFailure = err instanceof Error ? err.message : String(err);
      console.warn("[chat-proxy] streaming election failed, trying non-streaming fallback:", streamFailure.slice(0, 300));
      try {
        fallbackText = await aiChatText(Deno.env, systemMsg, chatMessages, { temperature: 0.7, maxTokens: 1024, bypassBackoff: true });
        console.warn("[chat-proxy] non-streaming fallback succeeded");
      } catch (err2) {
        const textFailure = err2 instanceof Error ? err2.message : String(err2);
        const summary = `All AI providers unavailable (streaming: ${streamFailure}; non-streaming: ${textFailure})`;
        console.error(`[chat-proxy] ${summary.slice(0, 600)}`);
        const errStream = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(encoder.encode(`data: ${JSON.stringify({ error: summary })}\n\n`));
            c.enqueue(encoder.encode("data: [DONE]\n\n"));
            c.close();
          },
        });
        return new Response(withReferenceEvents(errStream), {
          headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
        });
      }
    }

    const base: ReadableStream<Uint8Array> = aiStream ?? new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText ?? "" } }] })}\n\n`));
        c.enqueue(encoder.encode("data: [DONE]\n\n"));
        c.close();
      },
    });

    return new Response(withReferenceEvents(base), {
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
