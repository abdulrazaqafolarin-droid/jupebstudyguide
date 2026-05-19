import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

const MAX_SIZE = 10 * 1024 * 1024;
const VALID_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function base64ToFile(base64: string, filename: string, mime: string): File {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  return new File([byteArray], filename, { type: mime });
}

export function useImageUpload(userId: string | undefined) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (isNative) {
      try {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          quality: 85,
        });
        if (photo.base64String) {
          const file = base64ToFile(photo.base64String, `capture-${Date.now()}.jpg`, "image/jpeg");
          setImage(file);
          setPreview(`data:image/jpeg;base64,${photo.base64String}`);
        }
      } catch {
        toast.error("Camera cancelled or unavailable");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      toast.error("Camera not available. Use file upload instead.");
    }
  }, [isNative]);

  const handleNativeFilePick = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        quality: 85,
      });
      if (photo.base64String) {
        const mime = photo.format === "png" ? "image/png" : "image/jpeg";
        const file = base64ToFile(photo.base64String, `upload-${Date.now()}.${photo.format}`, mime);
        if (file.size > MAX_SIZE) { toast.error("Image must be less than 10MB"); return; }
        setImage(file);
        setPreview(`data:${mime};base64,${photo.base64String}`);
      }
    } catch {
      toast.error("Image picker cancelled");
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImage(file);
      setPreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg", 0.85);
  }, [stopCamera]);

  const handleFileSelect = useCallback((file: File) => {
    if (!VALID_TYPES.some((t) => file.type === t)) {
      toast.error("Only PNG, JPG, WebP images supported");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be less than 10MB");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  }, [handleFileSelect]);

  const handlePickImage = useCallback(() => {
    if (isNative) {
      handleNativeFilePick();
    } else {
      fileInputRef.current?.click();
    }
  }, [isNative, handleNativeFilePick]);

  const upload = useCallback(async (): Promise<string | null> => {
    if (!image || !userId) return null;
    setUploading(true);
    try {
      const ext = image.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from("answer-images").upload(fileName, image, {
        contentType: image.type,
      });
      if (error) { toast.error("Upload failed"); return null; }
      const { data: { publicUrl: url } } = supabase.storage.from("answer-images").getPublicUrl(data.path);
      setPublicUrl(url);
      return url;
    } finally {
      setUploading(false);
    }
  }, [image, userId]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    setPublicUrl(null);
    stopCamera();
  }, [preview, stopCamera]);

  return {
    image, preview, uploading, publicUrl, showCamera, videoRef,
    fileInputRef, startCamera, stopCamera, captureFrame, handleFileInput,
    handlePickImage, upload, reset,
  };
}
