import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 3;
const VALID_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

function base64ToFile(base64: string, filename: string, mime: string): File {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  return new File([byteArray], filename, { type: mime });
}

export interface ImageItem {
  file: File;
  preview: string;
  publicUrl?: string;
}

export function useImageUpload(userId: string | undefined) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
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

  const addImage = useCallback((file: File) => {
    if (!VALID_TYPES.some((t) => file.type === t)) {
      toast.error("Only PNG, JPG, WebP images and PDF files supported");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Each file must be less than 10MB");
      return;
    }
    setImages(prev => {
      if (prev.length >= MAX_IMAGES) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return prev;
      }
      const preview = file.type === "application/pdf"
        ? ""
        : URL.createObjectURL(file);
      return [...prev, { file, preview }];
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const item = prev[index];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
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
          addImage(file);
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
  }, [isNative, addImage]);

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
        addImage(file);
      }
    } catch {
      toast.error("Image picker cancelled");
    }
  }, [addImage]);

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
      addImage(file);
      stopCamera();
    }, "image/jpeg", 0.85);
  }, [addImage, stopCamera]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const clamped = Array.from(files).slice(0, MAX_IMAGES);
      clamped.forEach(f => addImage(f));
    }
    e.target.value = "";
  }, [addImage]);

  const handlePickImage = useCallback(() => {
    if (isNative) {
      handleNativeFilePick();
    } else {
      fileInputRef.current?.click();
    }
  }, [isNative, handleNativeFilePick]);

  const uploadAll = useCallback(async (): Promise<string[]> => {
    if (!images.length || !userId) return [];
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const item of images) {
        const ext = item.file.name.split(".").pop() || "jpg";
        const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabase.storage.from("answer-images").upload(fileName, item.file, {
          contentType: item.file.type,
        });
        if (error) {
          toast.error(`Upload failed for ${item.file.name}`);
          urls.push("");
          continue;
        }
        const { data: { publicUrl: url } } = supabase.storage.from("answer-images").getPublicUrl(data.path);
        item.publicUrl = url;
        urls.push(url);
      }
      return urls;
    } finally {
      setUploading(false);
    }
  }, [images, userId]);

  const reset = useCallback(() => {
    images.forEach(item => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setImages([]);
    stopCamera();
  }, [images, stopCamera]);

  return {
    images, uploading, showCamera, videoRef,
    fileInputRef, startCamera, stopCamera, captureFrame, handleFileInput,
    handlePickImage, addImage, removeImage, uploadAll, reset,
  };
}
