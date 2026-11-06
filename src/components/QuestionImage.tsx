import { useState } from "react";

interface QuestionImageProps {
  imageUrl?: string;
  alt?: string;
  className?: string;
}

/** Shared, resilient question image renderer used by learn cards and quizzes. */
export function QuestionImage({ imageUrl, alt = "Question illustration", className = "" }: QuestionImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!imageUrl || failedUrl === imageUrl) return null;

  return (
    <div className={`mb-4 rounded-xl border bg-muted/30 p-2 ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        className="mx-auto max-h-64 w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(imageUrl)}
      />
    </div>
  );
}

export default QuestionImage;
