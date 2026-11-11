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
  const urls = [...new Set(
    (imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [])
      .filter((url): url is string => typeof url === "string" && url.length > 0)
  )].filter((url) => !failedUrls.has(url));

  if (urls.length === 0) return null;

  return (
    <div className={`mb-4 rounded-xl border bg-muted/30 p-2 ${className}`}>
      <div className={urls.length > 1 ? "grid grid-cols-1 gap-3" : "w-full"}>
        {urls.map((url, index) => (
          <img
            key={url}
            src={url}
            alt={urls.length > 1 ? `${alt} ${index + 1}` : alt}
            className="mx-auto max-h-64 w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrls((previous) => new Set(previous).add(url))}
          />
        ))}
      </div>
    </div>
  );
}

export default QuestionImage;
