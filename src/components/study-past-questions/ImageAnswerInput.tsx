import { useState, useCallback, useRef } from "react";
import { Camera, Upload, Send, X, Loader2, FileText, Bot, ImagePlus } from "lucide-react";
import { useImageUpload, type ImageItem } from "@/hooks/useImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { StudyQuestion } from "@/types/study-questions";
import { motion, AnimatePresence } from "framer-motion";
import { TheoryAnswerFeedback, type EvalData } from "./TheoryAnswerFeedback";

interface ImageAnswerInputProps {
  question: StudyQuestion;
  questionId: string;
  subject: string;
  year?: number;
  onSubmit: (text: string) => void;
  onUnsubmit?: () => void;
  disabled?: boolean;
}

export function ImageAnswerInput({
  question, questionId, subject, year, onSubmit, onUnsubmit, disabled,
}: ImageAnswerInputProps) {
  const { user } = useAuth();
  const {
    images, uploading, showCamera, videoRef,
    fileInputRef, startCamera, stopCamera, captureFrame,
    handleFileInput, handlePickImage, addImage, removeImage, uploadAll, reset,
  } = useImageUpload(user?.id);

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const lastFeedbackRef = useRef("");
  const lastEvalRef = useRef<EvalData | null>(null);
  const attachmentsRef = useRef<{ base64: string; mimeType: string; name: string }[]>([]);

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const buildAttachments = async (): Promise<{ base64: string; mimeType: string; name: string }[]> => {
    const result: { base64: string; mimeType: string; name: string }[] = [];
    for (const item of images) {
      const base64 = await fileToBase64(item.file);
      result.push({ base64, mimeType: item.file.type, name: item.file.name });
    }
    return result;
  };

  const handleSubmit = useCallback(async () => {
    if (!text.trim() && !images.length) return;
    setSubmitting(true);
    try {
      const [atts, urls] = await Promise.all([
        buildAttachments(),
        images.length > 0 ? uploadAll() : Promise.resolve([] as string[]),
      ]);
      attachmentsRef.current = atts;
      const answerText = text.trim() || "[Images submitted]";
      setSubmittedAnswer(answerText);
      setSubmitted(true);
      setShowFeedback(true);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setSubmitted(true);
      setSubmittedAnswer(text.trim() || "[Images submitted]");
    } finally {
      setSubmitting(false);
    }
  }, [text, images, uploadAll]);

  const handleFeedbackComplete = useCallback((evalData: EvalData, feedbackContent: string) => {
    lastFeedbackRef.current = feedbackContent;
    lastEvalRef.current = evalData;
    onSubmit(submittedAnswer);
    setShowFeedback(false);

    if (user?.id) {
      supabase.from("answer_markings").insert({
        user_id: user.id,
        question_id: questionId,
        subject,
        year: year ?? null,
        answer_text: submittedAnswer,
        score: evalData.score,
        feedback: "See AI evaluation in study session",
        strengths: evalData.strengths.join("\n"),
        weaknesses: evalData.weaknesses.join("\n"),
        corrections: evalData.corrections,
      }).then(() => {}).catch((err) => {
        console.warn("Background marking save failed (non-blocking):", err);
      });
    }
  }, [onSubmit, submittedAnswer, user, questionId, subject, year]);

  const handleRetry = useCallback(() => {
    setSubmitted(false);
    setShowFeedback(false);
    setShowReview(false);
    setSubmittedAnswer("");
    reset();
    onUnsubmit?.();
  }, [reset, onUnsubmit]);

  if (showReview && lastEvalRef.current) {
    return (
      <TheoryAnswerFeedback
        question={question}
        userAnswer={submittedAnswer}
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        initialContent={lastFeedbackRef.current}
        initialEvalData={lastEvalRef.current}
      />
    );
  }

  if (showFeedback) {
    return (
      <TheoryAnswerFeedback
        question={question}
        userAnswer={submittedAnswer}
        imageAttachments={attachmentsRef.current}
        isOpen={showFeedback}
        onClose={handleRetry}
        onRetry={handleRetry}
        onComplete={handleFeedbackComplete}
      />
    );
  }

  if (submitted) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          Answer submitted
        </div>
        {lastEvalRef.current && (
          <button
            onClick={() => setShowReview(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg"
          >
            <Bot className="w-3 h-3" />
            View AI Feedback
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer... (or upload images)"
          rows={4}
          className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          disabled={disabled}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <button
            type="button"
            onClick={handlePickImage}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Attach images"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Take photo"
          >
            <Camera className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border bg-black"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-contain" />
            <div className="flex justify-center gap-2 p-2 bg-black/50">
              <button
                onClick={captureFrame}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-white text-black hover:bg-white/90"
              >
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {images.map((item, i) => (
              <div
                key={`${item.file.name}-${i}`}
                className="relative rounded-xl overflow-hidden border aspect-square bg-muted/30"
              >
                {item.file.type.startsWith("image/") ? (
                  <img src={item.preview} alt={`Work ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <FileText className="h-6 w-6 text-primary/70" />
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">{item.file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/50 text-white">
                  {i+1}
                </span>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={handlePickImage}
                className="rounded-xl border border-dashed border-white/20 hover:border-primary/40 aspect-square flex flex-col items-center justify-center gap-1 transition-colors bg-muted/10 hover:bg-muted/20"
              >
                <ImagePlus className="h-5 w-5 text-muted-foreground/60" />
                <span className="text-[10px] text-muted-foreground/60">Add more</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {images.length > 0 ? `${images.length}/3 file${images.length > 1 ? 's' : ''} attached` : "Attach photos of written work (max 3)"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={(!text.trim() && !images.length) || submitting || disabled}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-[0.97]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Submitting..." : "Submit & Mark"}
        </button>
      </div>
    </div>
  );
}
