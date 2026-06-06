import { useState, useRef, useEffect, useCallback, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string;
  blurHash?: string;
  fallback?: React.ReactNode;
}

export function LazyImage({
  src,
  alt,
  aspectRatio,
  blurHash,
  fallback,
  className,
  ...imgProps
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setVisible(true);
        if (imgRef.current && observerRef.current) {
          observerRef.current.unobserve(imgRef.current);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!imgRef.current) return;
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: "200px",
      threshold: 0.01,
    });
    observerRef.current.observe(imgRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleIntersection]);

  if (error && fallback) return <>{fallback}</>;

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden bg-muted/30", className)}
      style={{ aspectRatio }}
    >
      {!visible && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-inherit" />
      )}
      {visible && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
          {...imgProps}
        />
      )}
    </div>
  );
}
