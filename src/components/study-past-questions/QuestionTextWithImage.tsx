import type { ReactNode } from "react";
import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import { getInlineImageOffsets } from "@/lib/question-image-position";

interface InlineQuestionImage {
  id: string;
  src: string;
  alt?: string;
  onError?: () => void;
}

interface QuestionTextWithImageProps {
  content: string;
  images: InlineQuestionImage[];
  imagePosition: string;
  className?: string;
}

/**
 * Student renderer for multiple independently anchored question images.
 * Character offsets keep every image attached to its intended phrase when
 * the text reflows on different device widths.
 */
export function QuestionTextWithImage({
  content,
  images,
  imagePosition,
  className,
}: QuestionTextWithImageProps) {
  const offsets = getInlineImageOffsets(imagePosition, content, images.length);
  const placements = images
    .map((image, index) => ({ image, offset: offsets[index] ?? content.length, index }))
    .sort((a, b) => a.offset - b.offset || a.index - b.index);

  const parts: ReactNode[] = [];
  let cursor = 0;

  placements.forEach(({ image, offset, index }) => {
    const safeOffset = Math.max(cursor, Math.min(content.length, offset));
    if (safeOffset > cursor) {
      parts.push(
        <QuestionMath
          key={"question-text-" + cursor}
          content={content.slice(cursor, safeOffset)}
          className="text-base font-medium leading-relaxed"
        />
      );
    }

    parts.push(
      <div key={image.id || "question-image-" + index} className="my-3">
        <img
          src={image.src}
          alt={image.alt || "Question illustration " + (index + 1)}
          className="w-full max-h-64 object-contain rounded-xl border bg-muted/30"
          loading="lazy"
          onError={image.onError}
        />
      </div>
    );
    cursor = safeOffset;
  });

  if (cursor < content.length) {
    parts.push(
      <QuestionMath
        key={"question-text-" + cursor}
        content={content.slice(cursor)}
        className="text-base font-medium leading-relaxed"
      />
    );
  }

  if (parts.length === 0 && content) {
    parts.push(
      <QuestionMath
        key="question-text-only"
        content={content}
        className="text-base font-medium leading-relaxed"
      />
    );
  }

  return <div className={cn("w-full min-w-0", className)}>{parts}</div>;
}

export default QuestionTextWithImage;
