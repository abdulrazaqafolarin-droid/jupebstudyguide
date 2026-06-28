import { useState, useCallback, useRef } from "react";
import { Cropper, CropperRef, RectangleStencil } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import { X, Check, Lock, Unlock } from "lucide-react";

interface ImageCropperProps {
  image: string;
  fileName: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onSkip: (originalBlob: Blob) => void;
  onCancel: () => void;
}

type AspectPreset = { label: string; ratio: number | null };

const ASPECT_PRESETS: AspectPreset[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "21:9", ratio: 21 / 9 },
];

export function ImageCropper({ image, fileName, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [selectedPreset, setSelectedPreset] = useState<AspectPreset>(ASPECT_PRESETS[4]);
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const processing = useRef(false);

  const aspectRatio = useCustom
    ? (parseFloat(customW) && parseFloat(customH) ? parseFloat(customW) / parseFloat(customH) : undefined)
    : (selectedPreset.ratio ?? undefined);

  const handleApply = useCallback(() => {
    if (processing.current) return;
    processing.current = true;
    try {
      const canvas = cropperRef.current?.getCanvas();
      if (!canvas) {
        processing.current = false;
        return;
      }
      canvas.toBlob(
        (b) => {
          if (b) {
            onCropComplete(b);
          } else {
            processing.current = false;
          }
        },
        "image/jpeg",
        0.92
      );
    } catch {
      processing.current = false;
    }
  }, [onCropComplete]);

  const handleUseOriginal = useCallback(async () => {
    if (processing.current) return;
    processing.current = true;
    try {
      const imageObj = new Image();
      imageObj.crossOrigin = "anonymous";
      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        imageObj.onload = () => resolve();
        imageObj.onerror = () => reject(new Error("Failed to load image"));
      });
      imageObj.src = image;
      await imageLoadPromise;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      canvas.width = imageObj.naturalWidth;
      canvas.height = imageObj.naturalHeight;
      ctx.drawImage(imageObj, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas toBlob failed"));
          },
          "image/jpeg",
          0.92
        );
      });
      onSkip(blob);
    } catch {
      onCancel();
    }
  }, [image, onSkip, onCancel]);

  const handlePresetClick = (preset: AspectPreset) => {
    setSelectedPreset(preset);
    setUseCustom(false);
    setCustomW("");
    setCustomH("");
  };

  const handleCustomToggle = () => {
    setUseCustom(!useCustom);
    if (!useCustom) {
      setCustomW("");
      setCustomH("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-background rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold">Crop Image</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative w-full h-80 bg-black">
          <Cropper
            ref={cropperRef}
            src={image}
            className="w-full h-full"
            stencilComponent={RectangleStencil}
            stencilProps={{
              aspectRatio,
              handlers: {
                "north": true,
                "east": true,
                "south": true,
                "west": true,
                "east-north": true,
                "east-south": true,
                "west-north": true,
                "west-south": true,
              },
              lines: {
                north: true,
                east: true,
                south: true,
                west: true,
              },
              grid: true,
              movable: true,
              resizable: true,
            }}
          />
        </div>

        <div className="px-4 py-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Aspect Ratio</span>
            <button
              onClick={handleCustomToggle}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                useCustom ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {useCustom ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              Custom
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ASPECT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  !useCustom && selectedPreset.label === preset.label
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-accent"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {useCustom && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="W"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground shrink-0">:</span>
              <input
                type="number"
                min={1}
                placeholder="H"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="w-full h-8 rounded-lg border bg-background px-2 text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUseOriginal}
            className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-accent transition-colors"
          >
            Use Original
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
