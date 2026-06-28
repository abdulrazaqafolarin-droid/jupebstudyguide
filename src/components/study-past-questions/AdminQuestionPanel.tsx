import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Plus, AlertTriangle, GripVertical, ListOrdered, ImageIcon, Upload, XCircle, Loader2, Eye, ChevronLeft, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import type { Subject } from "@/types/question";
import { addQuestion, updateQuestion, deleteQuestion, generateQuestionId, batchUpdateSortOrder, uploadQuestionImage, deleteQuestionImage } from "@/lib/admin-questions-service";
import { refreshData } from "@/data/study-questions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageCropper } from "./ImageCropper";
import { processMathText } from "@/lib/process-math";
import { PreviewMath } from "@/components/PreviewMath";
import { analyzeQuestionWithAI } from "@/lib/ai-question-analyzer";
import { useBatchAnalysis } from "@/contexts/BatchAnalysisContext";

interface AdminQuestionPanelProps {
  question: StudyQuestion | null;
  questions?: StudyQuestion[];
  subject: Subject;
  year: number;
  category: StudyCategory;
  onQuestionUpdated: (question: StudyQuestion) => void;
  onQuestionDeleted: (id: string) => void;
  onQuestionAdded: (question: StudyQuestion) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface OptionEntry {
  label: string;
  text: string;
}

type Mode = "edit" | "add" | null;

export function AdminQuestionPanel({
  question,
  questions,
  subject,
  year,
  category,
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionAdded,
  isOpen,
  onClose,
}: AdminQuestionPanelProps) {
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePosition, setImagePosition] = useState<string>("image-only");
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>("");
  const [editingQuestion, setEditingQuestion] = useState<StudyQuestion | null>(null);
  const [listDeleteId, setListDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const isObjective = category === "objective";

  const currentIndex = useMemo(() => {
    if (!editingQuestion || !questions) return -1;
    return questions.findIndex(q => q.id === editingQuestion.id);
  }, [editingQuestion, questions]);

  useEffect(() => {
    if (!isOpen) {
      setMode(null);
      setConfirmDelete(false);
      setError(null);
    }
  }, [isOpen]);

  const loadQuestion = useCallback((q: StudyQuestion) => {
    setEditingQuestion(q);
    setQuestionText(q.question || "");
    setImageUrl(q.imageUrl || null);
    setImagePreview(null);
    setImageFile(null);
    setImagePosition(q.imagePosition || "image-only");
    setOptions(q.options ? q.options.map(o => ({ label: o.label, text: o.text })) : []);
    setCorrectAnswer(q.correctAnswer || "");
    setExplanation(q.explanation || "");
    setDifficulty(q.difficulty || "medium");
    setTopic(q.topic || "");
    setSortOrder(q.sortOrder != null ? String(q.sortOrder) : "0");
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setEditingQuestion(null);
    setQuestionText("");
    setImageUrl(null);
    setImagePreview(null);
    setImageFile(null);
    setImagePosition("image-only");
    setOptions(isObjective ? [{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }] : []);
    setCorrectAnswer("");
    setExplanation("");
    setDifficulty("medium");
    setTopic("");
    setSortOrder(String(questions ? questions.length : 0));
    setError(null);
  }, [isObjective, questions]);

  useEffect(() => {
    if (mode === "edit" && question) {
      loadQuestion(question);
    } else if (mode === "add") {
      resetForm();
    }
  }, [mode, question, loadQuestion, resetForm]);

  const handleEdit = () => {
    if (!question) return;
    setMode("edit");
    loadQuestion(question);
  };

  const handleAdd = () => {
    setMode("add");
    resetForm();
  };

  const prevObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed (JPEG, PNG, WebP, GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5 MB");
      return;
    }
    setCropFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCropImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], cropFileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    prevObjectUrl.current = URL.createObjectURL(croppedFile);
    setImageFile(croppedFile);
    setImagePreview(prevObjectUrl.current);
    setImageUrl(null);
    setCropImageUrl(null);
    setCropFileName("");
  }, [cropFileName]);

  const handleSkipCrop = useCallback((originalBlob: Blob) => {
    const originalFile = new File([originalBlob], cropFileName, { type: originalBlob.type });
    if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    prevObjectUrl.current = URL.createObjectURL(originalFile);
    setImageFile(originalFile);
    setImagePreview(prevObjectUrl.current);
    setImageUrl(null);
    setCropImageUrl(null);
    setCropFileName("");
  }, [cropFileName]);

  const handleListDelete = async (qId: string) => {
    setDeletingId(qId);
    setError(null);
    try {
      const result = await deleteQuestion(qId);
      if (!result.success) {
        setError(result.error || "Failed to delete question");
        setDeletingId(null);
        setListDeleteId(null);
        return;
      }
      await deleteQuestionImage(qId).catch(() => {});
      setDeletingId(null);
      setListDeleteId(null);
      onQuestionDeleted(qId);
      refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeletingId(null);
      setListDeleteId(null);
    }
  };

  const handleCancelCrop = useCallback(() => {
    setCropImageUrl(null);
    setCropFileName("");
  }, []);

  const handleEditImage = useCallback(async () => {
    const src = imagePreview || imageUrl;
    if (!src) return;
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      setCropFileName(blob.type.startsWith("image/") ? `image.${blob.type.split("/")[1] || "jpg"}` : "image.jpg");
      const reader = new FileReader();
      reader.onload = () => setCropImageUrl(reader.result as string);
      reader.readAsDataURL(blob);
    } catch {
      setError("Failed to load image for editing");
    }
  }, [imagePreview, imageUrl]);

  const handleRemoveImage = () => {
    if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    prevObjectUrl.current = null;
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleAnalyze = async () => {
    if (!questionText.trim()) {
      setError("Question text is required for AI analysis");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      // Step 1: KaTeXify question text and options
      const katexQuestion = processMathText(questionText);
      let katexOptions: { label: string; text: string }[] | null = null;
      if (isObjective && options.length > 0) {
        katexOptions = options.map(o => ({ label: o.label, text: processMathText(o.text) }));
      }
      setQuestionText(katexQuestion);
      if (katexOptions) setOptions(katexOptions);

      // Step 2: Send to AI for review, answer check, topic, explanation
      const result = await analyzeQuestionWithAI(
        katexQuestion,
        katexOptions || options,
        correctAnswer,
        topic,
        category,
      );

      // Apply AI fixes to question text if needed
      if (result.katexFixed && result.katexFixed !== katexQuestion && !/^\s*[{[]/.test(result.katexFixed)) {
        setQuestionText(result.katexFixed);
      }

      // Show KaTeX validation warnings if any
      if (result.katexErrors && result.katexErrors.length > 0) {
        setError("KaTeX warning: " + result.katexErrors[0] + (result.katexErrors.length > 1 ? ` (+${result.katexErrors.length - 1} more)` : ""));
      }

      // Apply AI fixes to options if needed
      if (result.optionsFixed && result.optionsFixed.length > 0 && isObjective) {
        setOptions(result.optionsFixed);
      }

      // Set correct answer
      if (result.correctAnswer) {
        setCorrectAnswer(result.correctAnswer);
      }

      // Set topic if AI detected it
      if (result.topic) {
        setTopic(result.topic);
      }

      // Set explanation (guard against raw JSON leak)
      if (result.explanation && !/^\s*[{[]/.test(result.explanation)) {
        if (result.explanation.startsWith("AI analysis failed") || result.explanation.startsWith("Unable to generate")) {
          setError(result.explanation);
        } else {
          setExplanation(result.explanation);
        }
      }

      setShowPreview(true);
    } catch (err) {
      setError("AI analysis failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAnalyzing(false);
    }
  };

  const { addToQueue, queue: batchQueue } = useBatchAnalysis();

  const handleBatchAnalyze = () => {
    if (!questions || questions.length === 0) {
      setError("No questions to analyze");
      return;
    }
    setError(null);
    addToQueue(subject, year, category);
  };

  const handleSave = async () => {
    if (!questionText.trim() && !imageFile && !imageUrl) {
      setError("Question text or an image is required");
      return;
    }
    if (isObjective) {
      const validOptions = options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        setError("At least 2 options are required");
        return;
      }
      if (!correctAnswer.trim()) {
        setError("Correct answer is required");
        return;
      }
      const normalizedAnswer = correctAnswer.trim().toUpperCase();
      if (normalizedAnswer !== "TBD") {
        const validLabels = validOptions.map(o => o.label);
        if (!validLabels.includes(normalizedAnswer)) {
          setError(`Correct answer must be one of: ${validLabels.join(", ")}`);
          return;
        }
      }
    }

    const qId = mode === "edit" && editingQuestion ? editingQuestion.id : generateQuestionId(subject, year, category);
    const existingImageUrl = mode === "edit" && editingQuestion ? editingQuestion.imageUrl : undefined;

    setError(null);

    try {
      setSaving(true);
      setUploadingImage(!!imageFile);
      let resolvedImageUrl = imageUrl;

      if (imageFile) {
        if (existingImageUrl) {
          const delResult = await deleteQuestionImage(qId);
          if (!delResult.success) console.error("Delete old image failed:", delResult.error);
        }
        const uploadResult = await uploadQuestionImage(qId, imageFile);
        if (!uploadResult.success) {
          setError(uploadResult.error || "Failed to upload image");
          return;
        }
        resolvedImageUrl = uploadResult.url!;
      }

      if (mode === "edit" && editingQuestion) {
        console.log("Saving edit: imageUrl state:", imageUrl, "imageFile:", !!imageFile, "resolvedImageUrl:", resolvedImageUrl);
        const result = await updateQuestion({
          id: qId,
          subject: editingQuestion.subject,
          year: editingQuestion.year,
          category: editingQuestion.category,
          question: questionText.trim() || resolvedImageUrl || "",
          options: isObjective ? options.filter(o => o.text.trim()) : null,
          correctAnswer: correctAnswer.trim().toUpperCase() || null,
          explanation: explanation.trim() || null,
          difficulty,
          topic: topic.trim() || null,
          sortOrder: parseInt(sortOrder) || 0,
          imageUrl: resolvedImageUrl,
          imagePosition: imagePosition,
        });

        if (!result.success) {
          setError(result.error || "Failed to update question");
          return;
        }

        const updated: StudyQuestion = {
          ...editingQuestion,
          question: questionText.trim() || resolvedImageUrl || "",
          options: isObjective ? options.filter(o => o.text.trim()) : undefined,
          correctAnswer: correctAnswer.trim().toUpperCase() || undefined,
          explanation: explanation.trim() || undefined,
          difficulty: difficulty as "easy" | "medium" | "hard",
          topic: topic.trim() || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          imageUrl: resolvedImageUrl || undefined,
          imagePosition: imagePosition as StudyQuestion["imagePosition"],
        };
        onQuestionUpdated(updated);

        if (!imageFile && imageUrl === null && existingImageUrl) {
          const delResult = await deleteQuestionImage(qId);
          if (!delResult.success) console.error("Delete image failed:", delResult.error);
        }
      } else if (mode === "add") {
        const result = await addQuestion({
          id: qId,
          subject,
          year,
          category,
          question: questionText.trim() || resolvedImageUrl || "",
          options: isObjective ? options.filter(o => o.text.trim()) : null,
          correctAnswer: correctAnswer.trim().toUpperCase() || null,
          explanation: explanation.trim() || null,
          difficulty,
          topic: topic.trim() || null,
          sortOrder: parseInt(sortOrder) || 0,
          imageUrl: resolvedImageUrl,
          imagePosition: imagePosition,
        });

        if (!result.success) {
          setError(result.error || "Failed to add question");
          return;
        }

        const added: StudyQuestion = {
          id: qId,
          subject,
          year,
          category,
          question: questionText.trim() || resolvedImageUrl || "",
          options: isObjective ? options.filter(o => o.text.trim()) : undefined,
          correctAnswer: correctAnswer.trim().toUpperCase() || undefined,
          explanation: explanation.trim() || undefined,
          difficulty: difficulty as "easy" | "medium" | "hard",
          topic: topic.trim() || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          imageUrl: resolvedImageUrl || undefined,
          imagePosition: imagePosition as StudyQuestion["imagePosition"],
        };
        onQuestionAdded(added);
      } else {
        if (mode === "edit" && !editingQuestion) {
          setError("Cannot save: question data not loaded. Try again.");
          return;
        }
      }

      refreshData();
      setMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!editingQuestion) return;
    setError(null);

    try {
      setSaving(true);
      const result = await deleteQuestion(editingQuestion.id);
      if (!result.success) {
        setError(result.error || "Failed to delete question");
        return;
      }

      await deleteQuestionImage(editingQuestion.id).catch(() => {});
      onQuestionDeleted(editingQuestion.id);
      setMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleDragSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null || !questions) return;
    if (dragItem.current === dragOverItem.current) return;
    const reordered = [...questions];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    const updates = reordered.map((q, i) => ({ id: q.id, sort_order: i }));
    const result = await batchUpdateSortOrder(updates);
    if (!result.success) {
      setError(result.error || "Failed to reorder questions");
      return;
    }
    dragItem.current = null;
    dragOverItem.current = null;
    refreshData();
  };

  const updateOption = (idx: number, text: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o));
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions(prev => [...prev, { label: nextLabel, text: "" }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
    });
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
                {mode === "add" ? "Add New Question" : "Edit Question"}
              </h2>
              {mode === "edit" && questions && questions.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (currentIndex > 0) loadQuestion(questions[currentIndex - 1]);
                    }}
                    disabled={currentIndex <= 0}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="Previous question"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums min-w-[4ch] text-center">
                    {currentIndex + 1}/{questions.length}
                  </span>
                  <button
                    onClick={() => {
                      if (currentIndex < questions.length - 1) loadQuestion(questions[currentIndex + 1]);
                    }}
                    disabled={currentIndex >= questions.length - 1}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="Next question"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {mode === "edit" && question && (
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
                    <span>Delete this question permanently?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will remove the question from the database for ALL users.
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Deleting..." : "Delete Forever"}
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

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Question Image
                      <span className="text-muted-foreground/50 font-normal">(optional)</span>
                    </label>

                    {(imagePreview || imageUrl) && (
                      <div className="relative mb-2 rounded-xl overflow-hidden border bg-muted/30 group">
                        <img
                          src={imagePreview || imageUrl}
                          alt="Question preview"
                          className="w-full max-h-64 object-contain cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                            title="Replace image"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleEditImage}
                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                            title="Edit image"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
                          <button
                            onClick={handleRemoveImage}
                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                            title="Remove image"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!imagePreview && !imageUrl && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-primary');
                          const file = e.dataTransfer.files[0];
                          if (file) handleImageSelect(file);
                        }}
                        className="border-2 border-dashed rounded-xl px-4 py-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="text-sm text-muted-foreground">
                          Click or drag an image here
                        </p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          JPEG, PNG, WebP, GIF &middot; Max 5 MB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file);
                      }}
                    />

                    {(imagePreview || imageUrl) && (
                      <div className="mt-3">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Image Layout
                        </label>
                        <select
                          value={imagePosition}
                          onChange={e => setImagePosition(e.target.value)}
                          className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="image-only">Image Only</option>
                          <option value="text-only">Text Only</option>
                          <option value="image-above">Image Above Text</option>
                          <option value="image-beside">Image Beside Text</option>
                        </select>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Controls how the image and question text are displayed together.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Question Text <span className="text-muted-foreground/50 font-normal">(optional fallback)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPreview(v => !v)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                    </div>
                    <textarea
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      rows={3}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Type the question text, or leave blank if using an image..."
                    />
                    {showPreview && (
                      <div className="mt-2 p-3 rounded-xl bg-muted/30 border">
                        <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">Rendered Preview</div>
                        <PreviewMath content={questionText} />
                      </div>
                    )}
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
                          <div key={idx} className="flex items-start gap-2">
                            <span className="shrink-0 mt-2 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {opt.label}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={e => updateOption(idx, e.target.value)}
                                  className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder={`Option ${opt.label}`}
                                />

                              </div>
                              {showPreview && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  <PreviewMath content={opt.text} />
                                </div>
                              )}
                            </div>
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
                        onChange={e => setCorrectAnswer(e.target.value.toUpperCase())}
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground">Explanation</label>
                    </div>
                    <textarea
                      value={explanation}
                      onChange={e => setExplanation(e.target.value)}
                      rows={3}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Explain why the correct answer is right..."
                    />
                    {showPreview && (
                      <div className="mt-2 p-3 rounded-xl bg-muted/30 border">
                        <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">Rendered Preview</div>
                        <PreviewMath content={explanation} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {error && (
                    <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Select a question to edit, or add a new one.
                  </p>

                  {questions && questions.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          draggable
                          onDragStart={() => { dragItem.current = idx; }}
                          onDragEnter={() => { dragOverItem.current = idx; }}
                          onDragEnd={handleDragSort}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex items-center gap-1 group"
                        >
                          <button
                            className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
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
                                {q.correctAnswer && (
                                  <>
                                    <span className="text-muted-foreground/40">&middot;</span>
                                    <span className="font-mono text-green-600 dark:text-green-400">Ans: {q.correctAnswer}</span>
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
                          {listDeleteId === q.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleListDelete(q.id)}
                                disabled={deletingId === q.id}
                                className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                              >
                                {deletingId === q.id ? "..." : "Delete"}
                              </button>
                              <button
                                onClick={() => setListDeleteId(null)}
                                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setListDeleteId(q.id)}
                              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                              title="Delete question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {questions && questions.length > 1 && (
                      <Button
                        onClick={handleBatchAnalyze}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1.5"
                        title="Run AI analysis on all questions in this year"
                        disabled={batchQueue.some(i =>
                          i.subject === subject && i.year === year && i.category === category
                          && (i.status === 'queued' || i.status === 'processing')
                        )}
                      >
                        {batchQueue.some(i =>
                          i.subject === subject && i.year === year && i.category === category
                          && (i.status === 'queued' || i.status === 'processing')
                        ) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        {batchQueue.some(i =>
                          i.subject === subject && i.year === year && i.category === category
                          && (i.status === 'queued' || i.status === 'processing')
                        ) ? "In Queue" : `Analyze All (${questions.length})`}
                      </Button>
                    )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setMode(null); onClose(); }}
                  disabled={saving || analyzing}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzing || saving || !questionText.trim()}
                  className="flex items-center gap-1.5"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z"/>
                      <path d="M12 17v2"/>
                      <path d="M10 22h4"/>
                    </svg>
                  )}
                  {analyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || uploadingImage || analyzing}
                  className="flex items-center gap-1"
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {uploadingImage ? "Uploading image..." : saving ? "Saving..." : "Save"}
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
