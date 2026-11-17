import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/ai.ts";
import { hasActiveStudyAccess } from "../_shared/exam-access.ts";

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply({ error: "Authentication required" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply({ error: "Server configuration is incomplete" }, 500);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !user) return reply({ error: "Invalid authentication" }, 401);
  const access = await hasActiveStudyAccess(url, key, authorization.slice(7), user.id);
  if (!access.allowed) return reply({ error: access.reason ?? "Study access denied." }, 403);

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.exam_program_id !== "jamb" || body.action !== "check-answer") {
      return reply({ error: "Unsupported practice action." }, 400);
    }
    const questionId = typeof body.question_id === "string" ? body.question_id : "";
    const selected = typeof body.selected_option === "string" ? body.selected_option.toUpperCase() : "";
    if (!questionId || !/^[A-E]$/.test(selected)) return reply({ error: "A question and option A-D are required." }, 400);

    const { data: question, error: questionError } = await supabase
      .from("study_questions")
      .select("id,options")
      .eq("id", questionId)
      .eq("exam_program_id", "jamb")
      .eq("review_status", "published")
      .eq("hidden", false)
      .maybeSingle();
    if (questionError || !question) return reply({ error: "Published JAMB question not found." }, 404);

    const { data: options } = Array.isArray(question.options)
      ? { data: question.options as Array<Record<string, unknown>> }
      : { data: [] as Array<Record<string, unknown>> };
    if (!options.some((option) => String(option.label ?? "").toUpperCase() === selected)) {
      return reply({ error: "Selected option is not available for this question." }, 400);
    }

    const { data: answerKey, error: answerError } = await supabase
      .from("study_question_answer_keys")
      .select("correct_answer,explanation")
      .eq("question_id", questionId)
      .eq("review_status", "approved")
      .maybeSingle();
    if (answerError) return reply({ error: answerError.message }, 500);
    if (!answerKey) {
      return reply({ gradable: false, message: "This question is ungraded because a reviewed answer key has not been published." });
    }
    return reply({
      gradable: true,
      is_correct: String(answerKey.correct_answer).toUpperCase() === selected,
      correct_option: String(answerKey.correct_answer).toUpperCase(),
      explanation: answerKey.explanation ?? null,
    });
  } catch (error) {
    console.error("[exam-practice]", String(error).slice(0, 300));
    return reply({ error: error instanceof Error ? error.message : "Unexpected answer-checking error." }, 500);
  }
});
