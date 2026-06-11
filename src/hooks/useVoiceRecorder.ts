import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAudioAnalyser } from './useAudioAnalyser';

export type RecordingState = 'idle' | 'recording' | 'sending';

export function useVoiceRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const {
    waveform,
    startFromStream,
    cleanup: cleanupAnalyser,
    resetWaveform,
  } = useAudioAnalyser();

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    chunksRef.current = [];
    setDuration(0);
    setIsLocked(false);
    setRecordedBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      });
      streamRef.current = stream;

      await startFromStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
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
      cleanupAnalyser();
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
  }, [startFromStream, cleanupAnalyser]);

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
        cleanupAnalyser();
        resetWaveform();
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.stop();
    });
  }, [cleanupAnalyser, resetWaveform]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cleanupAnalyser();
    resetWaveform();
    setRecordingState('idle');
    setDuration(0);
    setIsLocked(false);
    setRecordedBlob(null);
    chunksRef.current = [];
  }, [cleanupAnalyser, resetWaveform]);

  const lockRecording = useCallback(async (): Promise<boolean> => {
    const blob = await stopAndGetBlob();
    if (blob) {
      setRecordedBlob(blob);
      setIsLocked(true);
      setRecordingState('idle');
      return true;
    }
    return false;
  }, [stopAndGetBlob]);

  const uploadAndSend = useCallback(async (
    conversationId: string,
    senderId: string,
    currentDuration: number,
    onSent: (message: any) => void,
    onQueueOffline?: (blob: Blob, senderId: string, duration: number) => void,
  ) => {
    const blob = recordedBlob;
    if (!blob) return;

    if (!navigator.onLine) {
      onQueueOffline?.(blob, senderId, currentDuration);
      setRecordingState('idle');
      setDuration(0);
      setIsLocked(false);
      setRecordedBlob(null);
      resetWaveform();
      return;
    }

    setRecordingState('sending');

    try {
      const ext = blob.type.includes('mp4') ? 'mp4'
        : blob.type.includes('ogg') ? 'ogg'
        : blob.type.includes('opus') ? 'webm'
        : 'webm';

      const fileName = `voice_${Date.now()}_${senderId}.${ext}`;
      const filePath = `${senderId}/voice-notes/${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, blob, {
          contentType: blob.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const mins = Math.floor(currentDuration / 60);
      const secs = currentDuration % 60;

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: `Voice note ${mins}:${secs.toString().padStart(2, '0')}`,
          message_type: 'audio',
          file_url: publicUrl,
          file_name: 'Voice note',
          file_type: blob.type,
          file_size: blob.size,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      onSent(message);
    } catch (err: any) {
      setError('Failed to send voice note: ' + err.message);
      console.error('[voice] upload failed:', err);
    } finally {
      setRecordingState('idle');
      setDuration(0);
      setIsLocked(false);
      setRecordedBlob(null);
      resetWaveform();
    }
  }, [recordedBlob, resetWaveform]);

  return {
    recordingState,
    duration,
    error,
    waveform,
    isLocked,
    startRecording,
    stopAndGetBlob,
    cancelRecording,
    lockRecording,
    uploadAndSend,
  };
}
