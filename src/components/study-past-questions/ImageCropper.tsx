import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import { X, Check, Pencil, Crop } from "lucide-react";

interface ImageCropperProps {
  image: string;
  fileName: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onSkip: (originalBlob: Blob) => void;
  onCancel: () => void;
}

type CropMode = "rectangle" | "freehand";
type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
interface Point { x: number; y: number; }
interface CropRect { x: number; y: number; width: number; height: number; }
interface ImageBounds extends CropRect { scale: number; }
type RectangleAction =
  | { kind: "move"; pointerId: number; start: Point; initialRect: CropRect }
  | { kind: "resize"; pointerId: number; start: Point; initialRect: CropRect; handle: ResizeHandle };

const MIN_CROP_SIZE = 20;

export function ImageCropper({ image, fileName, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const [mode, setMode] = useState<CropMode>("rectangle");
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const rectangleActionRef = useRef<RectangleAction | null>(null);
  const processing = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceMimeType = image.match(/^data:(image\/(?:png|webp|jpeg));/)?.[1] || "image/jpeg";

  const getImageBounds = useCallback((): ImageBounds | null => {
    const imageElement = imageRef.current;
    const container = containerRef.current;
    if (!imageElement || !container || !imageElement.naturalWidth || !imageElement.naturalHeight) return null;
    const scale = Math.min(
      container.clientWidth / imageElement.naturalWidth,
      container.clientHeight / imageElement.naturalHeight,
    );
    const width = imageElement.naturalWidth * scale;
    const height = imageElement.naturalHeight * scale;
    return {
      x: (container.clientWidth - width) / 2,
      y: (container.clientHeight - height) / 2,
      width,
      height,
      scale,
    };
  }, []);

  const initializeCropRect = useCallback(() => {
    const bounds = getImageBounds();
    if (!bounds) return;
    const insetX = Math.min(18, bounds.width * 0.04);
    const insetY = Math.min(18, bounds.height * 0.04);
    setCropRect({
      x: bounds.x + insetX,
      y: bounds.y + insetY,
      width: Math.max(MIN_CROP_SIZE, bounds.width - insetX * 2),
      height: Math.max(MIN_CROP_SIZE, bounds.height - insetY * 2),
    });
  }, [getImageBounds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const bounds = getImageBounds();
      if (!bounds) return;
      setCropRect((current) => {
        if (!current) {
          const insetX = Math.min(18, bounds.width * 0.04);
          const insetY = Math.min(18, bounds.height * 0.04);
          return {
            x: bounds.x + insetX,
            y: bounds.y + insetY,
            width: Math.max(MIN_CROP_SIZE, bounds.width - insetX * 2),
            height: Math.max(MIN_CROP_SIZE, bounds.height - insetY * 2),
          };
        }
        const width = Math.min(current.width, bounds.width);
        const height = Math.min(current.height, bounds.height);
        return {
          x: Math.max(bounds.x, Math.min(current.x, bounds.x + bounds.width - width)),
          y: Math.max(bounds.y, Math.min(current.y, bounds.y + bounds.height - height)),
          width,
          height,
        };
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [getImageBounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || mode !== "freehand") return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (points.length === 0) return;

    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#22c55e";
    context.fillStyle = "rgba(34, 197, 94, 0.16)";
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    if (!isDrawing && points.length >= 3) {
      context.closePath();
      context.fill();
    }
    context.stroke();
  }, [mode, points, isDrawing]);

  const getLocalPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const clampRect = useCallback((rect: CropRect): CropRect => {
    const bounds = getImageBounds();
    if (!bounds) return rect;
    const width = Math.max(MIN_CROP_SIZE, Math.min(rect.width, bounds.width));
    const height = Math.max(MIN_CROP_SIZE, Math.min(rect.height, bounds.height));
    return {
      x: Math.max(bounds.x, Math.min(rect.x, bounds.x + bounds.width - width)),
      y: Math.max(bounds.y, Math.min(rect.y, bounds.y + bounds.height - height)),
      width,
      height,
    };
  }, [getImageBounds]);

  const beginRectangleAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    kind: "move" | "resize",
    handle?: ResizeHandle,
  ) => {
    if (mode !== "rectangle" || !cropRect || processing.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const start = getLocalPoint(event.clientX, event.clientY);
    if (!start) return;
    event.preventDefault();
    event.stopPropagation();
    rectangleActionRef.current = kind === "move"
      ? { kind, pointerId: event.pointerId, start, initialRect: cropRect }
      : { kind, pointerId: event.pointerId, start, initialRect: cropRect, handle: handle || "se" };
    setCropError(null);
  };

  const handleRectanglePointerMove = useCallback((event: PointerEvent) => {
    const action = rectangleActionRef.current;
    if (!action || action.pointerId !== event.pointerId) return;
    const point = getLocalPoint(event.clientX, event.clientY);
    const bounds = getImageBounds();
    if (!point || !bounds) return;
    event.preventDefault();

    const dx = point.x - action.start.x;
    const dy = point.y - action.start.y;
    const original = action.initialRect;

    if (action.kind === "move") {
      setCropRect(clampRect({ ...original, x: original.x + dx, y: original.y + dy }));
      return;
    }

    let left = original.x;
    let top = original.y;
    let right = original.x + original.width;
    let bottom = original.y + original.height;
    const handle = action.handle;

    if (handle.includes("w")) left = Math.max(bounds.x, Math.min(right - MIN_CROP_SIZE, original.x + dx));
    if (handle.includes("e")) right = Math.min(bounds.x + bounds.width, Math.max(left + MIN_CROP_SIZE, original.x + original.width + dx));
    if (handle.includes("n")) top = Math.max(bounds.y, Math.min(bottom - MIN_CROP_SIZE, original.y + dy));
    if (handle.includes("s")) bottom = Math.min(bounds.y + bounds.height, Math.max(top + MIN_CROP_SIZE, original.y + original.height + dy));

    setCropRect({ x: left, y: top, width: right - left, height: bottom - top });
  }, [clampRect, getImageBounds, getLocalPoint]);

  const endRectangleAction = useCallback((event: PointerEvent) => {
    if (rectangleActionRef.current?.pointerId !== event.pointerId) return;
    rectangleActionRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handleRectanglePointerMove, { passive: false });
    window.addEventListener("pointerup", endRectangleAction);
    window.addEventListener("pointercancel", endRectangleAction);
    return () => {
      window.removeEventListener("pointermove", handleRectanglePointerMove);
      window.removeEventListener("pointerup", endRectangleAction);
      window.removeEventListener("pointercancel", endRectangleAction);
    };
  }, [handleRectanglePointerMove, endRectangleAction]);

  const getFreehandPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point | null => {
    const point = getLocalPoint(event.clientX, event.clientY);
    const bounds = getImageBounds();
    if (!point || !bounds) return null;
    if (
      point.x < bounds.x || point.y < bounds.y ||
      point.x > bounds.x + bounds.width || point.y > bounds.y + bounds.height
    ) return null;
    return point;
  };

  const handleFreehandPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "freehand" || processing.current) return;
    const point = getFreehandPoint(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCropError(null);
    setPoints([point]);
    setIsDrawing(true);
  };

  const handleFreehandPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getFreehandPoint(event);
    if (!point) return;
    event.preventDefault();
    setPoints((current) => {
      const last = current[current.length - 1];
      if (last && Math.hypot(last.x - point.x, last.y - point.y) < 2) return current;
      return [...current, point];
    });
  };

  const handleFreehandPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    setIsDrawing(false);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture may already be released */ }
  };

  const createBlob = useCallback((canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the cropped image")), type, quality);
    }), []);

  const createUploadSafeBlob = useCallback(async (
    sourceCanvas: HTMLCanvasElement,
    preferredType: string,
    quality = 0.9,
  ): Promise<Blob> => {
    const maxBytes = 5 * 1024 * 1024;
    let workingCanvas = sourceCanvas;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const preferredBlob = await createBlob(
        workingCanvas,
        preferredType,
        preferredType === "image/jpeg" || preferredType === "image/webp" ? quality : undefined,
      );
      if (preferredBlob.size <= maxBytes) return preferredBlob;

      const webpBlob = await createBlob(workingCanvas, "image/webp", 0.86);
      if (webpBlob.type === "image/webp" && webpBlob.size <= maxBytes) return webpBlob;

      const resizedCanvas = document.createElement("canvas");
      resizedCanvas.width = Math.max(1, Math.floor(workingCanvas.width * 0.75));
      resizedCanvas.height = Math.max(1, Math.floor(workingCanvas.height * 0.75));
      const context = resizedCanvas.getContext("2d");
      if (!context) throw new Error("No canvas context");
      context.drawImage(workingCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
      workingCanvas = resizedCanvas;
    }
    throw new Error("This crop is larger than the 5 MB image limit. Select a smaller area or use the original image.");
  }, [createBlob]);

  const loadImage = useCallback(async () => {
    const imageElement = new Image();
    imageElement.crossOrigin = "anonymous";
    const loaded = new Promise<void>((resolve, reject) => {
      imageElement.onload = () => resolve();
      imageElement.onerror = () => reject(new Error("Failed to load image"));
    });
    imageElement.src = image;
    await loaded;
    return imageElement;
  }, [image]);

  const handleRectangleApply = useCallback(async () => {
    if (processing.current || !cropRect) return;
    const bounds = getImageBounds();
    if (!bounds) {
      setCropError("The image is still loading. Please try again.");
      return;
    }

    processing.current = true;
    setIsProcessing(true);
    try {
      const imageObj = await loadImage();
      const scale = bounds.scale;
      const sourceX = Math.max(0, Math.floor((cropRect.x - bounds.x) / scale));
      const sourceY = Math.max(0, Math.floor((cropRect.y - bounds.y) / scale));
      const sourceRight = Math.min(imageObj.naturalWidth, Math.ceil((cropRect.x + cropRect.width - bounds.x) / scale));
      const sourceBottom = Math.min(imageObj.naturalHeight, Math.ceil((cropRect.y + cropRect.height - bounds.y) / scale));
      const width = sourceRight - sourceX;
      const height = sourceBottom - sourceY;
      if (width < 2 || height < 2) throw new Error("Select a larger crop area.");

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas context");
      context.drawImage(imageObj, sourceX, sourceY, width, height, 0, 0, width, height);
      onCropComplete(await createUploadSafeBlob(canvas, sourceMimeType, 0.86));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not crop image");
      processing.current = false;
      setIsProcessing(false);
    }
  }, [cropRect, getImageBounds, loadImage, onCropComplete, sourceMimeType, createUploadSafeBlob]);

  const handleFreehandApply = useCallback(async () => {
    if (processing.current || isDrawing) return;
    const bounds = getImageBounds();
    if (!bounds || points.length < 3) {
      setCropError("Draw a closed outline around the part of the image you want to keep.");
      return;
    }

    processing.current = true;
    setIsProcessing(true);
    try {
      const imageElement = await loadImage();
      const sourcePoints = points.map((point) => ({
        x: Math.max(0, Math.min(imageElement.naturalWidth, (point.x - bounds.x) / bounds.scale)),
        y: Math.max(0, Math.min(imageElement.naturalHeight, (point.y - bounds.y) / bounds.scale)),
      }));

      const minX = Math.floor(Math.min(...sourcePoints.map((point) => point.x)));
      const minY = Math.floor(Math.min(...sourcePoints.map((point) => point.y)));
      const maxX = Math.ceil(Math.max(...sourcePoints.map((point) => point.x)));
      const maxY = Math.ceil(Math.max(...sourcePoints.map((point) => point.y)));
      const width = maxX - minX;
      const height = maxY - minY;
      if (width < 8 || height < 8) throw new Error("Draw a larger crop area.");

      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d");
      if (!context) throw new Error("No canvas context");
      context.beginPath();
      sourcePoints.forEach((point, index) => {
        const x = point.x - minX;
        const y = point.y - minY;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.clip();
      context.drawImage(imageElement, minX, minY, width, height, 0, 0, width, height);
      onCropComplete(await createUploadSafeBlob(output, "image/webp", 0.88));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not crop image");
      processing.current = false;
      setIsProcessing(false);
    }
  }, [points, isDrawing, getImageBounds, loadImage, onCropComplete, createUploadSafeBlob]);

  const handleUseOriginal = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    setIsProcessing(true);
    try {
      const response = await fetch(image);
      if (!response.ok) throw new Error("Could not read original image");
      const originalBlob = await response.blob();
      if (!originalBlob.type.startsWith("image/") || originalBlob.size === 0) {
        throw new Error("The original image is invalid");
      }
      onSkip(originalBlob);
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not read original image");
      processing.current = false;
      setIsProcessing(false);
    }
  }, [image, onSkip]);

  const handleApply = mode === "freehand" ? handleFreehandApply : handleRectangleApply;
  const handleLabels: Array<{ handle: ResizeHandle; className: string }> = [
    { handle: "nw", className: "-left-2 -top-2 cursor-nwse-resize" },
    { handle: "n", className: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" },
    { handle: "ne", className: "-right-2 -top-2 cursor-nesw-resize" },
    { handle: "e", className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
    { handle: "se", className: "-right-2 -bottom-2 cursor-nwse-resize" },
    { handle: "s", className: "left-1/2 -bottom-2 -translate-x-1/2 cursor-ns-resize" },
    { handle: "sw", className: "-left-2 -bottom-2 cursor-nesw-resize" },
    { handle: "w", className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
      <div className="bg-background rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Crop Image</h3>
            <p className="text-xs text-muted-foreground truncate">{fileName}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-accent transition-colors" aria-label="Cancel crop">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 p-3 border-b">
          <button
            type="button"
            onClick={() => { setMode("rectangle"); setPoints([]); setCropError(null); }}
            className={"flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border " + (mode === "rectangle" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            <Crop className="h-4 w-4" /> Resize edges & corners
          </button>
          <button
            type="button"
            onClick={() => { setMode("freehand"); setCropError(null); }}
            className={"flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border " + (mode === "freehand" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            <Pencil className="h-4 w-4" /> Freehand outline
          </button>
        </div>

        <div ref={containerRef} className="relative w-full h-[min(52vh,360px)] bg-black overflow-hidden select-none">
          <img
            ref={imageRef}
            src={image}
            alt="Original image with adjustable crop area"
            onLoad={initializeCropRect}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            draggable={false}
          />

          {mode === "rectangle" && cropRect && (
            <div
              className="absolute z-10 border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
              style={{
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
                touchAction: "none",
              }}
              onPointerDown={(event) => beginRectangleAction(event, "move")}
            >
              <div className="absolute inset-0 cursor-move" />
              {handleLabels.map(({ handle, className }) => (
                <div
                  key={handle}
                  role="presentation"
                  onPointerDown={(event) => beginRectangleAction(event, "resize", handle)}
                  className={"absolute z-20 h-4 w-4 rounded-full border-2 border-primary bg-white shadow-md touch-none " + className}
                />
              ))}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-white/70 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-white/70 pointer-events-none" />
            </div>
          )}

          {mode === "freehand" && (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 touch-none"
                style={{ touchAction: "none" }}
                onPointerDown={handleFreehandPointerDown}
                onPointerMove={handleFreehandPointerMove}
                onPointerUp={handleFreehandPointerUp}
                onPointerCancel={handleFreehandPointerUp}
              />
              {points.length === 0 && (
                <div className="absolute bottom-3 left-0 right-0 z-20 text-center pointer-events-none">
                  <span className="rounded-full bg-black/65 text-white text-xs px-3 py-1.5">Draw around the part you want to keep</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-3 border-b">
          <p className="text-xs text-muted-foreground">
            {mode === "rectangle"
              ? "Drag inside the box to move it. Drag any edge or corner handle to freely resize the crop."
              : "Trace an outline with your finger or mouse. The outside area becomes transparent."}
          </p>
          {mode === "freehand" && (
            <button type="button" onClick={() => { setPoints([]); setCropError(null); }} className="text-xs text-primary px-2 py-1 shrink-0">
              Clear
            </button>
          )}
        </div>

        {cropError && <p role="alert" className="px-4 pt-3 text-xs text-destructive">{cropError}</p>}

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/30">
          <button onClick={onCancel} disabled={isProcessing} className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
          <button
            onClick={handleUseOriginal}
            disabled={isProcessing}
            className="px-3 py-2 rounded-xl text-sm font-medium border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Use Original
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing || (mode === "freehand" && isDrawing) || (mode === "rectangle" && !cropRect)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {isProcessing ? "Processing…" : "Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
