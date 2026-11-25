import { useMemo, useState } from "react";
import type { Question } from "@/types/question";
import QuestionMath from "@/components/QuestionMath";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionTextWithImage } from "@/components/study-past-questions/QuestionTextWithImage";
import { isInlineImagePosition } from "@/lib/question-image-position";
import { cn } from "@/lib/utils";

function normalizeQuestionImageUrl(value: string): string {
  const url = value.trim();
  const commaIndex = url.indexOf(",");
  if (/^data:image\/[^;,]+;base64,/i.test(url) && commaIndex >= 0) {
    return url.slice(0, commaIndex + 1) + url.slice(commaIndex + 1).replace(/\s+/g, "");
  }
  return url;
}

interface QuestionPromptProps {
  question: Pick<Question, "id" | "question" | "imageUrl" | "imageUrls" | "imagePosition">;
  alt?: string;
  className?: string;
  textClassName?: string;
  inlineMath?: boolean;
}

/**
 * The single student-facing prompt renderer for image-bearing questions.
 * It merges legacy and multi-image fields, respects saved positions, and
 * keeps the written question visible even if an image fails to load.
 */
export function QuestionPrompt({
  question,
  alt = "Question illustration",
  className,
  textClassName,
  inlineMath = false,
}: QuestionPromptProps) {
  const [failed, setFailed] = useState<{ questionId: string; urls: Set<string> }>({
    questionId: question.id,
    urls: new Set(),
  });

  const allImageUrls = useMemo(
    () => [...new Set([
      ...(question.imageUrls ?? []),
      question.imageUrl ?? "",
    ].filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      .map(normalizeQuestionImageUrl))],
    [question.imageUrl, question.imageUrls],
  );
  const failedUrls = failed.questionId === question.id ? failed.urls : new Set<string>();
  const imageUrls = allImageUrls.filter((url) => !failedUrls.has(url));
  const showImages = question.imagePosition !== "text-only";
  const hasInlineImages = showImages && imageUrls.length > 0 && isInlineImagePosition(question.imagePosition);

  const markFailed = (url: string) => {
    setFailed((previous) => ({
      questionId: question.id,
      urls: new Set(previous.questionId === question.id ? [...previous.urls, url] : [url]),
    }));
  };

  if (hasInlineImages) {
    return (
      <QuestionTextWithImage
        content={question.question}
        images={allImageUrls.map((src, index) => ({
          id: question.id + "-image-" + index,
          src,
          alt: allImageUrls.length > 1 ? alt + " " + (index + 1) : alt,
          visible: !failedUrls.has(src),
          onError: () => markFailed(src),
        }))}
        imagePosition={question.imagePosition!}
        className={cn("text-base font-medium leading-relaxed", className)}
        textClassName={textClassName}
      />
    );
  }

  if (showImages && question.imagePosition === "image-beside" && imageUrls.length > 0) {
    return (
      <div className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start", className)}>
        <QuestionImage
          imageUrls={imageUrls}
          alt={alt}
          className="shrink-0 sm:w-1/2"
        />
        <div className={cn("min-w-0 flex-1", textClassName)}>
          <QuestionMath content={question.question} inline={inlineMath} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-0", className)}>
      {showImages && imageUrls.length > 0 && (
        <QuestionImage imageUrls={imageUrls} alt={alt} />
      )}
      <QuestionMath content={question.question} inline={inlineMath} className={textClassName} />
    </div>
  );
}

export default QuestionPrompt;
