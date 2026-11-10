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

interface DragPoint {
  x: number;
  y: number;
}

/**
 * Admin-only placement surface.
 *
 * The image stays in its original slot while dragging so line targets do not
 * move underneath the pointer. A floating preview follows the pointer, and
 * the actual image is moved only on release.
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
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<DragPoint | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const previewIndexRef = useRef(savedIndex);
  const dragTargetIndexRef = useRef<number | null>(savedIndex);
  const pointerRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pointerDraggedRef = useRef(false);

  useEffect(() => {
    previewIndexRef.current = savedIndex;
    setPreviewIndex(savedIndex);
    if (!draggingRef.current) {
      dragTargetIndexRef.current = savedIndex;
      setDragTargetIndex(savedIndex);
    }
  }, [savedIndex]);

  const updateIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(lines.length, Math.floor(index)));
    previewIndexRef.current = nextIndex;
    dragTargetIndexRef.current = nextIndex;
    setPreviewIndex(nextIndex);
    setDragTargetIndex(nextIndex);
    onPositionChange(createInlineImagePosition(nextIndex));
  }, [lines.length, onPositionChange]);

  const findNearestSlot = useCallback((clientY: number): number | null => {
    const slots = wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-image-drop-slot]");
    if (!slots?.length) return null;

    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slots.forEach((slot) => {
      const index = Number(slot.dataset.imageDropSlot);
      // The image's origin slot is tall; ignoring it keeps the remaining
      // insertion targets evenly positioned throughout the drag.
      if (index === previewIndexRef.current) return;

      const rect = slot.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
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
    setDragPoint({ x: event.clientX, y: event.clientY });
    const nearest = findNearestSlot(event.clientY);
    if (nearest !== null && nearest !== dragTargetIndexRef.current) {
      dragTargetIndexRef.current = nearest;
      setDragTargetIndex(nearest);
      if (nearest !== previewIndexRef.current) pointerDraggedRef.current = true;
    }
  }, [findNearestSlot]);

  const handlePointerEnd = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;

    if (draggingRef.current) {
      const target = dragTargetIndexRef.current ?? previewIndexRef.current;
      if (target !== previewIndexRef.current) {
        pointerDraggedRef.current = true;
        updateIndex(target);
      }
    }

    pointerRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
    setIsPressing(false);
    setDragPoint(null);
    setDragTargetIndex(previewIndexRef.current);
  }, [updateIndex]);

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
    pointerDraggedRef.current = false;
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    dragTargetIndexRef.current = previewIndexRef.current;
    setDragTargetIndex(previewIndexRef.current);
    setDragPoint({ x: event.clientX, y: event.clientY });
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
    const isDropTarget = isDragging && dragTargetIndex === index && !isCurrentSlot;
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
        onClick={() => {
          if (pointerDraggedRef.current) {
            pointerDraggedRef.current = false;
            return;
          }
          updateIndex(index);
        }}
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
              ? isDropTarget
                ? "h-9 border-2 border-primary bg-primary/15 text-[11px] font-semibold text-primary"
                : "h-9 border border-dashed border-primary/25 bg-primary/5 text-[11px] text-primary/70"
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
                isPressing && "scale-[0.99]",
                isDragging && "opacity-40"
              )}
            />
            <span className="block text-[10px] text-muted-foreground pt-1">
              {isDragging ? "Release on the highlighted line" : "Press and hold to reposition"}
            </span>
          </span>
        ) : isDragging ? (
          isDropTarget ? "Release to place image" : "Drop image here"
        ) : (
          <span className="sr-only">Place image {placeLabel}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Press and hold the image, then drag up or down. The highlighted line is the drop position. You can also tap a line or focus the image and use the arrow keys.
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

      {isDragging && dragPoint && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] w-48 max-w-[calc(100vw-24px)] rounded-lg border border-primary/40 bg-background/90 p-1 shadow-2xl"
          style={{
            top: dragPoint.y + 14,
            left: dragPoint.x,
            transform: "translateX(-50%)",
          }}
        >
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className="max-h-28 w-full object-contain rounded-md"
          />
          <p className="pt-1 text-center text-[10px] font-medium text-primary">Move to a line, then release</p>
        </div>
      )}
    </div>
  );
}

export default QuestionImagePositioner;
