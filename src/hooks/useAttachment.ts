import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Attachment {
  file: File;
  base64: string;
  mimeType: string;
  name: string;
  preview?: string;
}

const VALID_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function useAttachment() {
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addAttachment = useCallback(async (file: File) => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    const isValid = VALID_TYPES.some(type => file.type === type || file.type.startsWith(type.split('/')[0] + '/'));
    if (!isValid) {
      toast.error('Supported: PDF, text, images (PNG, JPG, WebP)');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File must be less than 10MB');
      return;
    }
    if (file.size === 0) {
      toast.error('File is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      setAttachment({
        file,
        base64,
        mimeType: file.type,
        name: file.name,
        preview,
      });
    } catch {
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearAttachment = useCallback(() => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  }, [attachment]);

  return { attachment, isProcessing, addAttachment, clearAttachment };
}
