import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import {
  createInlineImagePosition,
  getInlineImageIndex,
  splitQuestionIntoPositionableLines,
} from "@/lib/question-image-position";

interface QuestionImagePositionerProps {
  content: string;
  imageSrc: string;
  imagePosition: string;
  onPositionChange: (position: string) => void;
}

/**
 * Interactive admin preview. The image is a long-press draggable object and
 * the drop targets are the boundaries between the same logical lines rendered
 * to students. A click on a target or the keyboard arrows is also supported.
 */
export function QuestionImagePositioner({
  content,
  imageSrc,
  imagePosition,
  onPositionChange,
}: QuestionImagePositionerProps) {
  const lines = useMemo(() => splitQuestionIntoPositionableLines(content), [content]);
  const savedIndex = getInlineImageIndex(imagePosition, lines.length);
  const [previewIndex, setPreviewIndex] = useState(savedIndex);
  const [isPressing, setIsPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previewIndexRef = useRef(savedIndex);
  const pointerRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    previewIndexRef.current = savedIndex;
    setPreviewIndex(savedIndex);
  }, [savedIndex]);

  const updateIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(lines.length, Math.floor(index)));
    previewIndexRef.current = nextIndex;
    setPreviewIndex(nextIndex);
    onPositionChange(createInlineImagePosition(nextIndex));
  }, [lines.length, onPositionChange]);

  const findNearestSlot = useCallback((clientY: number): number | null => {
    const slots = wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-image-drop-slot]");
    if (!slots?.length) return null;

    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slots.forEach((slot) => {
      const rect = slot.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = Number(slot.dataset.imageDropSlot);
      }
    });

    return nearestIndex;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    if (!draggingRef.current) {
      const distance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
      if (distance > 10) {
        if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        pointerRef.current = null;
        setIsPressing(false);
      }
      return;
    }

    event.preventDefault();
    const nearest = findNearestSlot(event.clientY);
    if (nearest !== null && nearest !== previewIndexRef.current) updateIndex(nearest);
  }, [findNearestSlot, updateIndex]);

  const handlePointerEnd = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;

    if (draggingRef.current) {
      onPositionChange(createInlineImagePosition(previewIndexRef.current));
    }

    pointerRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
    setIsPressing(false);
  }, [onPositionChange]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    };
  }, [handlePointerEnd, handlePointerMove]);

  const beginLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsPressing(true);

    holdTimerRef.current = window.setTimeout(() => {
      if (pointerRef.current?.pointerId === event.pointerId) {
        draggingRef.current = true;
        setIsDragging(true);
        setIsPressing(false);
      }
    }, 260);
  };

  const handleImageKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateIndex(previewIndexRef.current - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      updateIndex(previewIndexRef.current + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      updateIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      updateIndex(lines.length);
    }
  };

  const renderSlot = (index: number) => {
    const isCurrentSlot = previewIndex === index;
    const placeLabel = index === 0
      ? "before the first line"
      : index === lines.length
        ? "after the last line"
        : "between lines " + index + " and " + (index + 1);

    return (
      <button
        key={"image-slot-" + index}
        type="button"
        data-image-drop-slot={index}
        onClick={() => updateIndex(index)}
        onPointerDown={isCurrentSlot ? beginLongPress : undefined}
        onKeyDown={isCurrentSlot ? handleImageKeyDown : undefined}
        aria-label={isCurrentSlot
          ? "Question image position " + (index + 1) + " of " + (lines.length + 1) + ". Use the up and down arrow keys to reposition."
          : "Place image " + placeLabel}
        aria-description={isCurrentSlot ? "Press and hold, then drag up or down to move this image." : undefined}
        className={cn(
          "w-full rounded-lg transition-all touch-none select-none",
          isCurrentSlot
            ? "cursor-grab active:cursor-grabbing border border-primary/30 bg-primary/5 p-1"
            : isDragging
              ? "h-9 border-2 border-dashed border-primary/50 bg-primary/5 text-[11px] font-medium text-primary"
              : "h-2 border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5"
        )}
      >
        {isCurrentSlot ? (
          <span className="block">
            <img
              src={imageSrc}
              alt="Draggable question image"
              draggable={false}
              className={cn(
                "w-full max-h-64 object-contain rounded-lg bg-muted/30 pointer-events-none",
                isPressing && "scale-[0.99]"
              )}
            />
            <span className="block text-[10px] text-muted-foreground pt-1">
              {isDragging ? "Drag to a highlighted line break" : "Press and hold to reposition"}
            </span>
          </span>
        ) : isDragging ? (
          "Drop image here"
        ) : (
          <span className="sr-only">Place image {placeLabel}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Press and hold the image, then drag it up or down. It snaps to the line breaks in the question. You can also tap a drop line or focus the image and use the arrow keys.
      </div>
      <div className="space-y-0">
        {lines.map((line, index) => (
          <div key={"question-line-" + index}>
            {renderSlot(index)}
            {line.trim() ? (
              <QuestionMath content={line} className="text-base font-medium leading-relaxed" />
            ) : (
              <div aria-hidden="true" className="min-h-3" />
            )}
          </div>
        ))}
        {renderSlot(lines.length)}
      </div>
    </div>
  );
}

export default QuestionImagePositioner;
