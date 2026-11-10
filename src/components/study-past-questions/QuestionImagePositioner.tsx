import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import {
  createInlineImagePosition,
  getInlineImageOffset,
  getQuestionPositionTokens,
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
 * Admin-only placement surface. Candidate drop points are measured against
 * the actual preview width, so wrapped text exposes one drop point per visible
 * line even when the question has no manually-authored newline characters.
 *
 * The image stays in its source slot while dragging. A floating copy follows
 * the pointer and the real image moves only after release.
 */
export function QuestionImagePositioner({
  content,
  imageSrc,
  imagePosition,
  onPositionChange,
}: QuestionImagePositionerProps) {
  const tokens = useMemo(() => getQuestionPositionTokens(content), [content]);
  const savedOffset = getInlineImageOffset(imagePosition, content);
  const [lineOffsets, setLineOffsets] = useState<number[]>(() =>
    content.length > 0 ? [0, content.length] : [0]
  );
  const [previewOffset, setPreviewOffset] = useState(savedOffset);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<DragPoint | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewOffsetRef = useRef(savedOffset);
  const lineOffsetsRef = useRef(lineOffsets);
  const dragTargetIndexRef = useRef<number | null>(null);
  const pointerRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pointerDraggedRef = useRef(false);

  const measureVisualLines = useCallback(() => {
    const element = measureRef.current;
    const textNode = element?.firstChild;

    if (!(textNode instanceof Text) || tokens.length === 0) {
      const fallback = content.length > 0 ? [0, content.length] : [0];
      lineOffsetsRef.current = fallback;
      setLineOffsets(fallback);
      return;
    }

    const range = document.createRange();
    const offsets = [0];
    let previousLineTop: number | null = null;

    for (const token of tokens) {
      // Measuring the first character of each word/math token gives its
      // rendered line. A changed top coordinate means a natural wrap occurred.
      range.setStart(textNode, token.start);
      range.setEnd(textNode, Math.min(token.start + 1, token.end));
      const rect = range.getBoundingClientRect();
      if (rect.height <= 0) continue;

      const lineTop = Math.round(rect.top);
      if (previousLineTop !== null && Math.abs(lineTop - previousLineTop) > 2) {
        offsets.push(token.start);
      }
      previousLineTop = lineTop;
    }

    offsets.push(content.length);
    const uniqueOffsets = [...new Set(offsets)].sort((a, b) => a - b);
    const unchanged =
      uniqueOffsets.length === lineOffsetsRef.current.length &&
      uniqueOffsets.every((offset, index) => offset === lineOffsetsRef.current[index]);

    if (!unchanged) {
      lineOffsetsRef.current = uniqueOffsets;
      setLineOffsets(uniqueOffsets);
    }
  }, [content, tokens]);

  useLayoutEffect(() => {
    measureVisualLines();

    const target = wrapperRef.current;
    const observer = typeof ResizeObserver !== "undefined" && target
      ? new ResizeObserver(() => measureVisualLines())
      : null;

    if (target && observer) observer.observe(target);
    window.addEventListener("resize", measureVisualLines);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureVisualLines);
    };
  }, [measureVisualLines]);

  useEffect(() => {
    previewOffsetRef.current = savedOffset;
    setPreviewOffset(savedOffset);
  }, [savedOffset]);

  useEffect(() => {
    lineOffsetsRef.current = lineOffsets;
  }, [lineOffsets]);

  const selectedIndex = useMemo(() => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    lineOffsets.forEach((offset, index) => {
      const distance = Math.abs(offset - previewOffset);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [lineOffsets, previewOffset]);

  const updateOffset = useCallback((offset: number) => {
    const safeOffset = Math.max(0, Math.min(content.length, Math.floor(offset)));
    previewOffsetRef.current = safeOffset;
    setPreviewOffset(safeOffset);
    onPositionChange(createInlineImagePosition(safeOffset));
  }, [content.length, onPositionChange]);

  const findNearestSlot = useCallback((clientY: number): number | null => {
    const slots = wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-image-drop-slot]");
    if (!slots?.length) return null;

    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slots.forEach((slot) => {
      const index = Number(slot.dataset.imageDropSlot);
      if (index === selectedIndex) return;

      const rect = slot.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }, [selectedIndex]);

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
      if (nearest !== selectedIndex) pointerDraggedRef.current = true;
    }
  }, [findNearestSlot, selectedIndex]);

  const handlePointerEnd = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;

    if (draggingRef.current) {
      const target = dragTargetIndexRef.current;
      const targetOffset = target === null ? undefined : lineOffsetsRef.current[target];
      if (targetOffset !== undefined && targetOffset !== previewOffsetRef.current) {
        pointerDraggedRef.current = true;
        updateOffset(targetOffset);
      }
    }

    pointerRef.current = null;
    draggingRef.current = false;
    setIsDragging(false);
    setIsPressing(false);
    setDragPoint(null);
    setDragTargetIndex(null);
  }, [updateOffset]);

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
    dragTargetIndexRef.current = null;
    setDragTargetIndex(null);
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
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = Math.max(0, Math.min(lineOffsets.length - 1, selectedIndex + direction));
      updateOffset(lineOffsets[nextIndex] ?? 0);
    } else if (event.key === "Home") {
      event.preventDefault();
      updateOffset(0);
    } else if (event.key === "End") {
      event.preventDefault();
      updateOffset(content.length);
    }
  };

  const renderDropSlot = (index: number) => {
    const placeLabel = index === 0
      ? "before the first line"
      : index === lineOffsets.length - 1
        ? "after the last line"
        : "at the start of line " + (index + 1);
    const isDropTarget = isDragging && dragTargetIndex === index;

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
          updateOffset(lineOffsets[index] ?? 0);
        }}
        aria-label={"Place image " + placeLabel}
        className={cn(
          "w-full rounded-lg transition-all touch-none select-none",
          isDragging
            ? isDropTarget
              ? "h-9 border-2 border-primary bg-primary/15 text-[11px] font-semibold text-primary"
              : "h-9 border border-dashed border-primary/25 bg-primary/5 text-[11px] text-primary/70"
            : "h-2 border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5"
        )}
      >
        {isDragging ? isDropTarget ? "Release to place image" : "Drop image here" : (
          <span className="sr-only">Place image {placeLabel}</span>
        )}
      </button>
    );
  };

  const renderCurrentImage = () => (
    <button
      type="button"
      onPointerDown={beginLongPress}
      onClick={() => {
        // A drag can end over another line; suppress the synthetic click.
        if (pointerDraggedRef.current) pointerDraggedRef.current = false;
      }}
      onKeyDown={handleImageKeyDown}
      aria-label="Question image. Press and hold, then drag up or down to reposition. Arrow keys also move it line by line."
      className="my-2 w-full rounded-lg border border-primary/30 bg-primary/5 p-1 cursor-grab active:cursor-grabbing touch-none select-none"
    >
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
        {isDragging ? "Drag to a highlighted line" : "Press and hold to reposition"}
      </span>
    </button>
  );

  const chunks = lineOffsets.slice(0, -1);
  const imageRenderedInText = previewOffset < content.length;

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Press and hold the image, then drag up or down. Drop lines follow the text as it wraps in this preview. You can also tap a line or focus the image and use the arrow keys.
      </div>

      {/* Invisible text mirror measures natural line wraps at this preview width. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute left-0 top-0 w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base font-medium leading-relaxed invisible pointer-events-none"
      >
        {content}
      </div>

      <div className="space-y-0">
        {chunks.map((start, index) => {
          const end = lineOffsets[index + 1] ?? content.length;
          const hasImageInsideChunk = previewOffset >= start && previewOffset < end;

          return (
            <div key={"question-line-" + start}>
              {renderDropSlot(index)}
              {hasImageInsideChunk ? (
                <>
                  {previewOffset > start && (
                    <QuestionMath
                      content={content.slice(start, previewOffset)}
                      className="text-base font-medium leading-relaxed"
                    />
                  )}
                  {renderCurrentImage()}
                  {previewOffset < end && (
                    <QuestionMath
                      content={content.slice(previewOffset, end)}
                      className="text-base font-medium leading-relaxed"
                    />
                  )}
                </>
              ) : (
                content.slice(start, end).trim() && (
                  <QuestionMath
                    content={content.slice(start, end)}
                    className="text-base font-medium leading-relaxed"
                  />
                )
              )}
            </div>
          );
        })}

        {renderDropSlot(lineOffsets.length - 1)}
        {!imageRenderedInText && renderCurrentImage()}
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
