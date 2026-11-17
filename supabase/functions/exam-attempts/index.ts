import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../../../src/integrations/supabase/types.ts";
import { scoreAttempt } from "../_shared/exam-scoring.ts";
import { CORS_HEADERS } from "../_shared/ai.ts";
import { hasActiveStudyAccess } from "../_shared/exam-access.ts";

type JsonRecord = Record<string, unknown>;
type Option = { label: string; text: string };

function reply(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function optionsOf(value: unknown): Option[] {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((option): Option[] => {
    if (!option || typeof option !== "object") return [];
    const item = option as Record<string, unknown>;
    const label = String(item.label ?? "").toUpperCase();
    const text = String(item.text ?? "");
    return /^[A-E]$/.test(label) && text.trim() ? [{ label, text }] : [];
  });
}
function shuffle<T>(values: T[]): T[] {
  const output = [...values];
  const random = new Uint32Array(1);
  for (let i = output.length - 1; i > 0; i--) {
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}
function safeSnapshot(row: Record<string, unknown>) {
  const imageUrls = Array.isArray(row.image_urls)
    ? row.image_urls.filter((url): url is string => typeof url === "string")
    : [];
  if (imageUrls.length === 0 && typeof row.image_url === "string") imageUrls.push(row.image_url);
  return {
    question: String(row.question ?? ""),
    options: optionsOf(row.options),
    imageUrls,
    year: Number(row.year),
    topic: typeof row.course === "string" ? row.course : null,
  };
}

type AdminSupabase = SupabaseClient<Database>;
type AttemptRecord = Pick<Database["public"]["Tables"]["exam_attempts"]["Row"], "id" | "user_id" | "exam_program_id" | "exam_year" | "config_version" | "subject_code" | "attempt_kind" | "status" | "duration_minutes" | "started_at" | "expires_at" | "submitted_at" | "score_summary">;
type AuthenticatedContext = { supabase: AdminSupabase; user: { id: string } };
type AuthenticationResult = AuthenticatedContext | { error: Response };

async function authenticate(request: Request): Promise<AuthenticationResult> {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return { error: reply({ error: "Authentication required" }, 401) };
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { error: reply({ error: "Server configuration is incomplete" }, 500) };
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: reply({ error: "Invalid authentication" }, 401) };
  const access = await hasActiveStudyAccess(url, key, authorization.slice(7), user.id);
  if (!access.allowed) return { error: reply({ error: access.reason ?? "Study access denied." }, 403) };
  return { supabase, user };
}

async function readOwnedAttempt(supabase: AdminSupabase, attemptId: string, userId: string): Promise<AttemptRecord> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("id,user_id,exam_program_id,exam_year,config_version,subject_code,attempt_kind,status,duration_minutes,started_at,expires_at,submitted_at,score_summary")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("exam_program_id", "jamb")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Attempt not found.");
  return data;
}

async function markExpiredIfNeeded(
  supabase: AdminSupabase,
  attempt: AttemptRecord,
): Promise<{ status: string; result: Record<string, unknown> | null }> {
  if (attempt.status === "in_progress" && new Date(String(attempt.expires_at)).getTime() <= Date.now()) {
    const result = await scoreAndFinish(supabase, attempt, "expired");
    return { status: "expired", result };
  }
  return {
    status: String(attempt.status),
    result: attempt.score_summary && typeof attempt.score_summary === "object"
      ? attempt.score_summary as Record<string, unknown>
      : null,
  };
}

async function scoreAndFinish(
  supabase: AdminSupabase,
  attempt: AttemptRecord,
  finalStatus: "submitted" | "expired",
) {
  const attemptId = String(attempt.id);
  const { data: questions, error: questionError } = await supabase
    .from("exam_attempt_questions")
    .select("sequence,question_id")
    .eq("attempt_id", attemptId)
    .order("sequence", { ascending: true });
  if (questionError) throw new Error(questionError.message);

  const questionIds = (questions ?? []).map((item) => item.question_id);
  const [{ data: answers, error: answerError }, { data: answerKeys, error: keyError }] = await Promise.all([
    supabase.from("exam_attempt_answers")
      .select("question_sequence,selected_option")
      .eq("attempt_id", attemptId),
    questionIds.length
      ? supabase.from("study_question_answer_keys")
          .select("question_id,correct_answer")
          .in("question_id", questionIds)
          .eq("review_status", "approved")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (answerError) throw new Error(answerError.message);
  if (keyError) throw new Error(keyError.message);

  const result = scoreAttempt(questions ?? [], answers ?? [], answerKeys ?? []);
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("exam_attempts")
    .update({
      status: finalStatus,
      submitted_at: now,
      score_summary: result,
      updated_at: now,
    })
    .eq("id", attemptId)
    .eq("user_id", String(attempt.user_id))
    .eq("status", "in_progress");
  if (updateError) throw new Error(updateError.message);
  return result;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const auth = await authenticate(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  try {
    const body = await request.json() as JsonRecord;
    if (body.exam_program_id !== undefined && body.exam_program_id !== "jamb") {
      return reply({ error: "This CBT endpoint accepts JAMB attempts only." }, 400);
    }
    const action = String(body.action ?? "");

    if (action === "create") {
      const subject = String(body.subject ?? "");
      const questionCount = Number(body.question_count);
      if (!["physics", "chemistry", "biology"].includes(subject)) return reply({ error: "Choose Physics, Chemistry or Biology." }, 400);
      const { data: config, error: configError } = await supabase
        .from("exam_configurations")
        .select("exam_year,config_version,settings,full_mock_enabled")
        .eq("exam_program_id", "jamb")
        .eq("status", "published")
        .order("exam_year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (configError || !config) return reply({ error: "No published JAMB practice configuration is available." }, 503);
      const settings = (config.settings ?? {}) as Record<string, unknown>;
      const allowedSubjects = Array.isArray(settings.allowed_subjects) ? settings.allowed_subjects.map(String) : [];
      const allowedCounts = Array.isArray(settings.allowed_question_counts) ? settings.allowed_question_counts.map(Number) : [];
      const durationMap = settings.duration_by_question_count && typeof settings.duration_by_question_count === "object"
        ? settings.duration_by_question_count as Record<string, unknown>
        : {};
      const durationMinutes = Number(durationMap[String(questionCount)]);
      if (body.attempt_kind === "full_mock" || body.attempt_kind === "multi_subject_practice" || config.full_mock_enabled === true) {
        return reply({ error: "Full and multi-subject JAMB mocks are not enabled in this practice release." }, 409);
      }
      if (!allowedSubjects.includes(subject) || !allowedCounts.includes(questionCount) ||
          !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
        return reply({ error: "This subject and practice length are not enabled in the published JAMB practice configuration." }, 400);
      }

      const idempotencyKey = String(body.idempotency_key ?? crypto.randomUUID()).trim().slice(0, 128);
      if (!idempotencyKey) return reply({ error: "A valid idempotency key is required." }, 400);
      const { data: existingAttempt, error: existingError } = await supabase
        .from("exam_attempts")
        .select("id,exam_year,config_version")
        .eq("user_id", user.id)
        .eq("exam_program_id", "jamb")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existingError) return reply({ error: existingError.message }, 500);
      if (existingAttempt) {
        const { count, error: countError } = await supabase.from("exam_attempt_questions")
          .select("sequence", { count: "exact", head: true })
          .eq("attempt_id", existingAttempt.id);
        if (countError) return reply({ error: countError.message }, 500);
        return reply({ attempt_id: existingAttempt.id, exam_year: existingAttempt.exam_year, config_version: existingAttempt.config_version, question_count: count ?? 0, idempotent_replay: true });
      }

      const { data: candidates, error: candidateError } = await supabase
        .from("study_questions")
        .select("id,subject,year,question,options,course,image_url,image_urls")
        .eq("exam_program_id", "jamb")
        .eq("review_status", "published")
        .eq("hidden", false)
        .eq("subject", subject)
        .eq("category", "objective")
        .limit(500);
      if (candidateError) return reply({ error: candidateError.message }, 500);
      const validCandidates = (candidates ?? []).filter((candidate) => {
        const options = optionsOf(candidate.options);
        return String(candidate.question ?? "").trim().length >= 8 &&
          options.length === 4 && options.map((option) => option.label).join(",") === "A,B,C,D";
      });
      if (validCandidates.length < questionCount) {
        return reply({
          error: "Not enough reviewed JAMB " + subject + " questions are available yet.",
          available: validCandidates.length,
          required: questionCount,
        }, 409);
      }
      const selected = shuffle(validCandidates).slice(0, questionCount);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);
      const { data: attempt, error: insertError } = await supabase
        .from("exam_attempts")
        .insert({
          user_id: user.id,
          exam_program_id: "jamb",
          exam_year: config.exam_year,
          config_version: config.config_version,
          subject_code: subject,
          attempt_kind: "subject_practice",
          status: "in_progress",
          duration_minutes: durationMinutes,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();
      if (insertError || !attempt) {
        if (insertError?.code === "23505") {
          const { data: racedAttempt } = await supabase.from("exam_attempts")
            .select("id,exam_year,config_version")
            .eq("user_id", user.id)
            .eq("exam_program_id", "jamb")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (racedAttempt) return reply({ attempt_id: racedAttempt.id, exam_year: racedAttempt.exam_year, config_version: racedAttempt.config_version, idempotent_replay: true });
        }
        return reply({ error: insertError?.message ?? "Could not create attempt." }, 500);
      }

      const snapshotRows = selected.map((question, index) => ({
        attempt_id: attempt.id,
        sequence: index + 1,
        question_id: question.id,
        subject_code: subject,
        question_snapshot: safeSnapshot(question),
      }));
      const { error: snapshotError } = await supabase.from("exam_attempt_questions").insert(snapshotRows);
      if (snapshotError) {
        await supabase.from("exam_attempts").delete().eq("id", attempt.id).eq("user_id", user.id);
        return reply({ error: "Could not prepare the CBT question snapshots: " + snapshotError.message }, 500);
      }
      return reply({ attempt_id: attempt.id, exam_year: config.exam_year, config_version: config.config_version, question_count: questionCount, idempotent_replay: false });
    }

    const attemptId = String(body.attempt_id ?? "");
    if (!attemptId) return reply({ error: "attempt_id is required." }, 400);
    const attempt = await readOwnedAttempt(supabase, attemptId, user.id);
    const expiry = await markExpiredIfNeeded(supabase, attempt);
    const effectiveStatus = expiry.status;

    if (action === "get") {
      const [{ data: questions, error: questionError }, { data: answers, error: answerError }] = await Promise.all([
        supabase.from("exam_attempt_questions")
          .select("sequence,question_id,subject_code,question_snapshot")
          .eq("attempt_id", attemptId)
          .order("sequence", { ascending: true }),
        supabase.from("exam_attempt_answers")
          .select("question_sequence,selected_option,marked_for_review")
          .eq("attempt_id", attemptId),
      ]);
      if (questionError) throw new Error(questionError.message);
      if (answerError) throw new Error(answerError.message);
      return reply({
        attempt: { ...attempt, status: effectiveStatus },
        questions: questions ?? [],
        answers: answers ?? [],
        result: expiry.result,
      });
    }

    if (action === "save-answer") {
      if (effectiveStatus !== "in_progress") return reply({ error: "This attempt is no longer accepting answers." }, 409);
      const sequence = Number(body.sequence);
      const selectedOption = body.selected_option === null ? null : String(body.selected_option ?? "").toUpperCase();
      const markedForReview = body.marked_for_review === true;
      if (!Number.isInteger(sequence) || sequence < 1) return reply({ error: "A valid question sequence is required." }, 400);
      const { data: snapshot, error: snapshotError } = await supabase
        .from("exam_attempt_questions")
        .select("question_snapshot")
        .eq("attempt_id", attemptId)
        .eq("sequence", sequence)
        .maybeSingle();
      if (snapshotError || !snapshot) return reply({ error: "Question sequence not found in this attempt." }, 404);
      if (selectedOption !== null) {
        const options = optionsOf((snapshot.question_snapshot as Record<string, unknown>)?.options);
        if (!options.some((option) => option.label === selectedOption)) return reply({ error: "Selected option is not part of this question." }, 400);
      }
      const { error: saveError } = await supabase.from("exam_attempt_answers").upsert({
        attempt_id: attemptId,
        question_sequence: sequence,
        selected_option: selectedOption,
        marked_for_review: markedForReview,
        answered_at: selectedOption ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "attempt_id,question_sequence" });
      if (saveError) return reply({ error: saveError.message }, 500);
      return reply({ saved: true, sequence });
    }

    if (action === "submit") {
      if (effectiveStatus === "submitted" || effectiveStatus === "expired") {
        return reply({ attempt_id: attemptId, status: effectiveStatus, result: expiry.result, idempotent_replay: true });
      }
      if (effectiveStatus !== "in_progress") return reply({ error: "This attempt cannot be submitted from its current state." }, 409);
      const finalStatus = new Date(String(attempt.expires_at)).getTime() <= Date.now() ? "expired" : "submitted";
      const result = await scoreAndFinish(supabase, attempt, finalStatus);
      return reply({ attempt_id: attemptId, status: finalStatus, result, idempotent_replay: false });
    }

    return reply({ error: "Unsupported exam-attempt action." }, 400);
  } catch (error) {
    console.error("[exam-attempts]", String(error).slice(0, 400));
    return reply({ error: error instanceof Error ? error.message : "Unexpected CBT error." }, 500);
  }
});
