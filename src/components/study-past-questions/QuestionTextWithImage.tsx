import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import { getInlineImageIndex, splitQuestionIntoPositionableLines } from "@/lib/question-image-position";

interface QuestionTextWithImageProps {
  content: string;
  imageSrc: string;
  imagePosition: string;
  imageAlt?: string;
  onImageError?: () => void;
  className?: string;
}

/**
 * Student-facing renderer for an image anchored between authored question
 * lines. It shares the line-splitting helper with the admin editor so preview
 * and saved placement use the same positions.
 */
export function QuestionTextWithImage({
  content,
  imageSrc,
  imagePosition,
  imageAlt = "Question illustration",
  onImageError,
  className,
}: QuestionTextWithImageProps) {
  const lines = splitQuestionIntoPositionableLines(content);
  const imageIndex = getInlineImageIndex(imagePosition, lines.length);
  const image = (
    <img
      src={imageSrc}
      alt={imageAlt}
      className="w-full max-h-64 object-contain rounded-xl border bg-muted/30"
      loading="lazy"
      onError={onImageError}
    />
  );

  return (
    <div className={cn("w-full min-w-0", className)}>
      {lines.map((line, index) => (
        <div key={index}>
          {index === imageIndex && <div className="my-3">{image}</div>}
          {line.trim() ? (
            <QuestionMath content={line} className="text-base font-medium leading-relaxed" />
          ) : (
            <div aria-hidden="true" className="min-h-3" />
          )}
        </div>
      ))}
      {imageIndex === lines.length && <div className="my-3">{image}</div>}
    </div>
  );
}

export default QuestionTextWithImage;
