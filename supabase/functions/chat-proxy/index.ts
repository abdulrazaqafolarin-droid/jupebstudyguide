import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS, aiChatStream } from "../_shared/ai.ts";
import { retrieveRelevantChunks, buildRAGContext, serializeReferencesEvent } from "../_shared/textbook-retrieve.ts";

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
