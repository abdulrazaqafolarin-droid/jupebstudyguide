import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from "@/integrations/supabase/client";
import { getQuestionEmbeddingQueueStatus, processPendingQuestionEmbeddings } from "./question-rag-indexer";

const invoke = vi.mocked(supabase.functions.invoke);

describe("shared question embedding queue worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("drains several bounded batches until the queue is empty", async () => {
    invoke
      .mockResolvedValueOnce({ data: { visible_questions: 11, embeddings_stored: 0, queued_jobs: 11, missing_embeddings: 11 }, error: null } as never)
      .mockResolvedValueOnce({ data: { claimed: 5, indexed: 5, failed: 0, queued_jobs: 6 }, error: null } as never)
      .mockResolvedValueOnce({ data: { claimed: 5, indexed: 5, failed: 0, queued_jobs: 1 }, error: null } as never)
      .mockResolvedValueOnce({ data: { claimed: 1, indexed: 1, failed: 0, queued_jobs: 0 }, error: null } as never);

    const result = await processPendingQuestionEmbeddings({ maxBatches: 5, batchSize: 5 });

    expect(result).toEqual({
      initiallyQueued: 11,
      attempted: 11,
      indexed: 11,
      failed: 0,
      queuedRemaining: 0,
    });
    expect(invoke).toHaveBeenCalledTimes(4);
    expect(invoke).toHaveBeenNthCalledWith(1, "question-rag-index", { body: { action: "status" } });
    expect(invoke).toHaveBeenNthCalledWith(2, "question-rag-index", { body: { action: "process", batchSize: 5 } });
  });

  it("stops after a provider failure and leaves remaining jobs queued for retry", async () => {
    invoke
      .mockResolvedValueOnce({ data: { visible_questions: 10, embeddings_stored: 0, queued_jobs: 10, missing_embeddings: 10 }, error: null } as never)
      .mockResolvedValueOnce({ data: { claimed: 5, indexed: 2, failed: 3, queued_jobs: 8 }, error: null } as never);

    const result = await processPendingQuestionEmbeddings({ maxBatches: 10, batchSize: 5 });

    expect(result.failed).toBe(3);
    expect(result.indexed).toBe(2);
    expect(result.queuedRemaining).toBe(8);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("reports queue status without invoking the process action", async () => {
    invoke.mockResolvedValueOnce({
      data: { visible_questions: 25, embeddings_stored: 20, queued_jobs: 5, missing_embeddings: 5 },
      error: null,
    } as never);

    await expect(getQuestionEmbeddingQueueStatus()).resolves.toEqual({
      visibleQuestions: 25,
      embeddingsStored: 20,
      queuedJobs: 5,
      missingEmbeddings: 5,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("does not start a processing request when the queue is empty", async () => {
    invoke.mockResolvedValueOnce({
      data: { visible_questions: 25, embeddings_stored: 25, queued_jobs: 0, missing_embeddings: 0 },
      error: null,
    } as never);

    const result = await processPendingQuestionEmbeddings();

    expect(result.initiallyQueued).toBe(0);
    expect(result.attempted).toBe(0);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
