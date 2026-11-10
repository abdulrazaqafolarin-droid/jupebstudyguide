import { useState } from "react";

interface QuestionImageProps {
  imageUrl?: string;
  imageUrls?: string[];
  alt?: string;
  className?: string;
}

/** Shared, resilient question image renderer used by learn cards and quizzes. */
export function QuestionImage({ imageUrl, imageUrls, alt = "Question illustration", className = "" }: QuestionImageProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const urls = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [];
  const visibleUrls = urls.filter(url => !failedUrls.has(url));
  if (visibleUrls.length === 0) return null;

  return (
    <div className={`mb-4 space-y-3 ${className}`}>
      {visibleUrls.map((url, index) => (
        <div key={url} className="rounded-xl border bg-muted/30 p-2">
          <img
            src={url}
            alt={visibleUrls.length > 1 ? `${alt} ${index + 1}` : alt}
            className="mx-auto max-h-64 w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrls(previous => new Set(previous).add(url))}
          />
        </div>
      ))}
    </div>
  );
}

export default QuestionImage;
