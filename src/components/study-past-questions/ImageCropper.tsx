import { useState, useCallback, useEffect, useRef } from "react";
import { X, Check, RotateCcw, Undo2 } from "lucide-react";

interface ImageCropperProps {
  image: string;
  fileName: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onSkip: (originalBlob: Blob) => void;
  onCancel: () => void;
}

interface Point { x: number; y: number }

export function ImageCropper({ image, fileName, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const processingRef = useRef(false);
  const [pointsCount, setPointsCount] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redraw = useCallback((points = pointsRef.current) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const source = imageRef.current;
    if (!canvas || !ctx || !source || !canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (points.length > 0) {
      ctx.save();
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.lineWidth = Math.max(3, canvas.width / 500);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (!drawingRef.current && points.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const source = new Image();
    source.onload = () => {
      if (cancelled) return;
      imageRef.current = source;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;
      }
      setImageReady(true);
      redraw([]);
    };
    source.onerror = () => setError("The selected image could not be loaded. Please choose it again.");
    source.src = image;
    return () => { cancelled = true; };
  }, [image, redraw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageReady || processingRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    pointsRef.current = [pointFromEvent(event)];
    setPointsCount(1);
    redraw(pointsRef.current);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const points = pointsRef.current;
    const previous = points[points.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) < 3) return;
    points.push(point);
    setPointsCount(points.length);
    redraw(points);
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    redraw(pointsRef.current);
  };

  const resetSelection = () => {
    pointsRef.current = [];
    setPointsCount(0);
    setError(null);
    redraw([]);
  };

  const undoPoint = () => {
    pointsRef.current = pointsRef.current.slice(0, -Math.max(1, Math.ceil(pointsRef.current.length / 12)));
    setPointsCount(pointsRef.current.length);
    redraw(pointsRef.current);
  };

  const makeBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed")), "image/jpeg", 0.92);
  });

  const handleApply = useCallback(async () => {
    if (processingRef.current || !imageRef.current) return;
    const points = pointsRef.current;
    if (points.length < 3) {
      setError("Draw a closed outline around the part of the image you want to keep.");
      return;
    }
    processingRef.current = true;
    setError(null);
    try {
      const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
      const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
      const maxX = Math.min(imageRef.current.naturalWidth, Math.ceil(Math.max(...points.map(p => p.x))));
      const maxY = Math.min(imageRef.current.naturalHeight, Math.ceil(Math.max(...points.map(p => p.y))));
      const width = maxX - minX;
      const height = maxY - minY;
      if (width < 2 || height < 2) throw new Error("The crop outline is too small.");
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Image processing is unavailable.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x - minX, points[0].y - minY);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x - minX, points[i].y - minY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(imageRef.current, -minX, -minY);
      ctx.restore();
      const blob = await makeBlob(output);
      onCropComplete(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not crop this image.");
      processingRef.current = false;
    }
  }, [onCropComplete]);

  const handleUseOriginal = useCallback(async () => {
    if (processingRef.current || !imageRef.current) return;
    processingRef.current = true;
    try {
      const output = document.createElement("canvas");
      output.width = imageRef.current.naturalWidth;
      output.height = imageRef.current.naturalHeight;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Image processing is unavailable.");
      ctx.drawImage(imageRef.current, 0, 0);
      onSkip(await makeBlob(output));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not process this image.");
      processingRef.current = false;
    }
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
      <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[94dvh] overflow-hidden shadow-2xl border flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 border-b">
          <div>
            <h3 className="text-sm font-semibold">Freehand image crop</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Draw around the area to keep. You can trace any shape.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close cropper" className="p-2 rounded-lg hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-black/90 p-2 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
            aria-label="Draw a freehand crop outline over the image"
            className="max-w-full max-h-[62dvh] w-auto h-auto object-contain cursor-crosshair touch-none select-none"
            style={{ display: imageReady ? "block" : "none" }}
          />
          {!imageReady && <p className="text-sm text-white/70">Loading image…</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-t">
          <span className="text-xs text-muted-foreground">{pointsCount >= 3 ? "Outline ready — apply to crop" : "Draw at least 3 points to make a crop"}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={undoPoint} disabled={pointsCount === 0} className="px-3 py-2 rounded-xl text-xs font-medium border hover:bg-accent disabled:opacity-40">
              <Undo2 className="h-3.5 w-3.5 inline mr-1" /> Undo
            </button>
            <button type="button" onClick={resetSelection} disabled={pointsCount === 0} className="px-3 py-2 rounded-xl text-xs font-medium border hover:bg-accent disabled:opacity-40">
              <RotateCcw className="h-3.5 w-3.5 inline mr-1" /> Reset
            </button>
            <button type="button" onClick={handleUseOriginal} disabled={!imageReady || processingRef.current} className="px-3 py-2 rounded-xl text-xs font-medium border hover:bg-accent disabled:opacity-40">
              Use Original
            </button>
            <button type="button" onClick={handleApply} disabled={!imageReady || pointsCount < 3 || processingRef.current} className="px-3 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
              <Check className="h-3.5 w-3.5 inline mr-1" /> Apply Crop
            </button>
          </div>
        </div>
        {error && <p role="alert" className="px-4 pb-3 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
