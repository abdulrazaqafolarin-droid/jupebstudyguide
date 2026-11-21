import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/jamb-http.ts";
import type { Database, Json } from "../_shared/rutex-database.types.ts";
import { hasActiveStudyAccess } from "../_shared/exam-access.ts";
import { JAMB_IMPORT_PROTOCOL_VERSION, resolveJambImportItemRange } from "../_shared/jamb-import-range.ts";
import { parseJambSourceReference } from "../_shared/jamb-source-reference.ts";

type AdminSupabase = SupabaseClient<Database>;

const SUBJECTS = new Set(["physics", "chemistry", "biology"]);
const MAX_ITEMS_PER_REQUEST = 50;

type JsonObject = { [key: string]: Json | undefined };

function respond(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function serializeAuditPayload(value: unknown): Json {
  const serialized = JSON.stringify(value);
  if (!serialized) return null;
  return JSON.parse(serialized) as Json;
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
  const rawSourceReference = asText(item.source_reference);
  const parsedSourceReference = parseJambSourceReference(rawSourceReference);
  const inheritedErrors = Array.isArray(item.validation_errors)
    ? item.validation_errors.filter((value): value is string => typeof value === "string")
    : [];
  const errors = [...new Set(inheritedErrors)];

  if (!SUBJECTS.has(subject)) errors.push("unsupported_jamb_subject");
  if (!year) errors.push("missing_or_ambiguous_source_year");
  if (!parsedSourceReference) errors.push("missing_or_ambiguous_source_reference");
  else if (year !== parsedSourceReference.year) errors.push("source_reference_year_mismatch");
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
    source_question_number: parsedSourceReference?.questionNumber ?? null,
    source_reference: rawSourceReference || null,
    source_line: Number.isInteger(item.source_line) ? Number(item.source_line) : null,
    figure_descriptions: figureDescriptions,
    image_urls: imageUrls,
    image_url: asText(item.image_url) || imageUrls[0] || null,
    image_position: asText(item.image_position) || null,
    content_hash: asText(item.content_hash) || null,
  };

  return { raw: item, normalized, errors: [...new Set(errors)] };
}

async function requireAdmin(supabase: AdminSupabase, userId: string): Promise<boolean> {
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

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return respond({ error: "Invalid authentication" }, 401);
  const access = await hasActiveStudyAccess(supabaseUrl, serviceKey, token, user.id, "jamb");
  if (!access.allowed) return respond({ error: access.reason ?? "Active study session required" }, 403);
  if (!(await requireAdmin(supabase, user.id))) return respond({ error: "Administrator permission required" }, 403);

  try {
    const body = await request.json() as JsonObject;
    const action = asText(body.action);

    if (body.exam_program_id !== undefined && body.exam_program_id !== "jamb") {
      return respond({ error: "This importer accepts JAMB content only" }, 400);
    }

    if (action === "capabilities") {
      return respond({
        protocol_version: JAMB_IMPORT_PROTOCOL_VERSION,
        resumable_source_chunks: true,
        stable_item_offsets: true,
        duplicate_chunk_retries: true,
      });
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
      const sourcePathParts = sourceStoragePath.split("/");
      if (!sourceStoragePath.startsWith("jamb/" + user.id + "/") || sourcePathParts.some((part) => !part || part === "." || part === "..")) {
        return respond({ error: "Upload the original source document to your private JAMB source folder first" }, 400);
      }
      const { data: sourceFile, error: sourceDownloadError } = await supabase.storage
        .from("question-source-documents")
        .download(sourceStoragePath);
      if (sourceDownloadError || !sourceFile) return respond({ error: "The original source document could not be verified in private storage" }, 422);
      const sourceDigest = await crypto.subtle.digest("SHA-256", await sourceFile.arrayBuffer());
      const storedSourceHash = Array.from(new Uint8Array(sourceDigest)).map((value) => value.toString(16).padStart(2, "0")).join("");
      if (storedSourceHash !== sourceSha) return respond({ error: "The uploaded original source does not match the supplied SHA-256 hash" }, 422);
      const { data: duplicateBatch, error: duplicateError } = await supabase
        .from("question_import_batches")
        .select("id,status")
        .eq("exam_program_id", "jamb")
        .eq("subject_code", subject)
        .eq("source_sha256", sourceSha)
        .maybeSingle();
      if (duplicateError) return respond({ error: duplicateError.message }, 500);
      if (duplicateBatch) return respond({ error: "This exact source file has already been staged in batch " + duplicateBatch.id + " (" + duplicateBatch.status + "). Open that batch instead of importing it again." }, 409);
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
      if (!["staged", "reviewing", "approved"].includes(batch.status)) {
        return respond({ error: "Items can only be added to an unpublished staged, reviewing or approved batch" }, 409);
      }

      const { count, error: countError } = await supabase
        .from("question_import_items")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId);
      if (countError) return respond({ error: countError.message }, 500);

      const expectedItems = Number(batch.expected_items ?? 0);
      let itemRange: ReturnType<typeof resolveJambImportItemRange>;
      try {
        itemRange = resolveJambImportItemRange(body.item_offset, count ?? 0, items.length, expectedItems);
      } catch (error) {
        return respond({ error: error instanceof Error ? error.message : "Invalid item range" }, 409);
      }
      const rows = items.map((item, index) => {
        const result = normalizeItem(item, batch);
        return {
          batch_id: batchId,
          item_number: itemRange.firstItemNumber + index,
          raw_payload: result.raw,
          normalized_payload: result.normalized,
          validation_errors: result.errors,
          status: "needs_review",
        };
      });

      // The database has a UNIQUE(batch_id, item_number) constraint.
      // Ignoring conflicts makes a retry of a timed-out chunk safe and keeps
      // already-reviewed rows intact instead of replacing their decisions.
      const { error: insertError } = await supabase
        .from("question_import_items")
        .upsert(rows, {
          onConflict: "batch_id,item_number",
          ignoreDuplicates: true,
        });
      if (insertError) return respond({ error: insertError.message }, 500);

      const [allItems, needsReview, approved, published] = await Promise.all([
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).eq("status", "needs_review"),
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).in("status", ["approved", "approved_ungraded", "published"]),
        supabase.from("question_import_items").select("id", { count: "exact", head: true }).eq("batch_id", batchId).eq("status", "published"),
      ]);
      const recalcError = allItems.error ?? needsReview.error ?? approved.error ?? published.error;
      if (recalcError) return respond({ error: recalcError.message }, 500);
      const nextCount = allItems.count ?? 0;
      const nextBatchStatus = (needsReview.count ?? 0) > 0 ? "reviewing" : "approved";
      const { error: updateError } = await supabase
        .from("question_import_batches")
        .update({
          total_items: nextCount,
          needs_review_count: needsReview.count ?? 0,
          approved_count: approved.count ?? 0,
          published_count: published.count ?? 0,
          status: nextBatchStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batchId);
      if (updateError) return respond({ error: updateError.message }, 500);
      return respond({
        batch_id: batchId,
        appended: Math.max(0, nextCount - (count ?? 0)),
        total_items: nextCount,
        expected_items: expectedItems,
        next_offset: nextCount,
        item_range: { first: itemRange.firstItemNumber, last: itemRange.lastItemNumber },
      });
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
        const sourceReference = parseJambSourceReference(asText(payload.source_reference));
        const errors: string[] = [];
        if (!SUBJECTS.has(subject)) errors.push("unsupported_jamb_subject");
        if (subject !== String(batch.subject_code)) errors.push("subject_must_match_source_batch");
        if (!year || year < 1970 || year > 2100) errors.push("verified_source_year_required");
        if (!sourceReference) errors.push("single_verified_source_reference_required");
        else if (year !== sourceReference.year) errors.push("source_reference_year_must_match_verified_source_year");
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
        if (!sourceReference) {
          return respond({ error: "A single verified source reference is required" }, 422);
        }
        payload.source_reference = sourceReference.canonical;
        payload.source_question_number = sourceReference.questionNumber;
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


    if (action === "manage-question") {
      const operation = asText(body.operation);
      const questionTable = supabase.from("study_questions");
      const answerKeyTable = supabase.from("study_question_answer_keys");
      const auditTable = supabase.from("jamb_question_admin_audit");

      if (operation === "list") {
        const subject = asText(body.subject).toLowerCase();
        const year = Number(body.year);
        if (!SUBJECTS.has(subject) || !Number.isInteger(year) || year < 1970 || year > 2100) {
          return respond({ error: "A supported JAMB subject and year are required" }, 400);
        }
        const { data: rows, error: rowsError, count: rowsResultCountRaw } = await questionTable
          .select("id,subject,year,category,question,options,difficulty,course,sort_order,image_url,image_urls,image_position,source_ref,source_document,source_page,source_question_number,source_batch_id", { count: "exact" })
          .eq("exam_program_id", "jamb")
          .eq("subject", subject)
          .eq("year", year)
          .eq("hidden", false)
          .eq("review_status", "published")
          .eq("category", "objective")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .limit(500);
        if (rowsError) return respond({ error: rowsError.message }, 500);
        const rowsResultCount = rowsResultCountRaw ?? rows?.length ?? 0;

        const questionIds = (rows ?? []).map((row) => row.id);
        if (questionIds.length === 0) return respond({ questions: [], total: 0, truncated: false });

        const sourceBatchIds = [...new Set((rows ?? [])
          .map((row) => row.source_batch_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0))];
        const [keysResult, auditsResult, batchesResult] = await Promise.all([
          answerKeyTable.select("question_id,correct_answer,explanation,review_status").in("question_id", questionIds),
          auditTable.select("question_id,rights_note,source_document,source_reference,created_at")
            .in("question_id", questionIds).order("created_at", { ascending: false }).limit(2000),
          sourceBatchIds.length
            ? supabase.from("question_import_batches").select("id,rights_note,source_document").in("id", sourceBatchIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (keysResult.error) return respond({ error: keysResult.error.message }, 500);
        if (auditsResult.error) return respond({ error: auditsResult.error.message }, 500);
        if (batchesResult.error) return respond({ error: batchesResult.error.message }, 500);

        const keyByQuestion = new Map<string, (typeof keysResult.data)[number]>();
        for (const key of keysResult.data ?? []) keyByQuestion.set(key.question_id, key);
        const auditByQuestion = new Map<string, (typeof auditsResult.data)[number]>();
        for (const audit of auditsResult.data ?? []) {
          if (audit.question_id && !auditByQuestion.has(audit.question_id)) {
            auditByQuestion.set(audit.question_id, audit);
          }
        }
        const batchById = new Map<string, (typeof batchesResult.data)[number]>();
        for (const batch of batchesResult.data ?? []) batchById.set(batch.id, batch);

        const questions = (rows ?? []).map((row) => {
          const id = row.id;
          const key = keyByQuestion.get(id);
          const audit = auditByQuestion.get(id);
          const batch = row.source_batch_id ? batchById.get(row.source_batch_id) : undefined;
          const imageUrls = Array.isArray(row.image_urls)
            ? row.image_urls.filter((url): url is string => typeof url === "string")
            : row.image_url ? [row.image_url] : [];
          return {
            id, subject: row.subject, year: row.year, category: "objective",
            question: row.question ?? "", options: row.options ?? [],
            correctAnswer: key?.correct_answer ?? "", explanation: key?.explanation ?? "",
            answerKeyStatus: key?.review_status ?? "missing",
            answerKeyVerified: key?.review_status === "approved",
            difficulty: row.difficulty ?? "medium", topic: row.course ?? "",
            sortOrder: row.sort_order ?? 0, imageUrl: row.image_url ?? imageUrls[0] ?? null,
            imageUrls, imagePosition: row.image_position ?? (imageUrls.length ? "image-only" : "text-only"),
            sourceReference: row.source_ref ?? "",
            sourceDocument: row.source_document ?? audit?.source_document ?? batch?.source_document ?? "",
            sourcePage: row.source_page ?? null, sourceQuestionNumber: row.source_question_number ?? "",
            rightsNote: audit?.rights_note ?? batch?.rights_note ?? "",
          };
        });
        return respond({ questions, total: rowsResultCount ?? questions.length, truncated: (rowsResultCount ?? questions.length) > questions.length });
      }

      if (operation === "get") {
        const questionId = asText(body.question_id);
        if (!questionId) return respond({ error: "question_id is required" }, 400);

        const { data: row, error: rowError } = await questionTable
          .select("*")
          .eq("id", questionId)
          .eq("exam_program_id", "jamb")
          .maybeSingle();
        if (rowError) return respond({ error: rowError.message }, 500);
        if (!row) return respond({ error: "JAMB question not found" }, 404);

        const { data: key, error: keyError } = await answerKeyTable
          .select("correct_answer,explanation,review_status,source_ref,reviewed_by,reviewed_at")
          .eq("question_id", questionId)
          .maybeSingle();
        if (keyError) return respond({ error: keyError.message }, 500);

        const { data: audit, error: auditError } = await auditTable
          .select("rights_note,source_document,source_reference")
          .eq("question_id", questionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (auditError) return respond({ error: auditError.message }, 500);
        const sourceBatchId = typeof row.source_batch_id === "string" ? row.source_batch_id : null;
        const { data: sourceBatch, error: sourceBatchError } = sourceBatchId
          ? await supabase.from("question_import_batches")
              .select("rights_note,source_document")
              .eq("id", sourceBatchId)
              .maybeSingle()
          : { data: null, error: null };
        if (sourceBatchError) return respond({ error: sourceBatchError.message }, 500);

        let imageUrls: string[] = [];
        if (Array.isArray(row.image_urls)) {
          imageUrls = row.image_urls.filter((url: unknown): url is string => typeof url === "string");
        }
        if (imageUrls.length === 0 && typeof row.image_url === "string" && row.image_url) {
          imageUrls = [row.image_url];
        }

        return respond({
          question: {
            id: row.id,
            subject: row.subject,
            year: row.year,
            category: "objective",
            question: row.question ?? "",
            options: row.options ?? [],
            correctAnswer: key?.correct_answer ?? "",
            explanation: key?.explanation ?? "",
            answerKeyStatus: key?.review_status ?? "missing",
            answerKeyVerified: key?.review_status === "approved",
            difficulty: row.difficulty ?? "medium",
            topic: row.course ?? "",
            sortOrder: row.sort_order ?? 0,
            imageUrl: row.image_url ?? imageUrls[0] ?? null,
            imageUrls,
            imagePosition: row.image_position ?? (imageUrls.length ? "image-only" : "text-only"),
            sourceReference: row.source_ref ?? "",
            sourceDocument: row.source_document ?? sourceBatch?.source_document ?? "",
            sourcePage: row.source_page ?? null,
            sourceQuestionNumber: row.source_question_number ?? "",
            rightsNote: audit?.rights_note ?? sourceBatch?.rights_note ?? "",
          },
        });
      }

      if (operation === "create" || operation === "update") {
        const payload = body.question && typeof body.question === "object"
          ? body.question as JsonObject
          : null;
        if (!payload) return respond({ error: "question payload is required" }, 400);

        const questionId = operation === "update"
          ? asText(payload.id)
          : "jamb-" + crypto.randomUUID().replaceAll("-", "");
        if (!questionId || (operation === "update" && !questionId.startsWith("jamb-"))) {
          return respond({ error: "A valid JAMB question ID is required" }, 400);
        }

        const subject = asText(payload.subject).toLowerCase();
        const year = Number(payload.year);
        const questionText = asText(payload.question);
        const options = Array.isArray(payload.options)
          ? payload.options.map((raw) => {
              const item = raw && typeof raw === "object" ? raw as JsonObject : {};
              return { label: asText(item.label).toUpperCase(), text: asText(item.text) };
            })
          : [];
        const labels = options.map((option) => option.label).sort();
        const expectedLabels = labels.length === 4 ? ["A", "B", "C", "D"] :
          labels.length === 5 ? ["A", "B", "C", "D", "E"] : [];
        const correctAnswer = asText(payload.correct_answer).toUpperCase();
        const explanation = asText(payload.explanation);
        const sourceReference = asText(payload.source_reference);
        const sourceDocument = asText(payload.source_document);
        const rightsConfirmed = payload.rights_confirmed === true;
        const rightsNote = asText(payload.rights_note);
        const parsedReference = parseJambSourceReference(sourceReference);
        const difficulty = ["easy", "medium", "hard"].includes(asText(payload.difficulty))
          ? asText(payload.difficulty)
          : "medium";
        const topic = asText(payload.topic);
        const imageUrls = Array.isArray(payload.image_urls)
          ? payload.image_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
          : [];
        const imageUrl = asText(payload.image_url) || imageUrls[0] || "";
        const imagePosition = asText(payload.image_position) || (imageUrls.length ? "image-only" : "text-only");
        if (!SUBJECTS.has(subject)) return respond({ error: "Choose a supported JAMB subject" }, 400);
        if (!Number.isInteger(year) || year < 1970 || year > 2100) {
          return respond({ error: "A valid source year is required" }, 400);
        }
        if (questionText.length < 8) return respond({ error: "Question text must contain at least 8 characters" }, 400);
        if (!parsedReference || parsedReference.year !== year) {
          return respond({ error: "Source reference must be a single verified citation in YYYY:Qnumber format matching the selected year" }, 400);
        }
        if (!sourceDocument) return respond({ error: "Source document name is required" }, 400);
        if (!rightsConfirmed || rightsNote.length < 12) {
          return respond({ error: "Confirm your right to use this source and enter a source-rights note" }, 400);
        }
        if (options.length !== expectedLabels.length || labels.some((label, index) => label !== expectedLabels[index]) ||
            options.some((option) => !option.text || option.text.length > 2000)) {
          return respond({ error: "Exactly four options A-D or five options A-E with non-empty text are required" }, 400);
        }
        if (!["A", "B", "C", "D", "E"].includes(correctAnswer) ||
            !labels.includes(correctAnswer)) {
          return respond({ error: "The correct answer must match one of the supplied option labels" }, 400);
        }
        if (explanation.length < 12) {
          return respond({ error: "Enter a meaningful explanation for the verified correct answer" }, 400);
        }
        if (payload.answer_key_verified !== true) {
          return respond({ error: "The administrator must attest that the answer key and explanation were independently verified" }, 400);
        }
        if (imageUrls.length > 8 || imageUrls.some((url) => {
          try {
            const parsed = new URL(url);
            return parsed.origin !== new URL(supabaseUrl).origin ||
              !parsed.pathname.startsWith("/storage/v1/object/public/");
          } catch {
            return true;
          }
        })) {
          return respond({ error: "Question images must be public Storage assets from this project (maximum 8)" }, 400);
        }

        const { data: beforeQuestion, error: beforeError } = operation === "update"
          ? await questionTable.select("*").eq("id", questionId).eq("exam_program_id", "jamb").maybeSingle()
          : { data: null, error: null };
        if (beforeError) return respond({ error: beforeError.message }, 500);
        if (operation === "update" && !beforeQuestion) return respond({ error: "JAMB question not found" }, 404);

        const sourcePage = Number.isInteger(payload.source_page) && Number(payload.source_page) > 0
          ? Number(payload.source_page)
          : payload.source_page === null
            ? null
            : operation === "update" && beforeQuestion?.source_page != null
              ? beforeQuestion.source_page
              : null;
        if (payload.source_page !== undefined && payload.source_page !== null &&
            (!Number.isInteger(payload.source_page) || Number(payload.source_page) < 1)) {
          return respond({ error: "Source PDF page must be a positive whole number" }, 400);
        }

        const { data: beforeKey, error: beforeKeyError } = operation === "update"
          ? await answerKeyTable.select("*").eq("question_id", questionId).maybeSingle()
          : { data: null, error: null };
        if (beforeKeyError) return respond({ error: beforeKeyError.message }, 500);

        const now = new Date().toISOString();
        const canonicalPayload = {
          subject, year, question: questionText, options, correct_answer: correctAnswer,
          explanation, source_reference: parsedReference.canonical, source_document: sourceDocument,
          difficulty, topic, image_urls: imageUrls, image_position: imagePosition,
        };
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(canonicalPayload)),
        );
        const payloadSha256 = Array.from(new Uint8Array(digest))
          .map((value) => value.toString(16).padStart(2, "0")).join("");

        const rowPayload = {
          exam_program_id: "jamb",
          subject,
          year,
          category: "objective",
          question: questionText,
          options,
          correct_answer: null,
          explanation: null,
          difficulty,
          course: topic || null,
          sort_order: Number.isInteger(payload.sort_order) ? Number(payload.sort_order) : 0,
          image_url: imageUrl || null,
          image_urls: imageUrls,
          image_position: imagePosition,
          hidden: false,
          review_status: "published",
          source_ref: parsedReference.canonical,
          source_document: sourceDocument,
          source_page: sourcePage,
          source_question_number: parsedReference.questionNumber,
          content_hash: payloadSha256,
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        };

        let savedQuestion: Record<string, unknown> | null = null;
        if (operation === "create") {
          const { data, error } = await questionTable.insert({ id: questionId, ...rowPayload }).select("*").single();
          if (error) return respond({ error: error.message }, 500);
          savedQuestion = data as Record<string, unknown>;
        } else {
          const { data, error } = await questionTable.update(rowPayload)
            .eq("id", questionId)
            .eq("exam_program_id", "jamb")
            .select("*")
            .single();
          if (error) return respond({ error: error.message }, 500);
          savedQuestion = data as Record<string, unknown>;
        }

        const keyPayload = {
          question_id: questionId,
          correct_answer: correctAnswer,
          explanation,
          review_status: "approved",
          source_ref: parsedReference.canonical,
          reviewed_by: user.id,
          reviewed_at: now,
          created_at: beforeKey?.created_at ?? now,
          updated_at: now,
        };
        const { error: keySaveError } = await answerKeyTable.upsert(keyPayload, { onConflict: "question_id" });
        if (keySaveError) {
          if (operation === "create") {
            await answerKeyTable.delete().eq("question_id", questionId);
            await questionTable.delete().eq("id", questionId).eq("exam_program_id", "jamb");
          } else if (beforeQuestion) {
            await questionTable.update(beforeQuestion).eq("id", questionId).eq("exam_program_id", "jamb");
          }
          return respond({ error: keySaveError.message }, 500);
        }

        const auditPayload = {
          question_id: questionId,
          actor_id: user.id,
          operation,
          source_reference: parsedReference.canonical,
          source_document: sourceDocument,
          rights_confirmed: true,
          rights_note: rightsNote,
          payload_sha256: payloadSha256,
          before_payload: operation === "update"
            ? serializeAuditPayload({ question: beforeQuestion, answer_key: beforeKey })
            : null,
          after_payload: serializeAuditPayload({ question: savedQuestion, answer_key: keyPayload }),
        };
        const { error: auditSaveError } = await auditTable.insert(auditPayload);
        if (auditSaveError) {
          if (operation === "create") {
            await questionTable.delete().eq("id", questionId).eq("exam_program_id", "jamb");
          } else if (beforeQuestion) {
            await questionTable.update(beforeQuestion).eq("id", questionId).eq("exam_program_id", "jamb");
            if (beforeKey) await answerKeyTable.upsert(beforeKey, { onConflict: "question_id" });
            else await answerKeyTable.delete().eq("question_id", questionId);
          }
          return respond({ error: "Question was not saved because its audit record could not be written: " + auditSaveError.message }, 500);
        }

        const result = {
          id: questionId,
          subject,
          year,
          category: "objective",
          question: questionText,
          options,
          correctAnswer,
          explanation,
          answerKeyVerified: true,
          difficulty,
          topic: topic || undefined,
          sortOrder: rowPayload.sort_order,
          imageUrl: imageUrl || undefined,
          imageUrls,
          imagePosition,
          sourceReference: parsedReference.canonical,
          sourceDocument,
          sourcePage: sourcePage ?? undefined,
          sourceQuestionNumber: parsedReference.questionNumber,
          rightsNote,
        };
        return respond({ question: result }, operation === "create" ? 201 : 200);
      }

      if (operation === "delete") {
        const questionId = asText(body.question_id);
        const rightsConfirmed = body.rights_confirmed === true;
        const rightsNote = asText(body.rights_note);
        if (!questionId || !rightsConfirmed || rightsNote.length < 12) {
          return respond({ error: "question_id, source-rights confirmation and a short note are required to delete" }, 400);
        }
        const { data: row, error: rowError } = await questionTable
          .select("*")
          .eq("id", questionId)
          .eq("exam_program_id", "jamb")
          .maybeSingle();
        if (rowError) return respond({ error: rowError.message }, 500);
        if (!row) return respond({ error: "JAMB question not found" }, 404);
        const { data: key, error: keyError } = await answerKeyTable.select("*")
          .eq("question_id", questionId).maybeSingle();
        if (keyError) return respond({ error: keyError.message }, 500);

        const sourceReference = asText(row.source_ref);
        const sourceDocument = asText(row.source_document);
        const { data: audit, error: auditError } = await auditTable.insert({
          question_id: questionId,
          actor_id: user.id,
          operation: "delete",
          source_reference: sourceReference || null,
          source_document: sourceDocument || null,
          rights_confirmed: true,
          rights_note: rightsNote,
          payload_sha256: null,
          before_payload: serializeAuditPayload({ question: row, answer_key: key }),
          after_payload: { hidden: true, review_status: "rejected", removed_from_active_bank: true },
        }).select("id").single();
        if (auditError) return respond({ error: "Question was not removed because its audit record failed: " + auditError.message }, 500);

        // Preserve question rows, approved keys, images and attempt references.
        // The JUPEB admin manager's established delete behavior is a soft hide;
        // hard-deleting here would break exam_attempt_questions foreign keys.
        const { error: hideError } = await questionTable.update({
          hidden: true,
          review_status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", questionId).eq("exam_program_id", "jamb");
        if (hideError) {
          await auditTable.delete().eq("id", audit.id);
          return respond({ error: hideError.message }, 500);
        }
        return respond({ deleted: true, question_id: questionId, soft_deleted: true });
      }

      if (operation === "reorder") {
        const subject = asText(body.subject).toLowerCase();
        const year = Number(body.year);
        const updates = Array.isArray(body.updates) ? body.updates as JsonObject[] : [];
        const rightsNote = "Administrative ordering of existing JAMB questions; content and answer keys unchanged.";
        if (!SUBJECTS.has(subject) || !Number.isInteger(year) || updates.length < 1 || updates.length > 500) {
          return respond({ error: "subject, year and 1-500 question order updates are required" }, 400);
        }
        const ids = updates.map((entry) => asText(entry.id));
        if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
          return respond({ error: "Question order IDs must be present and unique" }, 400);
        }
        const { data: existing, error: existingError } = await questionTable
          .select("id,sort_order")
          .eq("exam_program_id", "jamb")
          .eq("subject", subject)
          .eq("year", year)
          .in("id", ids);
        if (existingError) return respond({ error: existingError.message }, 500);
        if ((existing ?? []).length !== ids.length) return respond({ error: "One or more questions do not belong to this JAMB subject and year" }, 403);

        const afterPayload = updates.map((entry) => ({ id: asText(entry.id), sort_order: Number(entry.sort_order) }));
        if (afterPayload.some((entry) => !Number.isInteger(entry.sort_order) || entry.sort_order < 0)) {
          return respond({ error: "Each sort_order must be a non-negative integer" }, 400);
        }
        const { data: audit, error: auditError } = await auditTable.insert({
          question_id: null,
          actor_id: user.id,
          operation: "reorder",
          source_reference: null,
          source_document: null,
          rights_confirmed: true,
          rights_note: rightsNote,
          payload_sha256: null,
          before_payload: existing,
          after_payload: afterPayload,
        }).select("id").single();
        if (auditError) return respond({ error: auditError.message }, 500);

        for (const update of afterPayload) {
          const { error } = await questionTable.update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
            .eq("id", update.id)
            .eq("exam_program_id", "jamb")
            .eq("subject", subject)
            .eq("year", year);
          if (error) {
            for (const previous of existing) {
              await questionTable.update({ sort_order: previous.sort_order }).eq("id", previous.id).eq("exam_program_id", "jamb");
            }
            await auditTable.delete().eq("id", audit.id);
            return respond({ error: "Question ordering could not be saved: " + error.message }, 500);
          }
        }
        return respond({ reordered: afterPayload.length });
      }

      return respond({ error: "Unsupported question manager operation" }, 400);
    }

    return respond({ error: "Unsupported question-import action" }, 400);
  } catch (error) {
    console.error("[question-import]", String(error).slice(0, 500));
    return respond({ error: error instanceof Error ? error.message : "Unexpected import error" }, 500);
  }
});
