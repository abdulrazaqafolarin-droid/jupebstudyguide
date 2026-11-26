import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { JambAdminQuestionPanel } from "@/components/study-past-questions/JambAdminQuestionPanel";
import type { JambQuestion } from "@/lib/jamb-question-service";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudUpload, FileCheck2, ImagePlus, Loader2, RefreshCw, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { JAMB_SUBJECT_INFO, JAMB_QUESTION_BANK_SUBJECTS, JAMB_TARGET_EXAM_YEAR, type JambSubject } from "@/lib/jamb-config";
import { supportsResumableJambImport } from "@/lib/jamb-import-client";
import { getQuestionEmbeddingQueueStatus, processPendingQuestionEmbeddings, type QuestionEmbeddingQueueStatus } from "@/lib/question-rag-indexer";

const JAMB_REVIEW_DEFAULT_YEAR: Record<JambSubject, number> = {
  physics: 2018,
  chemistry: 2015,
  biology: 2014,
  use_of_english: 2020,
};

interface ImportPackage {
  schema_version: number;
  exam_program_id: string;
  subject: string;
  source_document: string;
  source_sha256: string;
  items: Array<Record<string, unknown>>;
}
interface Batch {
  id: string;
  source_document: string;
  source_sha256: string;
  subject_code: string;
  status: string;
  total_items: number;
  expected_items: number;
  needs_review_count: number;
  approved_count: number;
  published_count: number;
  rights_confirmed: boolean;
  created_at: string;
}
interface StagedItem {
  id: string;
  item_number: number;
  normalized_payload: Record<string, unknown>;
  validation_errors: string[];
  status: string;
}
interface EditState {
  question: string;
  year: string;
  sourceReference: string;
  topic: string;
  options: Array<{ label: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  answerKeyVerified: boolean;
  imageUrls: string[];
}

async function invokeImport(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("question-import", {
    body: { exam_program_id: "jamb", ...body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data;
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toEditState(payload: Record<string, unknown>): EditState {
  const options = Array.isArray(payload.options) ? payload.options as Array<Record<string, unknown>> : [];
  const imageUrls = Array.isArray(payload.image_urls) ? payload.image_urls.filter((url): url is string => typeof url === "string") : [];
  return {
    question: typeof payload.question === "string" ? payload.question : "",
    year: payload.year === null || payload.year === undefined ? "" : String(payload.year),
    sourceReference: typeof payload.source_reference === "string" ? payload.source_reference : "",
    topic: typeof payload.topic === "string" ? payload.topic : "",
    options: options.map((option) => ({
      label: typeof option.label === "string" ? option.label : "",
      text: typeof option.text === "string" ? option.text : "",
    })),
    correctAnswer: typeof payload.correct_answer === "string"
      ? payload.correct_answer
      : typeof payload.source_answer_candidate === "string" ? payload.source_answer_candidate : "",
    explanation: typeof payload.explanation === "string"
      ? payload.explanation
      : typeof payload.source_explanation_candidate === "string" ? payload.source_explanation_candidate : "",
    answerKeyVerified: false,
    imageUrls,
  };
}

export default function JambQuestionBankAdminPage() {
  const { user } = useAuth();
  const [activeAdminView, setActiveAdminView] = useState<"manager" | "source-review">("manager");
  const [managerSubject, setManagerSubject] = useState<JambSubject>("physics");
  const [managerYear, setManagerYear] = useState(JAMB_TARGET_EXAM_YEAR);
  const [includeReviewQueue, setIncludeReviewQueue] = useState(false);
  const [managerPanelOpen, setManagerPanelOpen] = useState(false);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [rightsNote, setRightsNote] = useState("");
  const [staging, setStaging] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [items, setItems] = useState<StagedItem[]>([]);
  const [itemOffset, setItemOffset] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [itemLoading, setItemLoading] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [embeddingQueue, setEmbeddingQueue] = useState<QuestionEmbeddingQueueStatus | null>(null);
  const [indexingEmbeddings, setIndexingEmbeddings] = useState(false);

  const refreshEmbeddingQueue = useCallback(async () => {
    try {
      const status = await getQuestionEmbeddingQueueStatus();
      setEmbeddingQueue(status);
      return status;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the question-search queue.");
      return null;
    }
  }, []);

  const runEmbeddingIndexing = useCallback(async () => {
    if (indexingEmbeddings) return;
    setIndexingEmbeddings(true);
    try {
      const result = await processPendingQuestionEmbeddings({ maxBatches: 10, batchSize: 5 });
      const status = await refreshEmbeddingQueue();
      if (result.failed > 0) {
        toast.warning(`Indexed ${result.indexed}; ${result.failed} need retry. ${status?.queuedJobs ?? result.queuedRemaining} remain queued.`);
      } else if (result.indexed > 0) {
        toast.success(`Indexed ${result.indexed} question embeddings. ${status?.queuedJobs ?? result.queuedRemaining} remain queued.`);
      } else {
        toast.info("No pending question embeddings were processed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Question-search indexing failed; queued jobs are retained for retry.");
      await refreshEmbeddingQueue();
    } finally {
      setIndexingEmbeddings(false);
    }
  }, [indexingEmbeddings, refreshEmbeddingQueue]);

  const selectedBatch = useMemo(() => batches.find((batch) => batch.id === selectedBatchId) ?? null, [batches, selectedBatchId]);
  const currentItem = useMemo(() => items[0] ?? null, [items]);
  const currentPayload = currentItem?.normalized_payload ?? null;

  const refreshBatches = useCallback(async () => {
    try {
      const data = await invokeImport({ action: "list-batches" });
      setBatches((data?.batches ?? []) as Batch[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load JAMB import batches.");
    }
  }, []);

  const loadItems = useCallback(async (batchId: string, offset = 0) => {
    setItemLoading(true);
    try {
      const data = await invokeImport({ action: "list-items", batch_id: batchId, offset, limit: 1 });
      setItems((data?.items ?? []) as StagedItem[]);
      setItemCount(Number(data?.count ?? 0));
      setItemOffset(offset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load staged questions.");
    } finally {
      setItemLoading(false);
    }
  }, []);

  useEffect(() => { void refreshBatches(); }, [refreshBatches]);
  useEffect(() => { void refreshEmbeddingQueue(); }, [refreshEmbeddingQueue]);
  useEffect(() => {
    if (!selectedBatchId) {
      setItems([]);
      setEdit(null);
      return;
    }
    void loadItems(selectedBatchId, itemOffset);
  }, [selectedBatchId, itemOffset, loadItems]);

  useEffect(() => {
    setEdit(currentPayload ? toEditState(currentPayload) : null);
  }, [currentItem?.id]);

  const stagePackage = async () => {
    if (!jsonFile || !sourceFile || !user?.id || !rightsConfirmed || rightsNote.trim().length < 12) {
      toast.error("Select the generated JSON, the original source file, and confirm its permitted use.");
      return;
    }
    setStaging(true);
    let activeBatchId = "";
    try {
      const parsed = JSON.parse(await jsonFile.text()) as ImportPackage;
      if (parsed.schema_version !== 1 || parsed.exam_program_id !== "jamb" || !JAMB_QUESTION_BANK_SUBJECTS.includes(parsed.subject as JambSubject) || !Array.isArray(parsed.items)) {
        throw new Error("This is not a valid Rutex JAMB import package.");
      }
      const sourceHash = await sha256(sourceFile);
      if (sourceHash.toLowerCase() !== parsed.source_sha256.toLowerCase()) {
        throw new Error("The original source file does not match the SHA-256 recorded in the generated JSON. Re-run the importer from that exact source file.");
      }

      // Do not upload or stage anything until the deployed Edge Function
      // confirms support for stable offsets and idempotent chunk retries.
      let capabilities: Record<string, unknown>;
      try {
        capabilities = await invokeImport({ action: "capabilities" }) as Record<string, unknown>;
      } catch {
        throw new Error("The JAMB source importer update is not deployed yet. No source file was uploaded. Retry after the admin importer service has been updated.");
      }
      if (!supportsResumableJambImport(capabilities, parsed.subject)) {
        throw new Error("The deployed JAMB importer does not support this subject and the verified-answer safeguards yet. No source file was uploaded. Deploy the latest question-import function and apply the JAMB answer-verification migration before retrying.");
      }

      const safeName = sourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = "jamb/" + user.id + "/" + sourceHash + "/" + safeName;
      const { error: uploadError } = await supabase.storage
        .from("question-source-documents")
        .upload(storagePath, sourceFile, { upsert: false, contentType: sourceFile.type || "text/plain" });
      if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;

      // Refresh first so a previous partially uploaded batch can be resumed
      // even after this page was reloaded.
      const listed = await invokeImport({ action: "list-batches" });
      const latestBatches = (listed?.batches ?? []) as Batch[];
      setBatches(latestBatches);
      const existingBatch = latestBatches.find((batch) =>
        batch.subject_code === parsed.subject &&
        batch.source_sha256.toLowerCase() === sourceHash.toLowerCase()
      );

      let nextOffset = 0;
      if (existingBatch) {
        if (existingBatch.expected_items !== parsed.items.length) {
          throw new Error("This source hash is already attached to a batch with a different candidate count. Review that batch instead of changing its package.");
        }
        if (existingBatch.status === "published") {
          setSelectedBatchId(existingBatch.id);
          throw new Error("This exact source package has already been published. Its existing batch is now selected for review.");
        }
        if (!["staged", "reviewing", "approved"].includes(existingBatch.status)) {
          setSelectedBatchId(existingBatch.id);
          throw new Error("This source batch is not resumable in its current status. Open the existing batch to inspect it.");
        }
        activeBatchId = existingBatch.id;
        nextOffset = Math.min(existingBatch.total_items, parsed.items.length);
      } else {
        const staged = await invokeImport({
          action: "stage",
          subject: parsed.subject,
          source_document: parsed.source_document || sourceFile.name,
          source_sha256: sourceHash,
          source_storage_path: storagePath,
          rights_confirmed: true,
          rights_note: rightsNote.trim(),
          expected_items: parsed.items.length,
        });
        activeBatchId = String(staged?.batch?.id ?? "");
        if (!activeBatchId) throw new Error("The import batch was not created.");
      }

      setSelectedBatchId(activeBatchId);
      setItemOffset(0);

      for (let index = nextOffset; index < parsed.items.length; index += 50) {
        const chunkRequest = {
          action: "append-items",
          batch_id: activeBatchId,
          item_offset: index,
          items: parsed.items.slice(index, index + 50),
        };
        try {
          await invokeImport(chunkRequest);
        } catch (firstError) {
          // The server upserts by (batch_id, item_number), so repeating the
          // exact same offset after a lost response cannot duplicate rows or
          // overwrite completed human review decisions.
          try {
            await invokeImport(chunkRequest);
          } catch {
            throw firstError;
          }
        }
      }
      toast.success(nextOffset > 0
        ? "JAMB source upload resumed and completed. Questions remain in human review."
        : "JAMB source staged for human review. No question was published.");
      setJsonFile(null);
      setSourceFile(null);
      setRightsConfirmed(false);
      setRightsNote("");
      await refreshBatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "JAMB import staging failed.");
      if (activeBatchId) {
        setSelectedBatchId(activeBatchId);
        setItemOffset(0);
      }
      await refreshBatches();
    } finally {
      setStaging(false);
    }
  };

  const updateOption = (index: number, field: "label" | "text", value: string) => {
    setEdit((previous) => previous ? ({
      ...previous,
      options: previous.options.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option),
      answerKeyVerified: false,
    }) : previous);
  };

  const addOption = () => setEdit((previous) => previous && previous.options.length < 5
    ? { ...previous, options: [...previous.options, { label: String.fromCharCode(65 + previous.options.length), text: "" }], answerKeyVerified: false }
    : previous);
  const removeOption = (index: number) => setEdit((previous) => previous
    ? { ...previous, options: previous.options.filter((_, optionIndex) => optionIndex !== index), answerKeyVerified: false }
    : previous);

  const uploadQuestionImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user?.id || !selectedBatchId || !currentItem) return;
    setUploadingImages(true);
    try {
      const urls = [...(edit?.imageUrls ?? [])];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Only image files can be attached to a question.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Each question image must be 5 MB or smaller.");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = "jamb/" + selectedBatchId + "/" + currentItem.id + "/" + crypto.randomUUID() + "-" + safeName;
        const { error } = await supabase.storage.from("question-images").upload(path, file, { upsert: false });
        if (error) throw error;
        urls.push(supabase.storage.from("question-images").getPublicUrl(path).data.publicUrl);
      }
      setEdit((previous) => previous ? { ...previous, imageUrls: urls, answerKeyVerified: false } : previous);
      toast.success("Question image(s) uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingImages(false);
    }
  };

  const reviewCurrent = async (decision: "approved" | "rejected") => {
    if (!currentItem || !edit || !selectedBatchId) return;
    if (decision === "approved" && !edit.answerKeyVerified) {
      toast.error("Confirm that you independently verified this answer and explanation before approving.");
      return;
    }
    setSavingReview(true);
    try {
      const options = edit.options
        .map((option) => ({ label: option.label.trim().toUpperCase(), text: option.text.trim() }))
        .filter((option) => option.label || option.text);
      const normalized = {
        ...currentPayload,
        subject: selectedBatch?.subject_code,
        year: edit.year.trim() ? Number(edit.year) : null,
        source_reference: edit.sourceReference.trim(),
        category: "objective",
        question: edit.question.trim(),
        topic: edit.topic.trim() || null,
        options,
        correct_answer: decision === "approved" ? edit.correctAnswer : null,
        answer_key_verified: decision === "approved" && edit.answerKeyVerified,
        explanation: decision === "approved" ? edit.explanation.trim() || null : null,
        image_urls: edit.imageUrls,
        image_url: edit.imageUrls[0] ?? null,
      };
      await invokeImport({
        action: "review-item",
        item_id: currentItem.id,
        decision,
        normalized_payload: normalized,
      });
      toast.success(decision === "rejected" ? "Question rejected." : "Question approved with a verified answer and explanation.");
      await refreshBatches();
      if (itemOffset + 1 < itemCount) setItemOffset((value) => value + 1);
      else await loadItems(selectedBatchId, itemOffset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this review.");
    } finally {
      setSavingReview(false);
    }
  };

  const publishBatch = async () => {
    if (!selectedBatch) return;
    if (selectedBatch.needs_review_count > 0 || selectedBatch.total_items !== selectedBatch.expected_items) {
      toast.error("Complete all reviews and verify that all source candidates were staged before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const data = await invokeImport({ action: "publish-batch", batch_id: selectedBatch.id });
      toast.success("JAMB batch published: " + String(data?.result?.published_count ?? 0) + " questions.");
      await refreshBatches();
      await loadItems(selectedBatch.id, 0);
      await runEmbeddingIndexing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch publication failed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="JAMB administration tools">
          <Button
            type="button"
            variant={activeAdminView === "manager" ? "default" : "outline"}
            size="sm"
            role="tab"
            aria-selected={activeAdminView === "manager"}
            onClick={() => { setManagerPanelOpen(false); setActiveAdminView("manager"); }}
          >
            Question Manager
          </Button>
          <Button
            type="button"
            variant={activeAdminView === "source-review" ? "default" : "outline"}
            size="sm"
            role="tab"
            aria-selected={activeAdminView === "source-review"}
            onClick={() => { setManagerPanelOpen(false); setActiveAdminView("source-review"); }}
          >
            Source Import & Review
          </Button>
        </div>

        {activeAdminView === "manager" ? (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rutex Master · JAMB</p>
                <h1 className="text-2xl font-bold">JAMB Question Manager</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Manage published questions or open the hidden review queue to inspect saved draft answers and explanations. Pending questions stay unavailable to learners until source rights, answers and explanations are verified.
                </p>
              </div>
              <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">Admin only</span>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Subject</span>
                <select
                  value={managerSubject}
                  onChange={(event) => {
                    const nextSubject = event.target.value as JambSubject;
                    setManagerSubject(nextSubject);
                    if (includeReviewQueue) setManagerYear(JAMB_REVIEW_DEFAULT_YEAR[nextSubject]);
                  }}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                >
                  {JAMB_QUESTION_BANK_SUBJECTS.map((item) => (
                    <option key={item} value={item}>{JAMB_SUBJECT_INFO[item].label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Exam year</span>
                <input
                  type="number"
                  min={1970}
                  max={2100}
                  step={1}
                  value={managerYear}
                  onChange={(event) => setManagerYear(Number(event.target.value))}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
              </label>
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={includeReviewQueue}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setIncludeReviewQueue(enabled);
                  setManagerYear(enabled ? JAMB_REVIEW_DEFAULT_YEAR[managerSubject] : JAMB_TARGET_EXAM_YEAR);
                }}
                className="mt-0.5 accent-primary"
              />
              <span>
                Include hidden questions needing review. Enabling this selects the latest imported year for the chosen subject; it opens the administrator-only queue and does not make questions visible to students.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setManagerPanelOpen(true)}
                disabled={!Number.isInteger(managerYear) || managerYear < 1970 || managerYear > 2100}
              >
                {includeReviewQueue ? "Open Pending Review Queue" : "Open Question Manager"}
              </Button>
              <Link
                to={"/jamb/past-questions?subject=" + encodeURIComponent(managerSubject) + "&year=" + managerYear}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open student view
              </Link>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {includeReviewQueue
                ? "The review queue loads hidden, unapproved JAMB questions and their protected draft answer keys for administrator review. Saving a question requires a new source-rights confirmation and an independently checked answer and explanation."
                : "The manager loads published questions for the selected subject and year, including their protected answer keys. Source intake and staged review remain in the separate Source Import & Review tab."}
            </p>
          </section>
        ) : (
          <>
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rutex Master · JAMB</p>
            <h1 className="text-2xl font-bold">Question bank review</h1>
            <p className="mt-1 text-sm text-muted-foreground">Stage, verify, correct and publish JAMB source questions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={"/jamb/past-questions?subject=" + encodeURIComponent(selectedBatch?.subject_code || "physics")}>Manage published questions</Link>
            </Button>
            <Button variant="outline" size="icon" onClick={() => void refreshBatches()} aria-label="Refresh batches"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Question-search indexing</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {embeddingQueue
                  ? `${embeddingQueue.queuedJobs.toLocaleString()} queued · ${embeddingQueue.embeddingsStored.toLocaleString()} embeddings stored`
                  : "Checking the shared question-search queue…"}
              </p>
              {embeddingQueue && embeddingQueue.missingEmbeddings > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {embeddingQueue.missingEmbeddings.toLocaleString()} visible questions are not indexed yet. New published questions enter this shared queue automatically.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void refreshEmbeddingQueue()} disabled={indexingEmbeddings}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh
              </Button>
              <Button size="sm" onClick={() => void runEmbeddingIndexing()} disabled={indexingEmbeddings || !embeddingQueue || embeddingQueue.queuedJobs === 0}>
                {indexingEmbeddings ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Indexing…</> : "Index next 50"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Uses the existing Rutex embedding worker and configured Gemini embedding key. Each run is bounded to 50 questions; failed jobs stay queued for retry.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2"><CloudUpload className="h-5 w-5 text-primary" /><h2 className="font-semibold">Stage a source collection</h2></div>
          <p className="text-xs leading-relaxed text-muted-foreground">Run <code>python scripts/import_jamb_sources.py</code> in the repository first. Select the generated subject JSON and the exact original Physics.txt, Chemistry.txt, Biology.txt or JAMB_english_READABLE.txt file so the SHA-256 provenance can be verified.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Generated JAMB JSON</span><input type="file" accept=".json,application/json" onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)} className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2" /></label>
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Original source document</span><input type="file" accept=".txt,.pdf,.docx,.csv" onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)} className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2" /></label>
          </div>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Rights / permission note</span><textarea value={rightsNote} onChange={(event) => setRightsNote(event.target.value)} placeholder="Describe why Rutex is permitted to store, display and use this source material." rows={2} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-0.5" />
            I confirm that Rutex has permission to store and use this source material, and that I am authorized to submit it.
          </label>
          <Button onClick={() => void stagePackage()} disabled={staging || !jsonFile || !sourceFile || !rightsConfirmed || rightsNote.trim().length < 12}>
            {staging ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Staging questions…</> : <><Upload className="mr-2 h-4 w-4" />Stage for review</>}
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Import batches</h2><span className="text-xs text-muted-foreground">{batches.length} recent</span></div>
          {batches.length === 0 ? <p className="text-sm text-muted-foreground">No JAMB import batches yet.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {batches.map((batch) => (
                <button key={batch.id} onClick={() => { setSelectedBatchId(batch.id); setItemOffset(0); }}
                  className={"rounded-xl border p-3 text-left transition-colors " + (selectedBatchId === batch.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50")}>
                  <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{batch.source_document}</strong><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{batch.status}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{JAMB_SUBJECT_INFO[batch.subject_code as JambSubject]?.label ?? batch.subject_code} · {batch.total_items}/{batch.expected_items} staged</p>
                  <p className="mt-1 text-xs text-muted-foreground">{batch.needs_review_count} waiting · {batch.published_count} published</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedBatch && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-muted-foreground">Selected batch</p><h2 className="font-semibold">{selectedBatch.source_document}</h2><p className="text-xs text-muted-foreground">{selectedBatch.total_items} / {selectedBatch.expected_items} staged · {selectedBatch.needs_review_count} awaiting review</p></div>
              <Button onClick={() => void publishBatch()} disabled={publishing || selectedBatch.status === "published" || selectedBatch.needs_review_count > 0 || selectedBatch.total_items !== selectedBatch.expected_items}>
                {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Publish approved batch
              </Button>
            </div>
            <div className="h-px bg-border" />
            {itemLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : !currentItem || !edit ? (
              <p className="py-8 text-sm text-muted-foreground">No staged item at this position. Use the batch list to choose another batch.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileCheck2 className="h-4 w-4" />Item {currentItem.item_number} of {itemCount} · {currentItem.status}</div>
                  <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={itemOffset === 0} onClick={() => setItemOffset((value) => Math.max(0, value - 1))}><ArrowLeft className="mr-1 h-3 w-3" />Previous</Button><Button size="sm" variant="outline" disabled={itemOffset + 1 >= itemCount} onClick={() => setItemOffset((value) => value + 1)}>Next<ArrowRight className="ml-1 h-3 w-3" /></Button></div>
                </div>
                {currentItem.validation_errors?.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" />Source validation flags</p><ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{currentItem.validation_errors.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>
                )}
                {Array.isArray(currentPayload?.figure_descriptions) && currentPayload.figure_descriptions.length > 0 && (
                  <div className="rounded-xl border border-border p-3"><p className="text-xs font-semibold">Figure descriptions from source</p><ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{(currentPayload.figure_descriptions as string[]).map((figure, index) => <li key={index}>{figure}</li>)}</ul></div>
                )}
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Question text</span><textarea value={edit.question} onChange={(event) => setEdit((previous) => previous ? { ...previous, question: event.target.value, answerKeyVerified: false } : previous)} rows={4} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Verified source year</span><input type="number" value={edit.year} onChange={(event) => setEdit((previous) => previous ? { ...previous, year: event.target.value, answerKeyVerified: false } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Topic (optional)</span><input value={edit.topic} onChange={(event) => setEdit((previous) => previous ? { ...previous, topic: event.target.value } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                </div>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Verified source reference</span>
                  <input
                    type="text"
                    value={edit.sourceReference}
                    onChange={(event) => setEdit((previous) => previous ? { ...previous, sourceReference: event.target.value, answerKeyVerified: false } : previous)}
                    placeholder="e.g. 2018:Q33"
                    aria-label="Verified source reference"
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">Resolve this to exactly one year and question number. The year must match the source year above; do not use the document's local item number as a JAMB question number.</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Options</h3><Button type="button" size="sm" variant="outline" onClick={addOption} disabled={edit.options.length >= 5}>Add option</Button></div>
                  {edit.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input value={option.label} onChange={(event) => updateOption(index, "label", event.target.value)} aria-label={"Option " + (index + 1) + " label"} className="w-14 rounded-lg border border-border bg-background p-2 text-center text-sm font-bold" />
                      <input value={option.text} onChange={(event) => updateOption(index, "text", event.target.value)} aria-label={"Option " + (index + 1) + " text"} className="min-w-0 flex-1 rounded-lg border border-border bg-background p-2 text-sm" />
                      <button type="button" onClick={() => removeOption(index)} aria-label="Remove option" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /><h3 className="text-sm font-semibold">Question images</h3></div>
                  <input type="file" accept="image/*" multiple onChange={(event) => void uploadQuestionImages(event.target.files)} className="block w-full text-xs" disabled={uploadingImages} />
                  {uploadingImages && <p className="text-xs text-muted-foreground">Uploading image(s)…</p>}
                  {edit.imageUrls.map((url) => <div key={url} className="break-all rounded-lg bg-muted p-2 text-[10px]">{url}</div>)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium">Correct answer (required)</span>
                    <select value={edit.correctAnswer} onChange={(event) => setEdit((previous) => previous ? { ...previous, correctAnswer: event.target.value, answerKeyVerified: false } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm">
                      <option value="">Choose the independently verified option</option>
                      {edit.options.map((option) => <option key={option.label} value={option.label}>{option.label}</option>)}
                    </select>
                    {typeof currentPayload?.source_answer_candidate === "string" && (
                      <span className="block text-xs text-amber-700 dark:text-amber-400">
                        Source suggestion: {String(currentPayload.source_answer_candidate)} · unverified; check it against a reliable answer source
                      </span>
                    )}
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium">Explanation (required)</span>
                    <textarea value={edit.explanation} onChange={(event) => setEdit((previous) => previous ? { ...previous, explanation: event.target.value, answerKeyVerified: false } : previous)} rows={2} className="w-full rounded-xl border border-border bg-background p-3 text-sm" />
                    {typeof currentPayload?.source_explanation_candidate === "string" && (
                      <span className="block text-xs text-amber-700 dark:text-amber-400">
                        This explanation came from the submitted source and has not been independently verified.
                      </span>
                    )}
                  </label>
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                  <input
                    type="checkbox"
                    checked={edit.answerKeyVerified}
                    onChange={(event) => setEdit((previous) => previous
                      ? { ...previous, answerKeyVerified: event.target.checked }
                      : previous)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>I independently checked the selected correct answer and explanation against a reliable answer source. Approving this item certifies that verification.</span>
                </label>
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    onClick={() => void reviewCurrent("approved")}
                    disabled={savingReview || !edit.answerKeyVerified || !edit.correctAnswer || edit.explanation.trim().length < 12 || currentItem.status === "published"}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />Approve with verified answer and explanation
                  </Button>
                  <Button onClick={() => void reviewCurrent("rejected")} disabled={savingReview || currentItem.status === "published"} variant="destructive">Reject item</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Every published JAMB question must have a verified correct answer and a meaningful explanation. Questions without both stay in review; approved keys remain in the protected answer-key table.</p>
              </>
            )}
          </section>
        )}
          </>
        )}
      </div>

      <JambAdminQuestionPanel
        question={null}
        questions={[]}
        subject={managerSubject}
        year={managerYear}
        category="objective"
        onQuestionUpdated={(_question: JambQuestion) => {}}
        onQuestionDeleted={(_id: string) => {}}
        onQuestionAdded={(_question: JambQuestion) => {}}
        isOpen={managerPanelOpen}
        includeReviewQueue={includeReviewQueue}
        onClose={() => setManagerPanelOpen(false)}
      />
    </main>
  );
}
