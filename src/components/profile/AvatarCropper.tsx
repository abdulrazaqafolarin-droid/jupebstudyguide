import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { UserAvatar } from '@/components/UserAvatar';

interface AvatarCropperProps {
  currentUrl?: string | null;
  currentName?: string | null;
  uploading: boolean;
  onFileSelect: (file: File) => void;
}

export function AvatarCropper({ currentUrl, currentName, uploading, onFileSelect }: AvatarCropperProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
    onFileSelect(file);
    e.target.value = '';
  }, [onFileSelect]);

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
        <div className="relative">
          <UserAvatar
            url={preview || currentUrl}
            name={currentName}
            className="w-28 h-28 ring-2 ring-primary/20"
            viewable
            isOwn
            onOwnPhotoAction={() => fileRef.current?.click()}
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 border-2 border-background"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="w-full text-xs"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              Rotate
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
