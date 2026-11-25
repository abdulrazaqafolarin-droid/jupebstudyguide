import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Plus, AlertTriangle, GripVertical, ListOrdered, ImageIcon, Upload, XCircle, Loader2, Eye } from "lucide-react";
import type { JambQuestion } from "@/lib/jamb-question-service";
import { supabase } from "@/integrations/supabase/client";
import { uploadQuestionImage, deleteQuestionImageUrls } from "@/lib/admin-questions-service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageCropper } from "./ImageCropper";
import { QuestionMath } from "@/components/QuestionMath";
import { createInlineImagePosition, isInlineImagePosition } from "@/lib/question-image-position";
import { QuestionImagePositioner } from "./QuestionImagePositioner";
import { processPendingQuestionEmbeddings } from "@/lib/question-rag-indexer";

interface JambAdminQuestionPanelProps {
  question: JambQuestion | null;
  questions?: JambQuestion[];
  subject: JambQuestion["subject"];
  year: number;
  category: "objective";
  onQuestionUpdated: (question: JambQuestion) => void;
  onQuestionDeleted: (id: string) => void;
  onQuestionAdded: (question: JambQuestion) => void;
  onQuestionsReordered?: (questions: JambQuestion[]) => void;
  isOpen: boolean;
  includeReviewQueue?: boolean;
  onClose: () => void;
}

interface OptionEntry {
  label: string;
  text: string;
}

type Mode = "edit" | "add" | null;

interface QuestionImageDraft {
  id: string;
  url: string;
  file?: File;
}

export function JambAdminQuestionPanel({
  question,
  questions,
  subject,
  year,
  category,
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionAdded,
  onQuestionsReordered,
  isOpen,
  includeReviewQueue = false,
  onClose,
}: JambAdminQuestionPanelProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<OptionEntry[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [images, setImages] = useState<QuestionImageDraft[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<string>("image-above");
  const [showPreview, setShowPreview] = useState(false);
  const [cropFileName, setCropFileName] = useState<string>("");
  const [editingQuestion, setEditingQuestion] = useState<JambQuestion | null>(null);
  const [managerQuestions, setManagerQuestions] = useState<JambQuestion[]>(questions ?? []);
  const managerQuestionsRef = useRef<JambQuestion[]>(questions ?? []);
  managerQuestionsRef.current = managerQuestions;
  const [sourceReference, setSourceReference] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [sourcePage, setSourcePage] = useState("");
  const [rightsNote, setRightsNote] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [answerKeyVerified, setAnswerKeyVerified] = useState(false);
  const [answerConfidence, setAnswerConfidence] = useState<"unrated" | "low" | "medium" | "high">("unrated");
  const [confidenceNote, setConfidenceNote] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [draftVersion, setDraftVersion] = useState(0);
  const [savedDraftMessage, setSavedDraftMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const pendingFilesRef = useRef<File[]>([]);
  const isCroppingRef = useRef(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const loadQuestionRequestRef = useRef(0);
  const answerKeyEditRevisionRef = useRef(0);

  const isObjective = category === "objective";

  useEffect(() => {
    if (!isOpen) {
      loadQuestionRequestRef.current += 1;
      pendingFilesRef.current = [];
      isCroppingRef.current = false;
      setCropImageUrl(null);
      setCropFileName("");
      setMode(null);
      setConfirmDelete(false);
      setError(null);
    }
  }, [isOpen]);

  const refreshManagerQuestions = useCallback(async () => {
    if (!isOpen) return;
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
        body: {
          exam_program_id: "jamb",
          action: "manage-question",
          operation: "list",
          subject,
          year,
          include_review_queue: includeReviewQueue,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      setManagerQuestions(Array.isArray(data?.questions) ? data.questions as JambQuestion[] : []);
      if (data?.truncated) {
        setError("This year has more than 500 questions. The current manager list is capped at 500; pagination is needed before ordering more.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the full JAMB question list.");
    }
  }, [includeReviewQueue, isOpen, subject, year]);

  useEffect(() => {
    if (isOpen) {
      void refreshManagerQuestions();
      void processPendingQuestionEmbeddings().catch((indexError) => {
        console.warn("[JAMB Question RAG] Could not resume indexing:", indexError);
      });
    }
  }, [isOpen, refreshManagerQuestions]);

  const loadQuestion = useCallback(async (q: JambQuestion) => {
    const requestId = ++loadQuestionRequestRef.current;
    const answerRevisionAtLoad = answerKeyEditRevisionRef.current;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    pendingFilesRef.current = [];
    isCroppingRef.current = false;
    setCropImageUrl(null);
    setCropFileName("");
    setEditingQuestion(q);
    setQuestionText(q.question || "");
    const questionImageUrls = q.imageUrls?.length ? q.imageUrls : q.imageUrl ? [q.imageUrl] : [];
    setImages(questionImageUrls.map((url, index) => ({ id: q.id + "-image-" + index, url })));
    setImagePosition(q.imagePosition || (questionImageUrls.length ? "image-only" : "text-only"));
    setShowPreview(questionImageUrls.length > 0);
    setOptions(q.options ? q.options.map(o => ({ label: o.label, text: o.text })) : []);
    setCorrectAnswer("");
    setExplanation("");
    setDifficulty(q.difficulty || "medium");
    setTopic(q.topic || "");
    setSortOrder(q.sortOrder != null ? String(q.sortOrder) : "0");
    setSourceReference(q.sourceReference || "");
    setSourceDocument(q.sourceDocument || "");
    setSourcePage(q.sourcePage != null ? String(q.sourcePage) : "");
    setRightsNote("");
    setRightsConfirmed(false);
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    setDraftVersion(q.draftVersion ?? 0);
    setSavedDraftMessage(null);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
        body: { exam_program_id: "jamb", action: "manage-question", operation: "get", question_id: q.id },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      const detail = data?.question;
      if (detail && requestId === loadQuestionRequestRef.current) {
        if (answerKeyEditRevisionRef.current === answerRevisionAtLoad) {
          setCorrectAnswer(String(detail.correctAnswer || ""));
          setExplanation(String(detail.explanation || ""));
          setAnswerKeyVerified(detail.answerKeyVerified === true);
          const confidence = String(detail.answerConfidence || "unrated");
          setAnswerConfidence(["unrated", "low", "medium", "high"].includes(confidence)
            ? confidence as "unrated" | "low" | "medium" | "high"
            : "unrated");
          setConfidenceNote(String(detail.confidenceNote || ""));
          setEvidenceReference(String(detail.evidenceReference || ""));
          setDraftVersion(Number.isInteger(detail.draftVersion) ? Number(detail.draftVersion) : q.draftVersion ?? 0);
        }
        setSourceReference(String(detail.sourceReference || ""));
        setSourceDocument(String(detail.sourceDocument || ""));
        setSourcePage(detail.sourcePage == null ? "" : String(detail.sourcePage));
        setDifficulty(String(detail.difficulty || q.difficulty || "medium"));
        setTopic(String(detail.topic || q.topic || ""));
        // Historical audit notes are not a fresh rights attestation for this edit.
        // Require the administrator to confirm permission and enter a current note again.
        setRightsNote("");
        setRightsConfirmed(false);
      }
    } catch (loadError) {
      if (requestId === loadQuestionRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the protected JAMB answer key.");
      }
    }
  }, []);

  const handleSaveAnswerDraft = async () => {
    if (!includeReviewQueue || mode !== "edit" || !editingQuestion) {
      setError("Open a pending JAMB question before saving an answer draft.");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedDraftMessage(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
        body: {
          exam_program_id: "jamb",
          action: "manage-question",
          operation: "save-answer-draft",
          question_id: editingQuestion.id,
          expected_draft_version: draftVersion,
          correct_answer: correctAnswer.trim().toUpperCase(),
          explanation: explanation.trim(),
          confidence_level: answerConfidence,
          confidence_note: confidenceNote.trim(),
          evidence_reference: evidenceReference.trim(),
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      const saved = data?.answerDraft;
      if (!saved || saved.questionId !== editingQuestion.id || data?.visibility?.hidden !== true || data?.visibility?.reviewStatus !== "needs_review") {
        if (!saved) throw new Error("The server did not return the saved answer draft.");
        throw new Error("The server returned an unexpected visibility state. Reload before continuing.");
      }
      const nextVersion = Number(saved.draftVersion);
      setDraftVersion(Number.isInteger(nextVersion) ? nextVersion : draftVersion + 1);
      setAnswerConfidence(saved.answerConfidence === "low" || saved.answerConfidence === "medium" || saved.answerConfidence === "high"
        ? saved.answerConfidence
        : "unrated");
      setConfidenceNote(String(saved.confidenceNote ?? confidenceNote));
      setEvidenceReference(String(saved.evidenceReference ?? evidenceReference));
      setManagerQuestions((previous) => previous.map((item) => item.id === editingQuestion.id
        ? {
            ...item,
            correctAnswer: String(saved.correctAnswer ?? correctAnswer),
            explanation: String(saved.explanation ?? explanation),
            answerKeyStatus: "needs_review",
            answerKeyVerified: false,
            answerConfidence: saved.answerConfidence,
            confidenceNote: String(saved.confidenceNote ?? confidenceNote),
            evidenceReference: String(saved.evidenceReference ?? evidenceReference),
            draftVersion: Number.isInteger(nextVersion) ? nextVersion : draftVersion + 1,
          }
        : item));
      setCorrectAnswer(String(saved.correctAnswer ?? correctAnswer));
      setExplanation(String(saved.explanation ?? explanation));
      setAnswerKeyVerified(false);
      setSavedDraftMessage("Answer draft saved. It remains hidden from learners and is still awaiting independent review.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this answer draft.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = useCallback(() => {
    loadQuestionRequestRef.current += 1;
    answerKeyEditRevisionRef.current += 1;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    pendingFilesRef.current = [];
    isCroppingRef.current = false;
    setCropImageUrl(null);
    setCropFileName("");
    setEditingQuestion(null);
    setQuestionText("");
    setImages([]);
    setImagePosition("image-above");
    setShowPreview(false);
    setOptions([{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }]);
    setCorrectAnswer("");
    setExplanation("");
    setDifficulty("medium");
    setTopic("");
    const currentManagerQuestions = managerQuestionsRef.current;
    const nextSortOrder = currentManagerQuestions.length
      ? Math.max(...currentManagerQuestions.map((item) => item.sortOrder ?? 0)) + 1
      : 0;
    setSortOrder(String(nextSortOrder));
    setSourceReference("");
    setSourceDocument("");
    setSourcePage("");
    setRightsNote("");
    setRightsConfirmed(false);
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    setDraftVersion(0);
    setSavedDraftMessage(null);
    setError(null);
  }, []);

  const handleEdit = () => {
    if (!question) return;
    setMode("edit");
    loadQuestion(question);
  };

  const handleAdd = () => {
    resetForm();
    setMode("add");
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const startNextCrop = useCallback(() => {
    const readNext = () => {
      const nextFile = pendingFilesRef.current.shift();
      if (!nextFile) {
        isCroppingRef.current = false;
        setCropImageUrl(null);
        setCropFileName("");
        return;
      }

      isCroppingRef.current = true;
      setCropImageUrl(null);
      setCropFileName(nextFile.name);
      const reader = new FileReader();
      reader.onload = () => setCropImageUrl(reader.result as string);
      reader.onerror = () => {
        setError("Could not read " + nextFile.name);
        readNext();
      };
      reader.readAsDataURL(nextFile);
    };
    readNext();
  }, []);

  const handleImageSelect = (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    const validFiles = selectedFiles.filter((file) => {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        setError(file.name + ": only JPEG, PNG, WebP or GIF images are allowed");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(file.name + ": image must be less than 5 MB");
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    if (images.length === 0) setImagePosition("image-above");
    pendingFilesRef.current.push(...validFiles);
    if (!isCroppingRef.current) startNextCrop();
    setError(null);
  };

  const addCroppedImage = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setImages((current) => [
      ...current,
      { id: Date.now() + "-" + Math.random(), url: previewUrl, file },
    ]);
    answerKeyEditRevisionRef.current += 1;
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    setShowPreview(true);
  }, []);

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const extension = croppedBlob.type === "image/png"
      ? ".png"
      : croppedBlob.type === "image/webp"
        ? ".webp"
        : ".jpg";
    const croppedFile = new File(
      [croppedBlob],
      cropFileName.replace(/\.[^.]+$/, extension),
      { type: croppedBlob.type || "image/jpeg" }
    );
    addCroppedImage(croppedFile);
    startNextCrop();
  }, [cropFileName, addCroppedImage, startNextCrop]);

  const handleSkipCrop = useCallback((originalBlob: Blob) => {
    addCroppedImage(new File([originalBlob], cropFileName, { type: originalBlob.type }));
    startNextCrop();
  }, [cropFileName, addCroppedImage, startNextCrop]);

  const handleCancelCrop = useCallback(() => {
    pendingFilesRef.current = [];
    isCroppingRef.current = false;
    setCropImageUrl(null);
    setCropFileName("");
  }, []);

  const handleRemoveImage = (imageId: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === imageId);
      if (removed?.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== removed.url);
      }
      const remaining = current.filter((image) => image.id !== imageId);
      if (remaining.length === 0) setImagePosition("image-above");
      answerKeyEditRevisionRef.current += 1;
      setAnswerKeyVerified(false);
      setAnswerConfidence("unrated");
      setConfidenceNote("");
      setEvidenceReference("");
      return remaining;
    });
  };

  const handleSave = async () => {
    if (!questionText.trim() && images.length === 0) {
      setError("Question text or an image is required");
      return;
    }
    const validOptions = options.filter((option) => option.text.trim());
    if (validOptions.length !== 4 && validOptions.length !== 5) {
      setError("JAMB objective questions must have four or five non-empty options");
      return;
    }
    const labels = validOptions.map((option) => option.label);
    if (!labels.includes(correctAnswer.trim().toUpperCase())) {
      setError("Correct answer must match one of the saved option labels");
      return;
    }
    if (explanation.trim().length < 12) {
      setError("A meaningful explanation is required");
      return;
    }
    if (!sourceDocument.trim() || !/^((19|20)\d{2}):Q\d+[a-z]?$/i.test(sourceReference.trim())) {
      setError("Enter a source document and a single source reference such as 2024:Q12");
      return;
    }
    if (sourcePage.trim() && (!Number.isInteger(Number(sourcePage)) || Number(sourcePage) < 1)) {
      setError("Source PDF page must be a positive whole number");
      return;
    }
    if (!rightsConfirmed || rightsNote.trim().length < 12) {
      setError("Confirm source-use rights and add a short rights/permission note");
      return;
    }
    if (!answerKeyVerified) {
      setError("Confirm that the correct answer and explanation were independently checked");
      return;
    }

    const qId = mode === "edit" && editingQuestion
      ? editingQuestion.id
      : "jamb-" + crypto.randomUUID().replace(/-/g, "");
    const existingImageUrls = mode === "edit" && editingQuestion
      ? (editingQuestion.imageUrls?.length ? editingQuestion.imageUrls : editingQuestion.imageUrl ? [editingQuestion.imageUrl] : [])
      : [];
    const newlyUploadedUrls: string[] = [];

    setSaving(true);
    setError(null);
    setUploadingImage(images.some((image) => !!image.file));

    try {
      const resolvedImageUrls: string[] = [];
      for (const image of images) {
        if (image.file) {
          const uploadResult = await uploadQuestionImage(qId, image.file);
          if (!uploadResult.success || !uploadResult.url) {
            await deleteQuestionImageUrls(newlyUploadedUrls).catch(() => {});
            setError(uploadResult.error || "Failed to upload image");
            setSaving(false);
            setUploadingImage(false);
            return;
          }
          newlyUploadedUrls.push(uploadResult.url);
          resolvedImageUrls.push(uploadResult.url);
        } else {
          resolvedImageUrls.push(image.url);
        }
      }
      const resolvedImageUrl = resolvedImageUrls[0] || null;
      const payload = {
        id: qId,
        subject: mode === "edit" && editingQuestion ? editingQuestion.subject : subject,
        year: mode === "edit" && editingQuestion ? editingQuestion.year : year,
        question: questionText.trim() || resolvedImageUrl || "",
        options: validOptions,
        correct_answer: correctAnswer.trim().toUpperCase(),
        explanation: explanation.trim(),
        difficulty,
        topic: topic.trim(),
        sort_order: parseInt(sortOrder, 10) || 0,
        image_url: resolvedImageUrl,
        image_urls: resolvedImageUrls,
        image_position: imagePosition,
        source_reference: sourceReference.trim(),
        source_document: sourceDocument.trim(),
        source_page: sourcePage.trim() ? Number(sourcePage) : null,
        rights_confirmed: rightsConfirmed,
        rights_note: rightsNote.trim(),
        answer_key_verified: answerKeyVerified,
      };
      const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
        body: {
          exam_program_id: "jamb",
          action: "manage-question",
          operation: mode === "edit" ? "update" : "create",
          question: payload,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      const saved = data?.question as JambQuestion | undefined;
      if (!saved) throw new Error("The server did not return the saved JAMB question.");

      if (mode === "edit" && editingQuestion) {
        setManagerQuestions((previous) => previous.map((item) => item.id === saved.id ? saved : item));
        onQuestionUpdated(saved);
        // Older CBT snapshots and admin audit records may still reference these files.
        // Keep prior image objects; only newly uploaded, unsaved files are cleaned up on failure.
      } else {
        setManagerQuestions((previous) => [...previous, saved].sort((a, b) => a.sortOrder - b.sortOrder));
        onQuestionAdded(saved);
      }

      void processPendingQuestionEmbeddings().catch((indexError) => {
        console.warn("[JAMB Question RAG] Could not queue embedding refresh:", indexError);
      });
      setUploadingImage(false);
      setSaving(false);
      setMode(null);
      onClose();
    } catch (saveError) {
      await deleteQuestionImageUrls(newlyUploadedUrls).catch(() => {});
      setError(saveError instanceof Error ? saveError.message : "Could not save this JAMB question.");
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!editingQuestion) return;
    if (!rightsConfirmed || rightsNote.trim().length < 12) {
      setError("Confirm source-use rights and add a short note before deleting this question");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
        body: {
          exam_program_id: "jamb",
          action: "manage-question",
          operation: "delete",
          question_id: editingQuestion.id,
          rights_confirmed: true,
          rights_note: rightsNote.trim(),
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      // Keep image assets for historical CBT attempts and review records.
      setSaving(false);
      setManagerQuestions((previous) => previous.filter((item) => item.id !== editingQuestion.id));
      onQuestionDeleted(editingQuestion.id);
      setMode(null);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this JAMB question.");
      setSaving(false);
    }
  };

  const updateOption = (idx: number, text: string) => {
    answerKeyEditRevisionRef.current += 1;
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o));
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length);
    if (options.length >= 5) return;
    answerKeyEditRevisionRef.current += 1;
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    setOptions(prev => [...prev, { label: nextLabel, text: "" }]);
  };

  const handleDragSort = async () => {
    if (includeReviewQueue) return;
    if (dragItem.current === null || dragOverItem.current === null || managerQuestions.length === 0) return;
    if (dragItem.current === dragOverItem.current) return;
    const reordered = [...managerQuestions];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    const firstSortOrder = Math.min(...managerQuestions.map((q) => q.sortOrder ?? 0));
    const reorderedWithPositions = reordered.map((q, index) => ({
      ...q,
      sortOrder: firstSortOrder + index,
    }));
    const updates = reorderedWithPositions.map((q) => ({ id: q.id, sort_order: q.sortOrder }));
    const { data, error: invokeError } = await supabase.functions.invoke("question-import", {
      body: {
        exam_program_id: "jamb",
        action: "manage-question",
        operation: "reorder",
        subject,
        year,
        updates,
      },
    });
    if (invokeError || data?.error) {
      setError(data?.error || invokeError?.message || "Failed to reorder JAMB questions");
      return;
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setManagerQuestions(reorderedWithPositions);
    if (onQuestionsReordered) onQuestionsReordered(reorderedWithPositions);
    else reorderedWithPositions.forEach((item) => onQuestionUpdated(item));
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
    });
    answerKeyEditRevisionRef.current += 1;
    setAnswerKeyVerified(false);
    setAnswerConfidence("unrated");
    setConfidenceNote("");
    setEvidenceReference("");
    if (correctAnswer === options[idx]?.label) {
      setCorrectAnswer("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => { if (!saving) { setMode(null); onClose(); } }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                {mode === "add" ? "Add New Question" : mode === "edit" ? "Edit Question" : "Question Manager"}
              </h2>
              <div className="flex items-center gap-2">
                {mode === "edit" && editingQuestion && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => { if (!saving) { setMode(null); onClose(); } }}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {confirmDelete ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Remove this question from the active JAMB bank?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This hides the question from learners while preserving approved answer keys and historical CBT attempt records.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Removing..." : "Remove Question"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : mode ? (
                <>
                  {error && (
                    <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {savedDraftMessage && (
                    <div role="status" className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-800 dark:text-emerald-300">
                      {savedDraftMessage}
                    </div>
                  )}

                  {includeReviewQueue && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-relaxed">
                      <p className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        Unverified draft answer key
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        The saved answer and explanation are review drafts and may include assistant-generated content. Check the question, every option, the source reference and the answer against a reliable permitted source. Do not approve by relying on the saved suggestion alone. This question stays hidden from learners until all required checks are completed.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Question Images
                      <span className="text-muted-foreground/50 font-normal">(optional · multiple images)</span>
                    </label>

                    {images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        {images.map((image, index) => (
                          <div key={image.id} className="relative rounded-xl overflow-hidden border bg-muted/30">
                            <img
                              src={image.url}
                              alt={"Question image " + (index + 1)}
                              className="w-full h-32 object-contain"
                            />
                            <div className="absolute top-1.5 left-1.5 rounded-md bg-black/65 px-2 py-0.5 text-[10px] text-white">
                              Image {index + 1}{image.file ? " · pending upload" : ""}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/65 text-white hover:bg-red-600 transition-colors"
                              title={"Remove image " + (index + 1)}
                              aria-label={"Remove image " + (index + 1)}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary"); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-primary");
                        if (e.dataTransfer.files.length) handleImageSelect(e.dataTransfer.files);
                      }}
                      className="border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                    >
                      <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">
                        {images.length ? "Add more images" : "Click or drag images here"}
                      </p>
                      <p className="text-xs text-muted-foreground/50 mt-1">
                        Select multiple JPEG, PNG, WebP or GIF files · Max 5 MB each
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.currentTarget.files?.length) handleImageSelect(e.currentTarget.files);
                        e.currentTarget.value = "";
                      }}
                    />

                    {images.length > 0 && (
                      <div className="mt-3">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Image Layout
                        </label>
                        <select
                          value={isInlineImagePosition(imagePosition) ? "image-inline" : imagePosition}
                          onChange={e => {
                            const value = e.target.value;
                            if (value === "image-inline") {
                              setImagePosition(createInlineImagePosition(0));
                              setShowPreview(true);
                            } else {
                              setImagePosition(value);
                            }
                          }}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="image-only">Images Only</option>
                          <option value="text-only">Text Only</option>
                          <option value="image-above">Images Above Text</option>
                          <option value="image-beside">First Image Beside Text</option>
                          <option value="image-inline">First Image Inline Within Question Text</option>
                        </select>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Image order is preserved. Inline positioning applies to the first image; additional images follow it.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Question Text <span className="text-muted-foreground/50 font-normal">(optional fallback)</span>
                    </label>
                    <textarea
                      value={questionText}
                      onChange={e => {
                        answerKeyEditRevisionRef.current += 1;
                        setQuestionText(e.target.value);
                        setAnswerKeyVerified(false);
                        setAnswerConfidence("unrated");
                        setConfidenceNote("");
                        setEvidenceReference("");
                      }}
                      rows={3}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Type the question text, or leave blank if using an image..."
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Press Enter to create line breaks. Each line break becomes a snap point for inline image placement.
                    </p>
                  </div>

                  {isObjective && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">Options</label>
                        <button
                          onClick={addOption}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {opt.label}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => updateOption(idx, e.target.value)}
                              className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder={`Option ${opt.label}`}
                            />
                            {options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
                      <input
                        type="text"
                        value={correctAnswer}
                        onChange={e => {
                          answerKeyEditRevisionRef.current += 1;
                          setCorrectAnswer(e.target.value.toUpperCase());
                          setAnswerKeyVerified(false);
                          setAnswerConfidence("unrated");
                          setConfidenceNote("");
                          setEvidenceReference("");
                        }}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={isObjective ? "e.g. A, B, C, D" : "e.g. A"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                      <ListOrdered className="h-3 w-3" /> Question Number
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Position in list (0 = first)"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic / Course</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. chm-atomic, chm-bonding"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Source document / publication</label>
                      <input
                        type="text"
                        value={sourceDocument}
                        onChange={(event) => {
                          setSourceDocument(event.target.value);
                          setRightsConfirmed(false);
                          setAnswerKeyVerified(false);
                          setAnswerConfidence("unrated");
                          setConfidenceNote("");
                          setEvidenceReference("");
                        }}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Document title or original file name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Source reference</label>
                      <input
                        type="text"
                        value={sourceReference}
                        onChange={(event) => {
                          setSourceReference(event.target.value);
                          setRightsConfirmed(false);
                          setAnswerKeyVerified(false);
                          setAnswerConfidence("unrated");
                          setConfidenceNote("");
                          setEvidenceReference("");
                        }}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="e.g. 2024:Q12"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Source PDF page</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={sourcePage}
                        onChange={(event) => {
                          setSourcePage(event.target.value);
                          setRightsConfirmed(false);
                          setAnswerKeyVerified(false);
                          setAnswerConfidence("unrated");
                          setConfidenceNote("");
                          setEvidenceReference("");
                        }}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="e.g. 24"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Source-use permission / rights note</label>
                    <textarea
                      value={rightsNote}
                      onChange={(event) => { setRightsNote(event.target.value); setRightsConfirmed(false); }}
                      rows={2}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Record why this source may be used in this question bank..."
                    />
                  </div>
                  <label className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3 text-xs leading-relaxed">
                    <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-0.5 accent-primary" />
                    <span>I confirm that the source-use permission is documented and this question is authorised for the JAMB bank.</span>
                  </label>
                  <label className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3 text-xs leading-relaxed">
                    <input type="checkbox" checked={answerKeyVerified} onChange={(event) => setAnswerKeyVerified(event.target.checked)} className="mt-0.5 accent-primary" />
                    <span>I independently checked the selected correct option and explanation against a reliable answer source. This answer key may be used for student feedback and scored CBT only after approval.</span>
                  </label>

                  {includeReviewQueue && mode === "edit" && (
                    <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Answer draft confidence</p>
                        <span className="text-[11px] text-muted-foreground">Draft v{draftVersion}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These fields are saved without changing the question text, options, source record, publication state or learner visibility.
                      </p>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Confidence level</label>
                        <select
                          value={answerConfidence}
                          onChange={(event) => setAnswerConfidence(event.target.value as "unrated" | "low" | "medium" | "high")}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="unrated">Choose confidence</option>
                          <option value="low">Low — tentative or incomplete evidence</option>
                          <option value="medium">Medium — supported, but source context is incomplete</option>
                          <option value="high">High — directly supported or independently calculated</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Why this confidence level?</label>
                        <textarea
                          value={confidenceNote}
                          onChange={(event) => setConfidenceNote(event.target.value)}
                          rows={2}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                          placeholder="State what evidence supports or limits this answer..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Evidence / calculation reference (optional)</label>
                        <input
                          type="text"
                          value={evidenceReference}
                          onChange={(event) => setEvidenceReference(event.target.value)}
                          maxLength={2000}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="e.g. Physics.txt · 2012:Q15 · k = F/x"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Saving this draft does not certify source-use rights or approve the answer. The question remains hidden and the key remains needs_review.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Explanation</label>
                    <textarea
                      value={explanation}
                      onChange={e => {
                        answerKeyEditRevisionRef.current += 1;
                        setExplanation(e.target.value);
                        setAnswerKeyVerified(false);
                        setAnswerConfidence("unrated");
                        setConfidenceNote("");
                        setEvidenceReference("");
                      }}
                      rows={3}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Explain why the correct answer is right..."
                    />
                  </div>

                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <button
                      onClick={() => setShowPreview(v => !v)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {showPreview ? "Hide app preview" : "Preview as a student"}
                    </button>
                    {showPreview && (
                      <div className="px-3 pb-3 pt-2 border-t border-border/50 bg-card/50 space-y-2">
                        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-background p-4 space-y-4">
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wide">Student view</span>
                            <span className="capitalize">{category} · {year}</span>
                          </div>

                          <div className="space-y-2">
                            {images.length > 0 && imagePosition !== "text-only" && (
                              <>
                                {isInlineImagePosition(imagePosition) ? (
                                  <QuestionImagePositioner
                                    content={questionText}
                                    imageSrc={images[0].url}
                                    imagePosition={imagePosition}
                                    onPositionChange={setImagePosition}
                                  />
                                ) : imagePosition === "image-beside" ? (
                                  <>
                                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    <div className="sm:w-1/2 shrink-0">
                                      <img src={images[0].url} alt="Question preview" className="w-full max-h-64 object-contain rounded-xl border bg-muted/30" />
                                    </div>
                                    {questionText.trim() && (
                                      <QuestionMath content={questionText} className="text-base font-medium leading-relaxed sm:w-1/2" />
                                    )}
                                  </div>
                                  {images.length > 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {images.slice(1).map((image, index) => (
                                        <img key={image.id} src={image.url} alt={"Additional question preview " + (index + 2)} className="w-full max-h-64 object-contain rounded-xl border bg-muted/30" />
                                      ))}
                                    </div>
                                  )}
                                  </>
                                ) : (
                                  <div className="space-y-2">
                                    {images.map((image, index) => (
                                      <img
                                        key={image.id}
                                        src={image.url}
                                        alt={"Question preview " + (index + 1)}
                                        className="w-full max-h-64 object-contain rounded-xl border bg-muted/30"
                                      />
                                    ))}
                                    {imagePosition !== "image-only" && questionText.trim() && (
                                      <QuestionMath content={questionText} className="text-base font-medium leading-relaxed" />
                                    )}
                                  </div>
                                )}
                                {isInlineImagePosition(imagePosition) && images.length > 1 && (
                                  <div className="space-y-2">
                                    {images.slice(1).map((image, index) => (
                                      <img key={image.id} src={image.url} alt={"Additional question image " + (index + 2)} className="w-full max-h-64 object-contain rounded-xl border bg-muted/30" />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            {(images.length === 0 || imagePosition === "text-only") && questionText.trim() && (
                              <QuestionMath content={questionText} className="text-base font-medium leading-relaxed" />
                            )}
                          </div>

                          {isObjective && options.filter(o => o.text.trim()).length > 0 && (
                            <div className="space-y-2 pt-1">
                              {options.filter(o => o.text.trim()).map(opt => (
                                <div key={opt.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-sm">
                                  <span className="shrink-0 w-7 h-7 rounded-full border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                    {opt.label}
                                  </span>
                                  <QuestionMath content={opt.text} inline className="flex-1 min-w-0" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {isInlineImagePosition(imagePosition) && (
                          <p className="max-w-xl mx-auto text-[11px] text-muted-foreground">
                            Drag the image to the line where it belongs. The position is saved when you press Save below.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {includeReviewQueue
                      ? "Select a pending question to inspect its saved draft answer and explanation. It remains hidden from students until all review checks pass."
                      : "Select a published question to edit, or add a new one."}
                  </p>
                  {includeReviewQueue && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
                      Pending questions are visible here to administrators only. Saving one publishes it only after a fresh source-rights attestation, a verified answer and a meaningful explanation.
                    </div>
                  )}

                  {managerQuestions.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {managerQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          draggable={!includeReviewQueue && q.reviewStatus === "published"}
                          onDragStart={() => {
                            if (!includeReviewQueue && q.reviewStatus === "published") dragItem.current = idx;
                          }}
                          onDragEnter={() => {
                            if (!includeReviewQueue && q.reviewStatus === "published") dragOverItem.current = idx;
                          }}
                          onDragEnd={handleDragSort}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex items-center gap-1 group"
                        >
                          {!includeReviewQueue && (
                            <button
                              className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                              title="Drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              loadQuestion(q);
                              setMode("edit");
                            }}
                            className="flex-1 flex items-start gap-2 p-3 rounded-xl border bg-card hover:bg-accent/50 text-left transition-all active:scale-[0.98]"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {q.sortOrder != null ? q.sortOrder : idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              {q.imageUrl ? (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="italic">Image question</span>
                                </div>
                              ) : (
                                <p className="text-sm line-clamp-2">{q.question}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="capitalize">{q.category}</span>
                                {q.reviewStatus && q.reviewStatus !== "published" && (
                                  <>
                                    <span className="text-muted-foreground/40">&middot;</span>
                                    <span className="rounded-md border border-amber-500/30 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
                                      {q.reviewStatus} · hidden
                                    </span>
                                  </>
                                )}
                                {q.correctAnswer && (
                                  <>
                                    <span className="text-muted-foreground/40">&middot;</span>
                                    <span className={q.answerKeyVerified ? "font-mono text-green-600 dark:text-green-400" : "font-mono text-amber-700 dark:text-amber-400"}>
                                      {q.answerKeyVerified ? "Ans:" : "Draft answer:"} {q.correctAnswer}
                                    </span>
                                  </>
                                )}
                                {q.difficulty && (
                                  <>
                                    <span className="text-muted-foreground/40">&middot;</span>
                                    <span className="capitalize">{q.difficulty}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {question && (
                      <Button onClick={handleEdit} variant="default" size="sm">
                        Edit Current Question
                      </Button>
                    )}
                    <Button onClick={handleAdd} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add New Question
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {mode && !confirmDelete && (
              <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
                {includeReviewQueue && mode === "edit" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSaveAnswerDraft()}
                    disabled={saving || uploadingImage}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save answer draft only"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setMode(null); onClose(); }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || uploadingImage || (includeReviewQueue && mode === "edit" && !answerKeyVerified)}
                  className="flex items-center gap-1"
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {uploadingImage ? "Uploading image..." : saving ? "Saving..." : includeReviewQueue && mode === "edit" ? "Save & publish verified" : "Save"}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      {cropImageUrl && (
        <ImageCropper
          image={cropImageUrl}
          fileName={cropFileName}
          onCropComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </AnimatePresence>
  );
}
