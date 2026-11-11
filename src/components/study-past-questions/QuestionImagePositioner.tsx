import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { QuestionMath } from "@/components/QuestionMath";
import { cn } from "@/lib/utils";
import {
  createInlineImagePosition,
  getInlineImageOffsets,
  getQuestionPositionTokens,
} from "@/lib/question-image-position";

interface PositionedQuestionImage {
  id: string;
  url: string;
}

interface QuestionImagePositionerProps {
  content: string;
  images: PositionedQuestionImage[];
  imagePosition: string;
  onPositionChange: (position: string) => void;
}

interface DragPoint {
  x: number;
  y: number;
}

interface PointerStart {
  pointerId: number;
  imageIndex: number;
  startX: number;
  startY: number;
}

/**
 * Admin-only editor for placing every question image at its own text anchor.
 * Drop targets are measured against the real preview width, including natural
 * line wraps. Each image can be selected and repositioned independently.
 */
export function QuestionImagePositioner({
  content,
  images,
  imagePosition,
  onPositionChange,
}: QuestionImagePositionerProps) {
  const tokens = useMemo(() => getQuestionPositionTokens(content), [content]);
  const savedOffsets = useMemo(
    () => getInlineImageOffsets(imagePosition, content, images.length),
    [imagePosition, content, images.length],
  );
  const [lineOffsets, setLineOffsets] = useState<number[]>(() =>
    content.length > 0 ? [0, content.length] : [0]
  );
  const [previewOffsets, setPreviewOffsets] = useState<number[]>(savedOffsets);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<DragPoint | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewOffsetsRef = useRef(previewOffsets);
  const lineOffsetsRef = useRef(lineOffsets);
  const dragTargetIndexRef = useRef<number | null>(null);
  const pointerRef = useRef<PointerStart | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const draggingImageIndexRef = useRef<number | null>(null);

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
    previewOffsetsRef.current = savedOffsets;
    setPreviewOffsets(savedOffsets);
    setActiveImageIndex((current) => Math.min(current, Math.max(0, images.length - 1)));
  }, [savedOffsets, images.length]);

  useEffect(() => {
    lineOffsetsRef.current = lineOffsets;
  }, [lineOffsets]);

  useEffect(() => {
    previewOffsetsRef.current = previewOffsets;
  }, [previewOffsets]);

  const getSelectedLineIndex = useCallback((imageIndex: number) => {
    const offset = previewOffsetsRef.current[imageIndex] ?? 0;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    lineOffsetsRef.current.forEach((lineOffset, index) => {
      const distance = Math.abs(lineOffset - offset);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }, []);

  const updateOffset = useCallback((offset: number, imageIndex: number) => {
    if (imageIndex < 0 || imageIndex >= images.length) return;
    const safeOffset = Math.max(0, Math.min(content.length, Math.floor(offset)));
    const nextOffsets = [...previewOffsetsRef.current];
    nextOffsets[imageIndex] = safeOffset;
    previewOffsetsRef.current = nextOffsets;
    setPreviewOffsets(nextOffsets);
    setActiveImageIndex(imageIndex);
    onPositionChange(createInlineImagePosition(nextOffsets));
  }, [content.length, images.length, onPositionChange]);

  const findNearestSlot = useCallback((clientY: number, imageIndex: number): number | null => {
    const slots = wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-image-drop-slot]");
    if (!slots?.length) return null;

    const selectedLine = getSelectedLineIndex(imageIndex);
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    slots.forEach((slot) => {
      const index = Number(slot.dataset.imageDropSlot);
      if (index === selectedLine) return;
      const rect = slot.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }, [getSelectedLineIndex]);

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
    const nearest = findNearestSlot(event.clientY, pointer.imageIndex);
    if (nearest !== null && nearest !== dragTargetIndexRef.current) {
      dragTargetIndexRef.current = nearest;
      setDragTargetIndex(nearest);
    }
  }, [findNearestSlot]);

  const clearDragState = useCallback(() => {
    pointerRef.current = null;
    draggingRef.current = false;
    draggingImageIndexRef.current = null;
    setIsDragging(false);
    setIsPressing(false);
    setDragPoint(null);
    setDragTargetIndex(null);
    dragTargetIndexRef.current = null;
  }, []);

  const handlePointerEnd = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;

    if (draggingRef.current) {
      const target = dragTargetIndexRef.current;
      const targetOffset = target === null ? undefined : lineOffsetsRef.current[target];
      if (targetOffset !== undefined) updateOffset(targetOffset, pointer.imageIndex);
    }
    clearDragState();
  }, [clearDragState, updateOffset]);

  const handlePointerCancel = useCallback((event: PointerEvent) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    clearDragState();
  }, [clearDragState]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerCancel);
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    };
  }, [handlePointerCancel, handlePointerEnd, handlePointerMove]);

  const beginLongPress = (event: ReactPointerEvent<HTMLButtonElement>, imageIndex: number) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    pointerRef.current = {
      pointerId: event.pointerId,
      imageIndex,
      startX: event.clientX,
      startY: event.clientY,
    };
    draggingImageIndexRef.current = imageIndex;
    setActiveImageIndex(imageIndex);
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

  const handleImageKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, imageIndex: number) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = Math.max(0, Math.min(lineOffsets.length - 1, getSelectedLineIndex(imageIndex) + direction));
      updateOffset(lineOffsets[nextIndex] ?? 0, imageIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      updateOffset(0, imageIndex);
    } else if (event.key === "End") {
      event.preventDefault();
      updateOffset(content.length, imageIndex);
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
        onClick={() => updateOffset(lineOffsets[index] ?? 0, activeImageIndex)}
        aria-label={"Place selected image " + placeLabel}
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
          <span className="sr-only">Place selected image {placeLabel}</span>
        )}
      </button>
    );
  };

  const renderImage = (image: PositionedQuestionImage, imageIndex: number) => {
    const pressing = isPressing && activeImageIndex === imageIndex;
    const dragging = isDragging && draggingImageIndexRef.current === imageIndex;
    return (
      <button
        key={image.id}
        type="button"
        onPointerDown={(event) => beginLongPress(event, imageIndex)}
        onFocus={() => setActiveImageIndex(imageIndex)}
        onKeyDown={(event) => handleImageKeyDown(event, imageIndex)}
        aria-label={"Question image " + (imageIndex + 1) + ". Press and hold, then drag to reposition. Arrow keys also move it line by line."}
        aria-pressed={activeImageIndex === imageIndex}
        data-testid="draggable-question-image"
        data-image-index={imageIndex}
        className={cn(
          "w-full rounded-lg border p-1 cursor-grab active:cursor-grabbing touch-none select-none",
          activeImageIndex === imageIndex ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
        )}
      >
        <img
          src={image.url}
          alt={"Draggable question image " + (imageIndex + 1)}
          draggable={false}
          className={cn(
            "w-full max-h-64 object-contain rounded-lg bg-muted/30 pointer-events-none",
            pressing && "scale-[0.99]",
            dragging && "opacity-40"
          )}
        />
        <span className="block text-[10px] text-muted-foreground pt-1">
          Image {imageIndex + 1} · {dragging ? "Drag to a highlighted line" : "Press and hold to reposition"}
        </span>
      </button>
    );
  };

  const chunks = lineOffsets.slice(0, -1);
  const placements = images.map((image, imageIndex) => ({
    image,
    imageIndex,
    offset: previewOffsets[imageIndex] ?? content.length,
  }));

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Every image can be moved independently. Select the image you want below, then press and hold that image in the preview and drag it to the highlighted text line. You can also use the arrow keys while an image is focused.
      </div>
      <div
        role="group"
        aria-label="Select image to reposition"
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/70 p-2"
      >
        <span className="text-[11px] font-medium text-muted-foreground">Move image:</span>
        {images.map((image, imageIndex) => {
          const selected = activeImageIndex === imageIndex;
          const lineIndex = getSelectedLineIndex(imageIndex);
          const lineLabel = lineIndex === lineOffsets.length - 1
            ? "after last line"
            : "line " + (lineIndex + 1);
          return (
            <button
              key={image.id}
              type="button"
              data-testid="select-inline-image"
              aria-label={"Select image " + (imageIndex + 1) + " to position"}
              aria-pressed={selected}
              onClick={() => {
                setActiveImageIndex(imageIndex);
                dragTargetIndexRef.current = null;
                setDragTargetIndex(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              <span>Image {imageIndex + 1}</span>
              <span className="text-[10px] opacity-75">{lineLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute left-0 top-0 w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base font-medium leading-relaxed invisible pointer-events-none"
      >
        {content}
      </div>

      <div className="space-y-0">
        {chunks.map((start, lineIndex) => {
          const end = lineOffsets[lineIndex + 1] ?? content.length;
          const linePlacements = placements
            .filter((placement) => placement.offset >= start && placement.offset < end)
            .sort((a, b) => a.offset - b.offset || a.imageIndex - b.imageIndex);
          const parts: ReactNode[] = [];
          let cursor = start;

          const groupedLinePlacements = linePlacements.reduce<Array<{ offset: number; items: typeof linePlacements }>>(
            (groups, placement) => {
              const existing = groups[groups.length - 1];
              if (existing?.offset === placement.offset) existing.items.push(placement);
              else groups.push({ offset: placement.offset, items: [placement] });
              return groups;
            },
            [],
          );

          groupedLinePlacements.forEach((group) => {
            if (group.offset > cursor) {
              parts.push(
                <QuestionMath
                  key={"text-" + cursor}
                  content={content.slice(cursor, group.offset)}
                  className="text-base font-medium leading-relaxed"
                />
              );
            }
            // Shared text anchors render in a vertical stack, never as overlays.
            parts.push(
              <div
                key={"inline-image-group-" + start + "-" + group.offset}
                data-testid="inline-image-placement-group"
                data-image-placement-offset={group.offset}
                className="my-2 flex flex-col gap-2"
              >
                {group.items.map((placement) => renderImage(placement.image, placement.imageIndex))}
              </div>
            );
            cursor = group.offset;
          });

          if (cursor < end || linePlacements.length === 0) {
            const lineText = content.slice(cursor, end);
            if (lineText.trim()) {
              parts.push(
                <QuestionMath
                  key={"text-" + cursor}
                  content={lineText}
                  className="text-base font-medium leading-relaxed"
                />
              );
            }
          }

          return (
            <div key={"question-line-" + start}>
              {renderDropSlot(lineIndex)}
              {parts}
            </div>
          );
        })}

        {renderDropSlot(lineOffsets.length - 1)}
        {(() => {
          const trailing = placements
            .filter((placement) => placement.offset >= content.length)
            .sort((a, b) => a.imageIndex - b.imageIndex);
          return trailing.length > 0 ? (
            <div
              data-testid="inline-image-placement-group"
              data-image-placement-offset={content.length}
              className="my-2 flex flex-col gap-2"
            >
              {trailing.map((placement) => renderImage(placement.image, placement.imageIndex))}
            </div>
          ) : null;
        })()}
      </div>

      {isDragging && dragPoint && draggingImageIndexRef.current !== null && (
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
            src={images[draggingImageIndexRef.current]?.url}
            alt=""
            draggable={false}
            className="max-h-28 w-full object-contain rounded-md"
          />
          <p className="pt-1 text-center text-[10px] font-medium text-primary">Move this image to a line, then release</p>
        </div>
      )}
    </div>
  );
}

export default QuestionImagePositioner;
