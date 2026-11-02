import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAudioAnalyser } from './useAudioAnalyser';
import type { Message } from './useChat';
import {
  getVoiceNoteDurationSeconds,
  getVoiceNoteFileExtension,
  getVoiceRecorderMimeType,
  isDuplicateStorageUploadError,
} from '@/lib/voice-note';

export type RecordingState = 'idle' | 'recording' | 'sending';

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

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
  const recordedDurationRef = useRef(0);
  const cancelledRef = useRef(false);
  const startingRef = useRef(false);
  const sendingRef = useRef(false);
  const clientMessageIdRef = useRef<string | null>(null);

  const {
    waveform,
    startFromStream,
    cleanup: cleanupAnalyser,
    resetWaveform,
  } = useAudioAnalyser();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
  }, []);

  const resetDraft = useCallback(() => {
    clearTimer();
    releaseStream();
    cleanupAnalyser();
    resetWaveform();
    chunksRef.current = [];
    startTimeRef.current = 0;
    recordedDurationRef.current = 0;
    clientMessageIdRef.current = null;
    setDuration(0);
    setIsLocked(false);
    setRecordedBlob(null);
  }, [clearTimer, releaseStream, cleanupAnalyser, resetWaveform]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (startingRef.current || mediaRecorderRef.current?.state === 'recording') return false;

    startingRef.current = true;
    cancelledRef.current = false;
    setError(null);
    chunksRef.current = [];
    setDuration(0);
    setIsLocked(false);
    setRecordedBlob(null);
    recordedDurationRef.current = 0;
    clientMessageIdRef.current = null;
    clearTimer();

    let acquiredStream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Voice recording is not supported by this browser or app version.');
      }

      acquiredStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });

      // A pointer-cancel, screen lock, or conversation switch may happen while
      // the operating-system permission prompt is still open.
      if (cancelledRef.current) {
        stopTracks(acquiredStream);
        return false;
      }

      streamRef.current = acquiredStream;
      await startFromStream(acquiredStream);

      if (cancelledRef.current) {
        releaseStream();
        cleanupAnalyser();
        return false;
      }

      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? getVoiceRecorderMimeType((type) => MediaRecorder.isTypeSupported(type))
        : undefined;
      const recorder = mimeType
        ? new MediaRecorder(acquiredStream, { mimeType })
        : new MediaRecorder(acquiredStream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (cancelledRef.current) return;
        setError('Recording was interrupted. Please try recording again.');
        setRecordingState('idle');
        clearTimer();
        releaseStream();
        cleanupAnalyser();
        mediaRecorderRef.current = null;
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      setRecordingState('recording');

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 250);

      return true;
    } catch (err: unknown) {
      stopTracks(acquiredStream);
      releaseStream();
      cleanupAnalyser();
      mediaRecorderRef.current = null;
      const name = err instanceof DOMException ? err.name : (err as { name?: unknown })?.name;
      const message = err instanceof Error ? err.message : String(err);
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone permission denied. Allow microphone access in your device or browser settings.');
      } else if (name === 'NotFoundError') {
        setError('No microphone was found on this device.');
      } else {
        setError('Could not start recording: ' + message);
      }
      setRecordingState('idle');
      return false;
    } finally {
      startingRef.current = false;
    }
  }, [clearTimer, startFromStream, releaseStream, cleanupAnalyser]);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || cancelledRef.current) {
        resolve(null);
        return;
      }

      clearTimer();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        recorder.onstop = null;
        const actualDuration = getVoiceNoteDurationSeconds(startTimeRef.current);
        recordedDurationRef.current = actualDuration;
        setDuration(actualDuration);
        const mimeType = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
        releaseStream();
        cleanupAnalyser();
        resetWaveform();
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.onstop = finish;
      if (recorder.state === 'inactive') {
        finish();
        return;
      }
      try {
        recorder.stop();
      } catch {
        finish();
      }
    });
  }, [clearTimer, releaseStream, cleanupAnalyser, resetWaveform]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* stream tracks are stopped below */ }
      }
      mediaRecorderRef.current = null;
    }
    resetDraft();
    setRecordingState('idle');
    setError(null);
  }, [clearTimer, resetDraft]);

  const lockRecording = useCallback(async (): Promise<boolean> => {
    if (cancelledRef.current) return false;
    const blob = await stopAndGetBlob();
    if (!blob) {
      setError('No audio was captured. Hold the microphone a little longer and try again.');
      setRecordingState('idle');
      return false;
    }
    setRecordedBlob(blob);
    setIsLocked(true);
    setRecordingState('idle');
    return true;
  }, [stopAndGetBlob]);

  const uploadAndSend = useCallback(async (
    conversationId: string,
    senderId: string,
    currentDuration: number,
    onSent: (message: Message) => void,
    onQueueOffline?: (blob: Blob, senderId: string, duration: number, clientMessageId: string) => void,
  ) => {
    if (sendingRef.current || recordingState === 'sending') return;

    let blob = recordedBlob;
    if (!blob) {
      blob = await stopAndGetBlob();
      if (!blob) {
        setError('No audio was captured. Please try recording again.');
        setRecordingState('idle');
        return;
      }
      setRecordedBlob(blob);
      setIsLocked(true);
    }

    const finalDuration = recordedDurationRef.current || currentDuration ||
      getVoiceNoteDurationSeconds(startTimeRef.current);
    const clientMessageId = clientMessageIdRef.current ?? crypto.randomUUID();
    clientMessageIdRef.current = clientMessageId;

    if (!navigator.onLine) {
      if (!onQueueOffline) {
        setError('You are offline. Reconnect before sending this voice note.');
        setRecordingState('idle');
        setIsLocked(true);
        return;
      }
      try {
        onQueueOffline(blob, senderId, finalDuration, clientMessageId);
        resetDraft();
        setRecordingState('idle');
        setError(null);
      } catch (err) {
        setError('Could not queue this voice note: ' + (err instanceof Error ? err.message : String(err)));
        setRecordingState('idle');
        setIsLocked(true);
      }
      return;
    }

    sendingRef.current = true;
    setRecordingState('sending');
    setError(null);
    let delivered = false;

    try {
      const ext = getVoiceNoteFileExtension(blob.type);
      // A stable object key lets a retry safely reuse an upload whose first
      // request reached Storage but whose response was lost in transit.
      const filePath = `${senderId}/voice-notes/${conversationId}/voice_${clientMessageId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, blob, {
          contentType: blob.type || 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError && !isDuplicateStorageUploadError(uploadError)) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const mins = Math.floor(finalDuration / 60);
      const secs = finalDuration % 60;
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: `Voice note ${mins}:${secs.toString().padStart(2, '0')}`,
          message_type: 'audio',
          file_url: publicUrl,
          file_name: 'Voice note',
          file_type: blob.type || 'application/octet-stream',
          file_size: blob.size,
          client_msg_id: clientMessageId,
        })
        .select()
        .single();

      if (msgError) {
        if ((msgError as { code?: string }).code !== '23505') throw msgError;
        const { data: existing, error: lookupError } = await supabase
          .from('messages')
          .select('*')
          .eq('client_msg_id', clientMessageId)
          .maybeSingle();
        if (lookupError || !existing) throw msgError;
        onSent(existing as unknown as Message);
      } else if (message) {
        onSent(message as unknown as Message);
      }
      delivered = true;
    } catch (err: unknown) {
      setError('Failed to send voice note: ' + (err instanceof Error ? err.message : String(err)));
      console.error('[voice] upload failed:', err);
    } finally {
      sendingRef.current = false;
      setRecordingState('idle');
      if (delivered) {
        resetDraft();
        setError(null);
      } else {
        // Keep the audio and message id so the student can retry without
        // recording again or creating a duplicate message.
        setRecordedBlob(blob);
        setIsLocked(true);
        setDuration(finalDuration);
      }
    }
  }, [recordingState, recordedBlob, stopAndGetBlob, resetDraft]);

  useEffect(() => () => {
    cancelledRef.current = true;
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* unmount cleanup */ }
      }
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    cleanupAnalyser();
  }, [clearTimer, cleanupAnalyser]);

  return {
    recordingState,
    duration,
    error,
    waveform,
    isLocked,
    recordedBlob,
    startRecording,
    stopAndGetBlob,
    cancelRecording,
    lockRecording,
    uploadAndSend,
  };
}
