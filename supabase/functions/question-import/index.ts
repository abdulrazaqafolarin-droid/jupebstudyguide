import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/ai.ts";
import { hasActiveStudyAccess } from "../_shared/exam-access.ts";

const SUBJECTS = new Set(["physics", "chemistry", "biology"]);
const MAX_ITEMS_PER_REQUEST = 50;

type JsonObject = Record<string, unknown>;

function respond(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeItem(item: JsonObject, batch: {
  subject_code: string;
  source_document: string;
}): { raw: JsonObject; normalized: JsonObject; errors: string[] } {
  const subject = asText(item.subject) || batch.subject_code;
  const options = Array.isArray(item.options)
    ? item.options.map((option) => {
        const record = (option && typeof option === "object" ? option : {}) as JsonObject;
        return { label: asText(record.label).toUpperCase(), text: asText(record.text) };
      })
    : [];
  const question = asText(item.question);
  const year = Number.isInteger(item.year) ? Number(item.year) : null;
  const inheritedErrors = Array.isArray(item.validation_errors)
    ? item.validation_errors.filter((value): value is string => typeof value === "string")
    : [];
  const errors = [...new Set(inheritedErrors)];

  if (!SUBJECTS.has(subject)) errors.push("unsupported_jamb_subject");
  if (!year) errors.push("missing_or_ambiguous_source_year");
  if (question.length < 8) errors.push("question_text_missing_or_too_short");
  if (options.length !== 4 && options.length !== 5) errors.push("four_or_five_options_required_for_historical_source_review");
  const labels = options.map((option) => option.label);
  if (labels.join(",") !== "A,B,C,D" && labels.join(",") !== "A,B,C,D,E") errors.push("options_must_be_labeled_a_b_c_d_or_a_b_c_d_e_in_order");
  if (options.some((option) => !option.text)) errors.push("option_text_missing");
  const figureDescriptions = Array.isArray(item.figure_descriptions)
    ? item.figure_descriptions.filter((value): value is string => typeof value === "string")
    : [];
  const imageUrls = Array.isArray(item.image_urls)
    ? item.image_urls.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  if (figureDescriptions.length > 0 && imageUrls.length === 0) {
    errors.push("figure_original_image_not_attached_and_reviewed");
  }

  const normalized: JsonObject = {
    subject,
    year,
    category: "objective",
    question,
    options,
    correct_answer: null,
    explanation: null,
    answer_key_verified: false,
    difficulty: asText(item.difficulty) || null,
    topic: asText(item.topic) || null,
    source_document: asText(item.source_document) || batch.source_document,
    source_page: Number.isInteger(item.source_page) ? Number(item.source_page) : null,
    source_question_number: asText(item.source_question_number) || null,
    source_reference: asText(item.source_reference) || null,
    source_line: Number.isInteger(item.source_line) ? Number(item.source_line) : null,
    figure_descriptions: figureDescriptions,
    image_urls: imageUrls,
    image_url: asText(item.image_url) || imageUrls[0] || null,
    image_position: asText(item.image_position) || null,
    content_hash: asText(item.content_hash) || null,
  };

  return { raw: item, normalized, errors: [...new Set(errors)] };
}

async function requireAdmin(supabase: SupabaseClient<any>, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  return !error && data?.is_admin === true;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return respond({ error: "Server configuration is incomplete" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return respond({ error: "Invalid authentication" }, 401);
  if (!(await requireAdmin(supabase, user.id))) return respond({ error: "Administrator permission required" }, 403);

  try {
    const body = await request.json() as JsonObject;
    const action = asText(body.action);

    if (body.exam_program_id !== undefined && body.exam_program_id !== "jamb") {
      return respond({ error: "This importer accepts JAMB content only" }, 400);
    }

    if (action === "stage") {
      const sourceDocument = asText(body.source_document);
      const sourceSha = asText(body.source_sha256).toLowerCase();
      const subject = asText(body.subject).toLowerCase();
      const sourceStoragePath = asText(body.source_storage_path);
      const expectedItems = Number(body.expected_items);
      const rightsConfirmed = body.rights_confirmed === true;
      if (!sourceDocument || !/^[a-f0-9]{64}$/.test(sourceSha) || !SUBJECTS.has(subject)) {
        return respond({ error: "A source filename, SHA-256 hash and Physics/Chemistry/Biology subject are required" }, 400);
      }
      if (!Number.isInteger(expectedItems) || expectedItems < 1 || expectedItems > 10000) {
        return respond({ error: "expected_items must be a count between 1 and 10000" }, 400);
      }
      if (!rightsConfirmed || asText(body.rights_note).length < 12) {
        return respond({ error: "Confirm source-use permission and enter a short rights/permission note before staging" }, 400);
      }
      if (!sourceStoragePath.startsWith("jamb/" + user.id + "/")) {
        return respond({ error: "Upload the original source document to the private question-source-documents bucket first" }, 400);
      }
      const { data: batch, error: batchError } = await supabase
        .from("question_import_batches")
        .insert({
          exam_program_id: "jamb",
          source_document: sourceDocument,
          source_storage_path: sourceStoragePath,
          source_sha256: sourceSha,
          subject_code: subject,
          rights_confirmed: true,
          rights_note: asText(body.rights_note),
          expected_items: expectedItems,
          status: "staged",
          imported_by: user.id,
        })
        .select("id,status,source_document,source_sha256")
        .single();
      if (batchError) return respond({ error: batchError.message }, 500);
      return respond({ batch, next_action: "append-items" }, 201);
    }

    if (action === "append-items") {
      const batchId = asText(body.batch_id);
      const items = Array.isArray(body.items) ? body.items as JsonObject[] : [];
      if (!batchId || items.length < 1 || items.length > MAX_ITEMS_PER_REQUEST) {
        return respond({ error: "batch_id and 1-" + MAX_ITEMS_PER_REQUEST + " items are required" }, 400);
      }
      const { data: batch, error: batchError } = await supabase
        .from("question_import_batches")
        .select("id,exam_program_id,subject_code,source_document,rights_confirmed,status,imported_by,expected_items")
        .eq("id", batchId)
        .maybeSingle();
      if (batchError || !batch) return respond({ error: "Import batch not found" }, 404);
      if (batch.exam_program_id !== "jamb" || batch.imported_by !== user.id || !batch.rights_confirmed) {
        return respond({ error: "This batch cannot be modified by the current administrator" }, 403);
      }
      if (!["staged", "reviewing"].includes(batch.status)) {
        return respond({ error: "Items can only be added to a staged or reviewing batch" }, 409);
      }

      const { count, error: countError } = await supabase
        .from("question_import_items")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId);
      if (countError) return respond({ error: countError.message }, 500);

      if ((count ?? 0) + items.length > Number(batch.expected_items ?? 0)) {
        return respond({ error: "Staged item count cannot exceed the source package item count." }, 409);
      }
      const rows = items.map((item, index) => {
        const result = normalizeItem(item, batch);
        return {
          batch_id: batchId,
          item_number: (count ?? 0) + index + 1,
          raw_payload: result.raw,
          normalized_payload: result.normalized,
          validation_errors: result.errors,
          status: "needs_review",
        };
      });
      const { error: insertError } = await supabase.from("question_import_items").insert(rows);
      if (insertError) return respond({ error: insertError.message }, 500);

      const nextCount = (count ?? 0) + rows.length;
      const { error: updateError } = await supabase
        .from("question_import_batches")
        .update({
          total_items: nextCount,
          needs_review_count: nextCount,
          status: "reviewing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", batchId);
      if (updateError) return respond({ error: updateError.message }, 500);
      return respond({ batch_id: batchId, appended: rows.length, total_items: nextCount, expected_items: batch.expected_items });
    }

    if (action === "list-batches") {
      const { data, error } = await supabase
        .from("question_import_batches")
        .select("id,source_document,source_sha256,subject_code,status,total_items,expected_items,needs_review_count,approved_count,published_count,rights_confirmed,created_at,published_at")
        .eq("exam_program_id", "jamb")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return respond({ error: error.message }, 500);
      return respond({ batches: data ?? [] });
    }

    if (action === "list-items") {
      const batchId = asText(body.batch_id);
      const offset = Number.isInteger(body.offset) ? Math.max(0, Number(body.offset)) : 0;
      const limit = Number.isInteger(body.limit) ? Math.min(100, Math.max(1, Number(body.limit))) : 50;
      const { data: batch, error: batchError } = await supabase
        .from("question_import_batches")
        .select("id,exam_program_id")
        .eq("id", batchId)
        .maybeSingle();
      if (batchError || !batch || batch.exam_program_id !== "jamb") return respond({ error: "JAMB import batch not found" }, 404);
      const { data, error, count } = await supabase
        .from("question_import_items")
        .select("id,item_number,normalized_payload,validation_errors,status", { count: "exact" })
        .eq("batch_id", batchId)
        .order("item_number", { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) return respond({ error: error.message }, 500);
      return respond({ items: data ?? [], count: count ?? 0, offset, limit });
    }

    if (action === "review-item") {
      const itemId = asText(body.item_id);
      const decision = asText(body.decision);
      const payload = body.normalized_payload && typeof body.normalized_payload === "object"
        ? body.normalized_payload as JsonObject
        : null;
      if (!itemId || !payload || !["approved", "approved_ungraded", "rejected"].includes(decision)) {
        return respond({ error: "item_id, normalized_payload and a supported review decision are required" }, 400);
      }
      const { data: item, error: itemError } = await supabase
        .from("question_import_items")
        .select("id,batch_id,status")
        .eq("id", itemId)
        .maybeSingle();
      if (itemError || !item) return respond({ error: "Staged item not found" }, 404);
      const { data: batch } = await supabase
        .from("question_import_batches")
        .select("id,exam_program_id,subject_code,rights_confirmed")
        .eq("id", item.batch_id)
        .maybeSingle();
      if (!batch || batch.exam_program_id !== "jamb" || batch.rights_confirmed !== true || item.status === "published") {
        return respond({ error: "The source batch is not cleared for review" }, 403);
      }
      if (decision !== "rejected") {
        const options = Array.isArray(payload.options) ? payload.options as JsonObject[] : [];
        const labels = options.map((option) => asText(option.label).toUpperCase());
        const subject = asText(payload.subject);
        const year = Number.isInteger(payload.year) ? Number(payload.year) : null;
        const figures = Array.isArray(payload.figure_descriptions) ? payload.figure_descriptions : [];
        const images = Array.isArray(payload.image_urls) ? payload.image_urls.filter((url) => typeof url === "string") : [];
        const errors: string[] = [];
        if (!SUBJECTS.has(subject)) errors.push("unsupported_jamb_subject");
        if (subject !== String(batch.subject_code)) errors.push("subject_must_match_source_batch");
        if (!year || year < 1970 || year > 2100) errors.push("verified_source_year_required");
        if (asText(payload.question).length < 8) errors.push("question_text_missing_or_too_short");
        if ((options.length !== 4 && options.length !== 5) ||
            (labels.join(",") !== "A,B,C,D" && labels.join(",") !== "A,B,C,D,E") ||
            options.some((option) => !asText(option.text))) {
          errors.push("four_or_five_historically_valid_options_required");
        }
        if (figures.length > 0 && images.length === 0) errors.push("original_figure_image_required");
        const answer = asText(payload.correct_answer).toUpperCase();
        const answerVerified = decision === "approved" && payload.answer_key_verified === true;
        if (decision === "approved" && (!answerVerified || !labels.includes(answer))) {
          errors.push("approved_answer_key_must_be_verified_and_match_an_option");
        }
        if (decision === "approved_ungraded" && (answerVerified || answer)) {
          errors.push("ungraded_item_must_not_include_an_answer_key");
        }
        if (errors.length > 0) {
          return respond({ error: "This question still has validation issues", validation_errors: [...new Set(errors)] }, 422);
        }
        const canonical = JSON.stringify({ options, question: asText(payload.question), subject, year });
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
        payload.content_hash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
        payload.correct_answer = answerVerified ? answer : null;
        payload.explanation = answerVerified ? (asText(payload.explanation) || null) : null;
        payload.answer_key_verified = answerVerified;
        payload.image_urls = images;
        payload.image_url = typeof images[0] === "string" ? images[0] : null;
      }
      const { error: updateError } = await supabase
        .from("question_import_items")
        .update({
          normalized_payload: payload,
          validation_errors: [],
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (updateError) return respond({ error: updateError.message }, 500);
      const batchId = item.batch_id;
      const [needsReview, approved, published] = await Promise.all([
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).eq("status", "needs_review"),
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).in("status", ["approved", "approved_ungraded", "published"]),
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).eq("status", "published"),
      ]);
      const counterError = needsReview.error ?? approved.error ?? published.error;
      if (counterError) return respond({ error: counterError.message }, 500);
      const nextBatchStatus = (needsReview.count ?? 0) === 0 ? "approved" : "reviewing";
      const { error: batchUpdateError } = await supabase.from("question_import_batches")
        .update({
          needs_review_count: needsReview.count ?? 0,
          approved_count: approved.count ?? 0,
          published_count: published.count ?? 0,
          status: nextBatchStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batchId);
      if (batchUpdateError) return respond({ error: batchUpdateError.message }, 500);
      return respond({ item_id: itemId, status: decision, needs_review_count: needsReview.count ?? 0, approved_count: approved.count ?? 0 });
    }

    if (action === "publish-batch") {
      const batchId = asText(body.batch_id);
      if (!batchId) return respond({ error: "batch_id is required" }, 400);
      const { data, error } = await supabase.rpc("publish_jamb_question_batch", {
        p_batch_id: batchId,
        p_actor: user.id,
      });
      if (error) return respond({ error: error.message }, 422);
      return respond({ result: data });
    }

    return respond({ error: "Unsupported question-import action" }, 400);
  } catch (error) {
    console.error("[question-import]", String(error).slice(0, 500));
    return respond({ error: error instanceof Error ? error.message : "Unexpected import error" }, 500);
  }
});
