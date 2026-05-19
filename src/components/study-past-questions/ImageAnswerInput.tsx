import { useState, useCallback } from "react";
import { Camera, Upload, Send, X, Check, Loader2, Award } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { markAnswer } from "@/lib/marking-service";
import type { StudyQuestion } from "@/types/study-questions";
import type { MarkingResult } from "@/lib/marking-service";
import { motion, AnimatePresence } from "framer-motion";

interface ImageAnswerInputProps {
  question: StudyQuestion;
  questionId: string;
  subject: string;
  year?: number;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function ImageAnswerInput({
  question, questionId, subject, year, onSubmit, disabled,
}: ImageAnswerInputProps) {
  const { user } = useAuth();
  const {
    image, preview, uploading, showCamera, videoRef,
    fileInputRef, startCamera, stopCamera, captureFrame,
    handleFileInput, handlePickImage, upload, reset,
  } = useImageUpload(user?.id);

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState<MarkingResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() && !image) return;
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await upload();
      }

      const answerText = text.trim() || "[Image submitted]";

      const result = await markAnswer(question, answerText, imageUrl ? "Image uploaded" : undefined);

      setMarking(result);
      setSubmitted(true);
      onSubmit(answerText);

      if (user?.id) {
        await supabase.from("answer_markings").insert({
          user_id: user.id,
          question_id: questionId,
          subject,
          year: year ?? null,
          answer_text: answerText,
          image_url: imageUrl,
          score: result.score,
          feedback: result.feedback,
          strengths: result.strengths.join("\n"),
          weaknesses: result.weaknesses.join("\n"),
          corrections: result.corrections,
        });
      }
    } catch {
      setSubmitted(true);
      onSubmit(text.trim() || "[Image submitted]");
    } finally {
      setSubmitting(false);
    }
  }, [text, image, upload, question, questionId, subject, year, onSubmit, user]);

  if (submitted && marking) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Marking Result</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "text-2xl font-bold",
            marking.score >= 70 ? "text-green-600" :
            marking.score >= 40 ? "text-amber-600" : "text-red-600",
          )}>
            {marking.score}%
          </div>
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${marking.score}%` }}
              className={cn(
                "h-full rounded-full",
                marking.score >= 70 ? "bg-green-500" :
                marking.score >= 40 ? "bg-amber-500" : "bg-red-500",
              )}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{marking.feedback}</p>
        {marking.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Strengths</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              {marking.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        {marking.weaknesses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Areas to Improve</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              {marking.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
        <div className="p-3 rounded-xl bg-muted/50 border text-xs">
          <p className="font-medium text-xs mb-1">Correct Answer / Correction</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{marking.corrections}</p>
        </div>
      </div>
    );
  }

  if (submitted && !marking) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
        <Check className="h-3.5 w-3.5" />
        Answer submitted
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answer... (or upload an image)"
          rows={4}
          className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          disabled={disabled}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <button
            type="button"
            onClick={handlePickImage}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Attach image"
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
        accept="image/png,image/jpeg,image/webp"
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

        {preview && !showCamera && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl overflow-hidden border max-h-48"
          >
            <img src={preview} alt="Answer preview" className="w-full h-full object-contain max-h-48" />
            <button
              onClick={reset}
              className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {image ? "1 image attached" : "Attach a photo of written work"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={(!text.trim() && !image) || submitting || disabled}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-[0.97]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Marking..." : "Submit & Mark"}
        </button>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
