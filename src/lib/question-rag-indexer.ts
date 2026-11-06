import { supabase } from "@/integrations/supabase/client";

let activeRun: Promise<void> | null = null;

/**
 * Best-effort admin queue kick. The database trigger records the durable
 * indexing job first, so a temporary Gemini outage never loses an update or
 * makes the student wait for the question to save.
 */
export function processPendingQuestionEmbeddings(): Promise<void> {
  if (activeRun) return activeRun;

  activeRun = (async () => {
    const status = await supabase.functions.invoke("question-rag-index", {
      body: { action: "status" },
    });
    if (status.error) {
      console.warn("[Question RAG] Could not read index queue:", status.error.message);
      return;
    }

    const queued = Number(status.data?.queued_jobs ?? 0);
    if (!Number.isFinite(queued) || queued <= 0) return;

    const result = await supabase.functions.invoke("question-rag-index", {
      body: { action: "process", batchSize: Math.min(queued, 5) },
    });
    if (result.error) {
      console.warn("[Question RAG] Index worker will retry queued records later:", result.error.message);
      return;
    }
    if (result.data?.failed > 0) {
      console.warn("[Question RAG] Some embedding jobs remain queued for retry:", result.data.failed);
    }
  })().finally(() => {
    activeRun = null;
  });

  return activeRun;
}
