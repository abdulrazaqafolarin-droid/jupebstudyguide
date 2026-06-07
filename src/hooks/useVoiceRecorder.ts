import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RecordingState = 'idle' | 'recording' | 'paused';

export function useVoiceRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    chunksRef.current = [];
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setRecordingState('recording');

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found on this device.');
      } else {
        setError('Could not start recording: ' + err.message);
      }
      setRecordingState('idle');
      return false;
    }
  }, []);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }

      if (timerRef.current) clearInterval(timerRef.current);

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecordingState('idle');
    setDuration(0);
    chunksRef.current = [];
  }, []);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingState('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      setRecordingState('recording');
    }
  }, []);

  const uploadAndSend = useCallback(async (
    blob: Blob,
    conversationId: string,
    senderId: string,
    currentDuration: number,
    onSent: (message: any) => void,
    onBroadcast?: (message: any) => void
  ) => {
    setIsUploading(true);

    try {
      // Step 1: Insert placeholder text message immediately
      const { data: placeholder, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: 'Voice note...',
          message_type: 'text',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      onSent(placeholder);
      onBroadcast?.(placeholder);

      // Step 2: Upload the audio blob
      const ext = blob.type.includes('mp4') ? 'mp4'
        : blob.type.includes('ogg') ? 'ogg' : 'webm';

      const fileName = `voice_${Date.now()}_${senderId}.${ext}`;
      const filePath = `voice-notes/${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const mins = Math.floor(currentDuration / 60);
      const secs = currentDuration % 60;

      // Step 3: Update placeholder to audio message
      const { data: updated, error: updateError } = await supabase
        .from('messages')
        .update({
          content: `Voice note ${mins}:${secs.toString().padStart(2, '0')}`,
          message_type: 'audio',
          file_url: publicUrl,
          file_name: 'Voice note',
          file_type: blob.type,
          file_size: blob.size,
        })
        .eq('id', placeholder.id)
        .select()
        .single();

      if (updateError) throw updateError;
      onSent(updated);
      onBroadcast?.(updated);
    } catch (err: any) {
      setError('Failed to send voice note: ' + err.message);
      console.error('[voice] upload failed:', err);
    } finally {
      setIsUploading(false);
      setDuration(0);
    }
  }, []);

  return {
    recordingState,
    duration,
    error,
    isUploading,
    startRecording,
    stopAndGetBlob,
    cancelRecording,
    pauseRecording,
    resumeRecording,
    uploadAndSend,
  };
}
