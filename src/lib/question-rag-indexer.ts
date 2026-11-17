import { supabase } from "@/integrations/supabase/client";

export interface QuestionEmbeddingQueueStatus {
  visibleQuestions: number;
  embeddingsStored: number;
  queuedJobs: number;
  missingEmbeddings: number;
}

export interface QuestionEmbeddingProcessResult {
  initiallyQueued: number;
  attempted: number;
  indexed: number;
  failed: number;
  queuedRemaining: number;
}

let activeRun: Promise<QuestionEmbeddingProcessResult> | null = null;

/** Read durable queue status. This endpoint is restricted to authenticated admins. */
export async function getQuestionEmbeddingQueueStatus(): Promise<QuestionEmbeddingQueueStatus> {
  const { data, error } = await supabase.functions.invoke("question-rag-index", {
    body: { action: "status" },
  });
  if (error) throw new Error(error.message || "Could not read the embedding queue.");
  if (data?.error) throw new Error(String(data.error));
  return {
    visibleQuestions: Number(data?.visible_questions ?? 0),
    embeddingsStored: Number(data?.embeddings_stored ?? 0),
    queuedJobs: Number(data?.queued_jobs ?? 0),
    missingEmbeddings: Number(data?.missing_embeddings ?? 0),
  };
}

/**
 * Process a bounded number of small batches through the existing Rutex worker.
 * Jobs are queued durably by the study_questions trigger before publication.
 * Defaults preserve the existing JUPEB admin behaviour (one batch of five).
 */
export function processPendingQuestionEmbeddings(options: {
  maxBatches?: number;
  batchSize?: number;
} = {}): Promise<QuestionEmbeddingProcessResult> {
  if (activeRun) return activeRun;

  const maxBatches = Math.min(20, Math.max(1, Math.trunc(options.maxBatches ?? 1)));
  const batchSize = Math.min(10, Math.max(1, Math.trunc(options.batchSize ?? 5)));

  activeRun = (async () => {
    const status = await getQuestionEmbeddingQueueStatus();
    const initiallyQueued = status.queuedJobs;
    let queuedRemaining = initiallyQueued;
    let attempted = 0;
    let indexed = 0;
    let failed = 0;

    for (let batch = 0; batch < maxBatches && queuedRemaining > 0; batch += 1) {
      const result = await supabase.functions.invoke("question-rag-index", {
        body: { action: "process", batchSize },
      });
      if (result.error) throw new Error(result.error.message || "The embedding worker could not process the queue.");
      if (result.data?.error) throw new Error(String(result.data.error));

      const claimed = Number(result.data?.claimed ?? 0);
      attempted += Number.isFinite(claimed) ? claimed : 0;
      indexed += Number(result.data?.indexed ?? 0);
      failed += Number(result.data?.failed ?? 0);
      queuedRemaining = Number(result.data?.queued_jobs ?? Math.max(0, queuedRemaining - claimed));

      // A provider failure backs jobs off for retry. Stop rather than repeatedly
      // claiming the same rows in a tight loop.
      if (claimed <= 0 || Number(result.data?.failed ?? 0) > 0) break;
    }

    return { initiallyQueued, attempted, indexed, failed, queuedRemaining };
  })().finally(() => {
    activeRun = null;
  });

  return activeRun;
}
