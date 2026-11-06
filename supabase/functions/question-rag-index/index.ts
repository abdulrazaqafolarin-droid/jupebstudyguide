import { createClient } from "npm:@supabase/supabase-js@2";
import { formatQuestionForEmbedding } from "../_shared/question-retrieve.ts";
import { generateEmbedding, resolveEmbedKeys } from "../_shared/textbook-embed.ts";

interface ClaimedJob {
  question_id: string;
  requested_at: string;
  attempts: number;
}

interface QuestionRow {
  id: string;
  subject: string;
  year: number;
  category: string;
  question: string | null;
  options: unknown;
  correct_answer: string | null;
  explanation: string | null;
  difficulty: string | null;
  course: string | null;
  image_url: string | null;
  updated_at: string;
  hidden: boolean;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function sha256(text: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then((digest) =>
    Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("")
  );
}

async function retryJob(
  admin: { from: (table: string) => any },
  job: ClaimedJob,
  errorMessage: string,
  attempt: number,
): Promise<void> {
  const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(Math.max(attempt - 1, 0), 6)));
  await admin
    .from("study_question_embedding_jobs")
    .update({
      locked_at: null,
      next_attempt_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      last_error: errorMessage.slice(0, 300),
    })
    .eq("question_id", job.question_id)
    .eq("requested_at", job.requested_at);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "authentication-required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "server-configuration-missing" }, 503);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "invalid-authentication" }, 401);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile?.is_admin) return json({ error: "admin-access-required" }, 403);

  try {
    const payload = await req.json().catch(() => ({})) as {
      action?: unknown;
      batchSize?: unknown;
    };
    const action = payload.action === "status" ? "status" : "process";

    const [questionsCount, embeddingsCount, jobsCount] = await Promise.all([
      admin.from("study_questions").select("id", { count: "exact", head: true }).eq("hidden", false),
      admin.from("study_question_embeddings").select("question_id", { count: "exact", head: true }),
      admin.from("study_question_embedding_jobs").select("question_id", { count: "exact", head: true }),
    ]);

    if (action === "status") {
      return json({
        ok: true,
        visible_questions: questionsCount.count ?? 0,
        embeddings_stored: embeddingsCount.count ?? 0,
        queued_jobs: jobsCount.count ?? 0,
        missing_embeddings: Math.max(0, (questionsCount.count ?? 0) - (embeddingsCount.count ?? 0)),
      });
    }

    const batchSize = Math.min(Math.max(Number(payload.batchSize) || 5, 1), 10);
    const embedKeys = await resolveEmbedKeys(
      supabaseUrl,
      serviceKey,
      Deno.env.get("KEY_ENCRYPTION_SECRET"),
    );
    if (embedKeys.length === 0) return json({ error: "no-gemini-embedding-key-configured" }, 503);

    const { data: claimedRows, error: claimError } = await admin.rpc(
      "claim_study_question_embedding_jobs",
      { p_limit: batchSize },
    );
    if (claimError) {
      console.error("[question-rag-index] claim failed:", claimError.message);
      return json({ error: "could-not-claim-index-jobs" }, 500);
    }

    const jobs = (claimedRows || []) as ClaimedJob[];
    if (jobs.length === 0) {
      return json({
        ok: true,
        claimed: 0,
        indexed: 0,
        failed: 0,
        queued_jobs: jobsCount.count ?? 0,
        message: "Question embeddings are up to date.",
      });
    }

    const ids = jobs.map((job) => job.question_id);
    const { data: questionRows, error: questionError } = await admin
      .from("study_questions")
      .select("id, subject, year, category, question, options, correct_answer, explanation, difficulty, course, image_url, updated_at, hidden")
      .in("id", ids)
      .eq("hidden", false);

    if (questionError || !questionRows) {
      for (const job of jobs) await retryJob(admin, job, questionError?.message || "question-read-failed", job.attempts);
      return json({ error: "could-not-load-question-records" }, 500);
    }

    const byId = new Map((questionRows as QuestionRow[]).map((question) => [question.id, question]));
    const indexedIds = new Set<string>();
    const failed: Array<{ question_id: string; error: string }> = [];
    const embeddingRows: Array<{
      question_id: string;
      embedding: string;
      source_updated_at: string;
      content_hash: string;
    }> = [];

    // A small bounded fan-out avoids bursting the single active Gemini key.
    await Promise.all(jobs.map(async (job) => {
      const question = byId.get(job.question_id);
      if (!question) {
        await admin.from("study_question_embedding_jobs")
          .delete()
          .eq("question_id", job.question_id)
          .eq("requested_at", job.requested_at);
        return;
      }

      const canonicalText = formatQuestionForEmbedding({
        id: question.id,
        subject: question.subject,
        year: question.year,
        category: question.category,
        question: question.question || "",
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        course: question.course,
        difficulty: question.difficulty,
        image_url: question.image_url,
      });
      const embedding = await generateEmbedding(canonicalText, embedKeys, "RETRIEVAL_DOCUMENT");
      if (!embedding) {
        const reason = "embedding-provider-failed";
        failed.push({ question_id: job.question_id, error: reason });
        await retryJob(admin, job, reason, job.attempts);
        return;
      }
      embeddingRows.push({
        question_id: question.id,
        embedding: `[${embedding.join(",")}]`,
        source_updated_at: question.updated_at,
        content_hash: await sha256(canonicalText),
      });
      indexedIds.add(job.question_id);
    }));

    if (embeddingRows.length > 0) {
      const { error: upsertError } = await admin
        .from("study_question_embeddings")
        .upsert(embeddingRows, { onConflict: "question_id" });
      if (upsertError) {
        console.error("[question-rag-index] embedding upsert failed:", upsertError.message);
        for (const job of jobs.filter((item) => indexedIds.has(item.question_id))) {
          await retryJob(admin, job, upsertError.message, 1);
          failed.push({ question_id: job.question_id, error: "embedding-save-failed" });
        }
        return json({
          error: "could-not-save-question-embeddings",
          claimed: jobs.length,
          indexed: 0,
          failed: failed.length,
        }, 500);
      }

      // Delete only the exact queue generation that was claimed. If an admin
      // edited a question while embedding was in flight, its newer queue row
      // remains and its stale vector is excluded by the SQL retrieval function.
      await Promise.all(embeddingRows.map(async (row) => {
        const job = jobs.find((item) => item.question_id === row.question_id);
        if (!job) return;
        const { error } = await admin.from("study_question_embedding_jobs")
          .delete()
          .eq("question_id", row.question_id)
          .eq("requested_at", job.requested_at);
        if (error) console.warn("[question-rag-index] queue cleanup failed:", error.message);
      }));
    }

    const { count: remaining } = await admin
      .from("study_question_embedding_jobs")
      .select("question_id", { count: "exact", head: true });

    return json({
      ok: true,
      claimed: jobs.length,
      indexed: embeddingRows.length,
      failed: failed.length,
      failed_questions: failed.slice(0, 10),
      queued_jobs: remaining ?? 0,
    });
  } catch (error) {
    console.error("[question-rag-index] unexpected error:", error);
    return json({ error: "internal-error" }, 500);
  }
});
