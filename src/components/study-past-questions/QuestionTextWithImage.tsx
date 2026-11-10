import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import { getInlineImageOffset, splitQuestionAtImageOffset } from "@/lib/question-image-position";

interface QuestionTextWithImageProps {
  content: string;
  imageSrc: string;
  imagePosition: string;
  imageAlt?: string;
  onImageError?: () => void;
  className?: string;
}

/**
 * Student-facing renderer for an image anchored at a stable word boundary.
 * The saved character offset survives responsive reflow: on narrower/wider
 * screens the image remains attached to the same phrase instead of a stale
 * visual line number.
 */
export function QuestionTextWithImage({
  content,
  imageSrc,
  imagePosition,
  imageAlt = "Question illustration",
  onImageError,
  className,
}: QuestionTextWithImageProps) {
  const offset = getInlineImageOffset(imagePosition, content);
  const [before, after] = splitQuestionAtImageOffset(content, offset);

  return (
    <div className={cn("w-full min-w-0", className)}>
      {before && (
        <QuestionMath
          content={before}
          className="text-base font-medium leading-relaxed"
        />
      )}
      <div className="my-3">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full max-h-64 object-contain rounded-xl border bg-muted/30"
          loading="lazy"
          onError={onImageError}
        />
      </div>
      {after && (
        <QuestionMath
          content={after}
          className="text-base font-medium leading-relaxed"
        />
      )}
    </div>
  );
}

export default QuestionTextWithImage;
