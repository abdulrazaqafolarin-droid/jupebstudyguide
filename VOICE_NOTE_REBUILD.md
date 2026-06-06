# MISSION: REBUILD VOICE NOTE UX TO MATCH WHATSAPP EXACTLY

## Current problems
1. Recording triggers on tap — should be hold to record, release to send
2. Recording UI overlaps other elements incorrectly
3. Other user does not see "recording..." indicator while sender records
4. Overall UX does not match WhatsApp voice note behaviour

Rebuild the entire voice note UX. Do not patch the old implementation.
Replace it completely with the spec below.

---

## HOW IT MUST WORK — EXACT WHATSAPP BEHAVIOUR

1. User HOLDS DOWN the mic button → recording starts instantly
2. While holding — the entire input bar transforms into recording UI
3. User SLIDES LEFT while holding → recording cancels (no send)
4. User RELEASES the mic button → recording stops and sends automatically
5. While recording — the OTHER user sees "recording..." in the
   conversation header or below the chat partner's name
6. After send — voice note appears as an audio player bubble in chat
7. No separate send button needed — release = send

---

## STEP 1 — ADD SQL MIGRATION IF COLUMNS MISSING

First check if these columns exist on the messages table:
- message_type (text)
- audio_url (text)
- duration_seconds (integer)

If any are missing run in Supabase SQL Editor:

```sql
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
```

---

## STEP 2 — REBUILD useVoiceRecorder HOOK

Replace the entire contents of `src/hooks/useVoiceRecorder.ts` with:

```typescript
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RecordingState = 'idle' | 'recording' | 'sending';

export function useVoiceRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsCancelled(false);
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
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found on this device.');
      } else {
        setError('Could not start recording: ' + err.message);
      }
      setRecordingState('idle');
    }
  }, []);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) { resolve(null); return; }

      if (timerRef.current) clearInterval(timerRef.current);

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        resolve(blob.size > 0 ? blob : null);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    setIsCancelled(true);
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

  const uploadAndSend = useCallback(async (
    blob: Blob,
    conversationId: string,
    senderId: string,
    currentDuration: number,
    onSent: (message: any) => void
  ) => {
    setRecordingState('sending');

    try {
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

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: '[Voice message]',
          message_type: 'voice',
          audio_url: publicUrl,
          duration_seconds: currentDuration,
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
    }
  }, []);

  return {
    recordingState,
    duration,
    error,
    startRecording,
    stopAndGetBlob,
    cancelRecording,
    uploadAndSend,
  };
}
```

---

## STEP 3 — REBUILD THE MIC BUTTON WITH HOLD BEHAVIOUR

Find the mic button in the chat input component.
Replace it entirely with this hold-to-record implementation:

```typescript
const {
  recordingState,
  duration,
  error: recordingError,
  startRecording,
  stopAndGetBlob,
  cancelRecording,
  uploadAndSend,
} = useVoiceRecorder();

const isRecording = recordingState === 'recording';
const isSending = recordingState === 'sending';

// Track if user slid left to cancel
const slideRef = useRef(false);
const startXRef = useRef(0);

const handlePointerDown = async (e: React.PointerEvent) => {
  slideRef.current = false;
  startXRef.current = e.clientX;
  e.preventDefault();
  await startRecording();
  // Broadcast recording indicator to other user
  broadcastRecording(true);
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!isRecording) return;
  const diff = startXRef.current - e.clientX;
  // If slid left more than 80px — mark as cancelled
  if (diff > 80) {
    slideRef.current = true;
  }
};

const handlePointerUp = async (e: React.PointerEvent) => {
  if (!isRecording) return;
  // Stop broadcasting recording indicator
  broadcastRecording(false);

  if (slideRef.current) {
    // Slid left — cancel
    cancelRecording();
    return;
  }

  // Release — stop and send
  const blob = await stopAndGetBlob();
  if (blob && conversationId && currentUserId) {
    await uploadAndSend(
      blob,
      conversationId,
      currentUserId,
      duration,
      (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    );
  }
};
```

The mic button element:

```tsx
<button
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerLeave={handlePointerUp}
  className={`p-2 rounded-full transition-all select-none touch-none
    ${isRecording
      ? 'bg-red-500 text-white scale-125'
      : 'text-muted-foreground hover:text-foreground'
    }`}
  style={{ userSelect: 'none' }}
>
  <Mic className="w-5 h-5" />
</button>
```

---

## STEP 4 — RECORDING UI THAT REPLACES INPUT BAR

When `isRecording` is true, the ENTIRE input bar must be replaced.
Not overlaid — replaced. Use conditional rendering:

```tsx
{/* Input area */}
<div className="border-t bg-background">
  {isRecording ? (
    // RECORDING STATE — replaces entire input bar
    <div className="flex items-center gap-3 px-4 py-3 h-14">
      {/* Cancel hint — slide left */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-xs">Slide to cancel</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Duration */}
      <span className="text-sm font-mono text-red-500 font-medium">
        {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
      </span>

      {/* Pulsing dot */}
      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />

      {/* Mic button — hold active */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="p-2 rounded-full bg-red-500 text-white scale-125
           select-none touch-none"
        style={{ userSelect: 'none' }}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  ) : isSending ? (
    // SENDING STATE
    <div className="flex items-center gap-3 px-4 py-3 h-14">
      <span className="text-sm text-muted-foreground">Sending voice note...</span>
    </div>
  ) : (
    // NORMAL INPUT STATE — your existing input bar here
    <YourExistingInputBar />
  )}
</div>
```

---

## STEP 5 — BROADCAST RECORDING INDICATOR TO OTHER USER

In `useRealtimeChat.ts` add a recording broadcast listener:

```typescript
// Listen for recording indicator from other user
channel.on('broadcast', { event: 'recording' }, ({ payload }) => {
  if (payload.user_id !== currentUserId) {
    onRecordingUpdate(payload.is_recording);
  }
});
```

Add `onRecordingUpdate` to the hook props:

```
onRecordingUpdate: (isRecording: boolean) => void;
```

In the chat component add state and pass to hook:

```typescript
const [otherUserRecording, setOtherUserRecording] = useState(false);

onRecordingUpdate: (isRecording) => {
  setOtherUserRecording(isRecording);
}
```

Add `broadcastRecording` function in the chat component:

```typescript
const broadcastRecording = (isRecording: boolean) => {
  // Access the channel via a ref exposed from useRealtimeChat
  channelRef.current?.send({
    type: 'broadcast',
    event: 'recording',
    payload: {
      user_id: currentUserId,
      is_recording: isRecording,
    },
  });
};
```

IMPORTANT: expose `channelRef` from `useRealtimeChat` hook:

```typescript
return { sendTypingIndicator, broadcastRecording, channelRef };
```

Show recording indicator to the other user — in the chat header or just above the message list:

```tsx
{otherUserRecording && (
  <div className="flex items-center gap-2 px-4 py-1
     bg-muted/50 text-xs text-muted-foreground">
    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    <span>recording...</span>
  </div>
)}
```

---

## STEP 6 — VOICE NOTE AUDIO PLAYER IN CHAT BUBBLE

Find where message bubbles are rendered. Add voice note player:

```tsx
{message.message_type === 'voice' && message.audio_url ? (
  <div className="flex items-center gap-2 min-w-52 max-w-64 py-1">
    <audio
      controls
      src={message.audio_url}
      className="w-full h-8"
      preload="metadata"
    />
    {message.duration_seconds && (
      <span className="text-xs text-muted-foreground shrink-0">
        {Math.floor(message.duration_seconds / 60)}:
        {String(message.duration_seconds % 60).padStart(2, '0')}
      </span>
    )}
  </div>
) : (
  // existing text message rendering
  <p>{message.content}</p>
)}
```

---

## VERIFICATION — DO NOT DEPLOY UNTIL ALL PASS

1. Hold mic button → recording starts, input bar replaced with
   recording UI, red pulsing dot and timer appear
2. Slide left while holding → recording cancels, input bar returns
3. Release mic button → recording stops, uploads, voice bubble
   appears in chat without page reload
4. Other user sees "recording..." indicator while first user records
5. Voice bubble shows native audio player — recipient can play it
6. No UI overlap — recording bar sits cleanly where input bar was
7. Error message shows clearly if microphone permission is denied
