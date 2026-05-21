import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/ai.ts";
import { chunkText } from "../_shared/textbook-chunk.ts";
import { generateEmbeddings } from "../_shared/textbook-embed.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { title, content, subject, level } = await req.json();
    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: "title and content are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const chunks = chunkText(content);
    console.log(`[Ingest] "${title}": ${chunks.length} chunks created`);

    const embeddings = await generateEmbeddings(chunks.map(c => c.content));

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: textbook, error: tbError } = await supabase
      .from("textbooks")
      .insert({ title, subject: subject || null, level: level || null, created_by: user.id })
      .select()
      .single();

    if (tbError || !textbook) {
      return new Response(
        JSON.stringify({ error: `Failed to create textbook: ${tbError?.message || "unknown"}` }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const chunkRows = chunks.map((chunk, i) => ({
      textbook_id: textbook.id,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding: embeddings[i] || null,
      metadata: chunk.metadata,
    }));

    const { error: insertError } = await supabase
      .from("textbook_chunks")
      .insert(chunkRows);

    if (insertError) {
      await supabase.from("textbooks").delete().eq("id", textbook.id);
      return new Response(
        JSON.stringify({ error: `Failed to store chunks: ${insertError.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        textbook_id: textbook.id,
        title: textbook.title,
        chunks_count: chunks.length,
        embedded_count: embeddings.filter(Boolean).length,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("textbook-ingest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
