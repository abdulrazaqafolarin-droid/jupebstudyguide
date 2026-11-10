import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut, Pencil, Crop } from "lucide-react";

interface ImageCropperProps {
  image: string;
  fileName: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onSkip: (originalBlob: Blob) => void;
  onCancel: () => void;
}

type CropMode = "rectangle" | "freehand";
interface DrawPoint { x: number; y: number; }

export function ImageCropper({ image, fileName, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<CropMode>("rectangle");
  const [points, setPoints] = useState<DrawPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const processing = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onCropChange = useCallback((location: { x: number; y: number }) => setCrop(location), []);
  const onZoomChange = useCallback((value: number) => setZoom(value), []);
  const onCropAreaChange = useCallback((_area: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

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

  const getPointerPoint = (event: ReactPointerEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    const imageElement = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !imageElement || !container || !imageElement.naturalWidth || !imageElement.naturalHeight) return null;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scale = Math.min(container.clientWidth / imageElement.naturalWidth, container.clientHeight / imageElement.naturalHeight);
    const displayWidth = imageElement.naturalWidth * scale;
    const displayHeight = imageElement.naturalHeight * scale;
    const offsetX = (container.clientWidth - displayWidth) / 2;
    const offsetY = (container.clientHeight - displayHeight) / 2;

    if (x < offsetX || y < offsetY || x > offsetX + displayWidth || y > offsetY + displayHeight) return null;
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "freehand" || processing.current) return;
    const point = getPointerPoint(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCropError(null);
    setPoints([point]);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getPointerPoint(event);
    if (!point) return;
    event.preventDefault();
    setPoints((current) => {
      const last = current[current.length - 1];
      if (last && Math.hypot(last.x - point.x, last.y - point.y) < 2) return current;
      return [...current, point];
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    setIsDrawing(false);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture may already be released */ }
  };

  const createBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the cropped image")), type, quality);
    });

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
    if (processing.current || !croppedAreaPixels) return;
    processing.current = true;
    try {
      const imageObj = await loadImage();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas context");
      canvas.width = Math.round(croppedAreaPixels.width);
      canvas.height = Math.round(croppedAreaPixels.height);
      context.drawImage(
        imageObj,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      onCropComplete(await createBlob(canvas, "image/jpeg", 0.92));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not crop image");
      processing.current = false;
    }
  }, [loadImage, croppedAreaPixels, onCropComplete]);

  const handleFreehandApply = useCallback(async () => {
    if (processing.current || isDrawing) return;
    const imageElement = imageRef.current;
    const container = containerRef.current;
    if (!imageElement || !container || points.length < 3) {
      setCropError("Draw a closed outline around the part of the image you want to keep.");
      return;
    }

    processing.current = true;
    try {
      const scale = Math.min(container.clientWidth / imageElement.naturalWidth, container.clientHeight / imageElement.naturalHeight);
      const offsetX = (container.clientWidth - imageElement.naturalWidth * scale) / 2;
      const offsetY = (container.clientHeight - imageElement.naturalHeight * scale) / 2;
      const sourcePoints = points.map((point) => ({
        x: Math.max(0, Math.min(imageElement.naturalWidth, (point.x - offsetX) / scale)),
        y: Math.max(0, Math.min(imageElement.naturalHeight, (point.y - offsetY) / scale)),
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
      onCropComplete(await createBlob(output, "image/png"));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not crop image");
      processing.current = false;
    }
  }, [points, isDrawing, onCropComplete]);

  const handleUseOriginal = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    try {
      const imageObj = await loadImage();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas context");
      canvas.width = imageObj.naturalWidth;
      canvas.height = imageObj.naturalHeight;
      context.drawImage(imageObj, 0, 0);
      onSkip(await createBlob(canvas, "image/jpeg", 0.92));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Could not read original image");
      processing.current = false;
    }
  }, [loadImage, onSkip]);

  const handleApply = mode === "freehand" ? handleFreehandApply : handleRectangleApply;

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
            <Crop className="h-4 w-4" /> Rectangle
          </button>
          <button
            type="button"
            onClick={() => { setMode("freehand"); setCropError(null); }}
            className={"flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border " + (mode === "freehand" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            <Pencil className="h-4 w-4" /> Freehand
          </button>
        </div>

        {mode === "rectangle" ? (
          <>
            <div className="relative w-full h-[min(52vh,360px)] bg-black">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropAreaChange}
              />
            </div>
            <div className="flex items-center justify-center gap-4 p-4 border-b">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(event) => onZoomChange(parseFloat(event.target.value))}
                className="w-40 accent-primary"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <div ref={containerRef} className="relative w-full h-[min(52vh,360px)] bg-black overflow-hidden">
              <img ref={imageRef} src={image} alt="Draw around the area to keep" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 touch-none"
                style={{ touchAction: "none", cursor: "crosshair" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              {points.length === 0 && (
                <div className="absolute bottom-3 left-0 right-0 z-20 text-center pointer-events-none">
                  <span className="rounded-full bg-black/65 text-white text-xs px-3 py-1.5">Draw around the part you want to keep</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-3 border-b">
              <p className="text-xs text-muted-foreground">Trace an outline with your finger or mouse. The outside area becomes transparent.</p>
              <button type="button" onClick={() => { setPoints([]); setCropError(null); }} className="text-xs text-primary px-2 py-1">Clear</button>
            </div>
          </>
        )}

        {cropError && <p role="alert" className="px-4 pt-3 text-xs text-destructive">{cropError}</p>}

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/30">
          <button onClick={onCancel} className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
          <button
            onClick={handleUseOriginal}
            disabled={processing.current}
            className="px-3 py-2 rounded-xl text-sm font-medium border hover:bg-accent transition-colors"
          >
            Use Original
          </button>
          <button
            onClick={handleApply}
            disabled={processing.current || (mode === "freehand" && isDrawing)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
