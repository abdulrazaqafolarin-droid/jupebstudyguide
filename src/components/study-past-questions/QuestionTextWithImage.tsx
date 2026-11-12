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
  textClassName?: string;
}

/**
 * Student renderer for independently anchored question images.
 * Images that share a text anchor are grouped in normal flow so one image
 * can never overlap or obscure another.
 */
export function QuestionTextWithImage({
  content,
  images,
  imagePosition,
  className,
  textClassName,
}: QuestionTextWithImageProps) {
  const offsets = getInlineImageOffsets(imagePosition, content, images.length);
  const placements = images
    .map((image, index) => ({ image, offset: offsets[index] ?? content.length, index }))
    .sort((a, b) => a.offset - b.offset || a.index - b.index);

  const groups = placements.reduce<Array<{ offset: number; items: typeof placements }>>(
    (result, placement) => {
      const existing = result[result.length - 1];
      if (existing?.offset === placement.offset) existing.items.push(placement);
      else result.push({ offset: placement.offset, items: [placement] });
      return result;
    },
    [],
  );

  const parts: ReactNode[] = [];
  let cursor = 0;

  groups.forEach((group) => {
    const safeOffset = Math.max(cursor, Math.min(content.length, group.offset));
    if (safeOffset > cursor) {
      parts.push(
        <QuestionMath
          key={"question-text-" + cursor}
          content={content.slice(cursor, safeOffset)}
          className={cn("text-base font-medium leading-relaxed", textClassName)}
        />
      );
    }

    parts.push(
      <div
        key={"question-image-group-" + group.offset}
        data-testid="inline-question-image-group"
        data-image-position={safeOffset}
        className="my-3 flex w-full min-w-0 flex-col gap-3"
      >
        {group.items.map(({ image, index }) => (
          <figure
            key={image.id || "question-image-" + index}
            data-testid="inline-question-image-item"
            className="m-0 w-full min-w-0"
          >
            <img
              src={image.src}
              alt={image.alt || "Question illustration " + (index + 1)}
              className="block w-full max-h-64 object-contain rounded-xl border bg-muted/30"
              loading="lazy"
              onError={image.onError}
            />
          </figure>
        ))}
      </div>
    );
    cursor = safeOffset;
  });

  if (cursor < content.length) {
    parts.push(
      <QuestionMath
        key={"question-text-" + cursor}
        content={content.slice(cursor)}
        className={cn("text-base font-medium leading-relaxed", textClassName)}
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

  return <div className={cn("w-full min-w-0 protected-study-content", className)}>{parts}</div>;
}

export default QuestionTextWithImage;
