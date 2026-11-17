import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudUpload, FileCheck2, ImagePlus, Loader2, RefreshCw, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { JAMB_SUBJECT_INFO, JAMB_SUBJECTS } from "@/lib/jamb-config";
import type { Subject } from "@/types/question";

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
  topic: string;
  options: Array<{ label: string; text: string }>;
  correctAnswer: string;
  explanation: string;
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
    topic: typeof payload.topic === "string" ? payload.topic : "",
    options: options.map((option) => ({
      label: typeof option.label === "string" ? option.label : "",
      text: typeof option.text === "string" ? option.text : "",
    })),
    correctAnswer: typeof payload.correct_answer === "string" ? payload.correct_answer : "",
    explanation: typeof payload.explanation === "string" ? payload.explanation : "",
    imageUrls,
  };
}

export default function JambQuestionBankAdminPage() {
  const { user } = useAuth();
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
    try {
      const parsed = JSON.parse(await jsonFile.text()) as ImportPackage;
      if (parsed.schema_version !== 1 || parsed.exam_program_id !== "jamb" || !JAMB_SUBJECTS.includes(parsed.subject as Subject) || !Array.isArray(parsed.items)) {
        throw new Error("This is not a valid Rutex JAMB import package.");
      }
      const sourceHash = await sha256(sourceFile);
      if (sourceHash.toLowerCase() !== parsed.source_sha256.toLowerCase()) {
        throw new Error("The original source file does not match the SHA-256 recorded in the generated JSON. Re-run the importer from that exact source file.");
      }
      const safeName = sourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = "jamb/" + user.id + "/" + sourceHash + "/" + safeName;
      const { error: uploadError } = await supabase.storage
        .from("question-source-documents")
        .upload(storagePath, sourceFile, { upsert: false, contentType: sourceFile.type || "text/plain" });
      if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;

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
      const batchId = String(staged?.batch?.id ?? "");
      if (!batchId) throw new Error("The import batch was not created.");

      for (let index = 0; index < parsed.items.length; index += 50) {
        await invokeImport({
          action: "append-items",
          batch_id: batchId,
          items: parsed.items.slice(index, index + 50),
        });
      }
      toast.success("JAMB source staged for human review. No question was published.");
      setSelectedBatchId(batchId);
      setItemOffset(0);
      setJsonFile(null);
      setSourceFile(null);
      setRightsConfirmed(false);
      setRightsNote("");
      await refreshBatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "JAMB import staging failed.");
      await refreshBatches();
    } finally {
      setStaging(false);
    }
  };

  const updateOption = (index: number, field: "label" | "text", value: string) => {
    setEdit((previous) => previous ? ({
      ...previous,
      options: previous.options.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option),
    }) : previous);
  };

  const addOption = () => setEdit((previous) => previous && previous.options.length < 5
    ? { ...previous, options: [...previous.options, { label: String.fromCharCode(65 + previous.options.length), text: "" }] }
    : previous);
  const removeOption = (index: number) => setEdit((previous) => previous
    ? { ...previous, options: previous.options.filter((_, optionIndex) => optionIndex !== index) }
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
      setEdit((previous) => previous ? { ...previous, imageUrls: urls } : previous);
      toast.success("Question image(s) uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingImages(false);
    }
  };

  const reviewCurrent = async (decision: "approved" | "approved_ungraded" | "rejected") => {
    if (!currentItem || !edit || !selectedBatchId) return;
    setSavingReview(true);
    try {
      const options = edit.options
        .map((option) => ({ label: option.label.trim().toUpperCase(), text: option.text.trim() }))
        .filter((option) => option.label || option.text);
      const normalized = {
        ...currentPayload,
        subject: selectedBatch?.subject_code,
        year: edit.year.trim() ? Number(edit.year) : null,
        category: "objective",
        question: edit.question.trim(),
        topic: edit.topic.trim() || null,
        options,
        correct_answer: decision === "approved" ? edit.correctAnswer : null,
        answer_key_verified: decision === "approved",
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
      toast.success(decision === "rejected" ? "Question rejected." : decision === "approved" ? "Question approved with a verified answer key." : "Question approved as ungraded.");
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Batch publication failed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rutex Master · JAMB</p>
            <h1 className="text-2xl font-bold">Question bank review</h1>
            <p className="mt-1 text-sm text-muted-foreground">Stage, verify, correct and publish JAMB source questions.</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => void refreshBatches()} aria-label="Refresh batches"><RefreshCw className="h-4 w-4" /></Button>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2"><CloudUpload className="h-5 w-5 text-primary" /><h2 className="font-semibold">Stage a source collection</h2></div>
          <p className="text-xs leading-relaxed text-muted-foreground">Run <code>python scripts/import_jamb_sources.py</code> in the repository first. Select the generated subject JSON and the exact original Physics.txt, Chemistry.txt or Biology.txt file so the SHA-256 provenance can be verified.</p>
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
                  <p className="mt-1 text-xs text-muted-foreground">{JAMB_SUBJECT_INFO[batch.subject_code as Subject]?.label ?? batch.subject_code} · {batch.total_items}/{batch.expected_items} staged</p>
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
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Question text</span><textarea value={edit.question} onChange={(event) => setEdit((previous) => previous ? { ...previous, question: event.target.value } : previous)} rows={4} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Verified source year</span><input type="number" value={edit.year} onChange={(event) => setEdit((previous) => previous ? { ...previous, year: event.target.value } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Topic (optional)</span><input value={edit.topic} onChange={(event) => setEdit((previous) => previous ? { ...previous, topic: event.target.value } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                </div>
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
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Verified correct option (optional)</span><select value={edit.correctAnswer} onChange={(event) => setEdit((previous) => previous ? { ...previous, correctAnswer: event.target.value } : previous)} className="w-full rounded-xl border border-border bg-background p-3 text-sm"><option value="">No verified answer key</option>{edit.options.map((option) => <option key={option.label} value={option.label}>{option.label}</option>)}</select></label>
                  <label className="block space-y-1.5 text-sm"><span className="font-medium">Explanation (optional)</span><textarea value={edit.explanation} onChange={(event) => setEdit((previous) => previous ? { ...previous, explanation: event.target.value } : previous)} rows={2} className="w-full rounded-xl border border-border bg-background p-3 text-sm" /></label>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => void reviewCurrent("approved_ungraded")} disabled={savingReview || currentItem.status === "published"} variant="outline"><Check className="mr-2 h-4 w-4" />Approve ungraded</Button>
                  <Button onClick={() => void reviewCurrent("approved")} disabled={savingReview || !edit.correctAnswer || currentItem.status === "published"}><ShieldCheck className="mr-2 h-4 w-4" />Approve with verified key</Button>
                  <Button onClick={() => void reviewCurrent("rejected")} disabled={savingReview || currentItem.status === "published"} variant="destructive">Reject item</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Publishing keeps answer keys in the protected server-only answer-key table. They are never sent in the in-progress CBT payload.</p>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
