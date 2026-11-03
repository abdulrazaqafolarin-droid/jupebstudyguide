# Student Chat Voice Notes — Current Implementation

This document describes the voice-note system that is actually used by the student-to-student chat. It supersedes the earlier rebuild instructions in this file. **Extend the existing implementation; do not replace it with the simplified example recorder below.**

## Source of truth

| Responsibility | File |
|---|---|
| Chat composer, gesture handling, recording presence, message bubble integration | `src/components/chat/ChatArea.tsx` |
| Recording state, MediaRecorder lifecycle, Blob creation, upload, retry | `src/hooks/useVoiceRecorder.ts` |
| Recording / locked-preview / sending presentation and animations | `src/components/chat/VoiceRecorder.tsx` |
| Sent audio-message playback, waveform, seek, download | `src/components/chat/VoiceNotePlayer.tsx` |
| Microphone state and permission preflight | `src/hooks/useMicPermission.ts` |
| Live microphone waveform analysis | `src/hooks/useAudioAnalyser.ts` |
| Live recording presence | `src/contexts/PresenceContext.tsx` |
| Message creation and in-memory offline queue | `src/hooks/useChat.ts` |
| Recorder format, MIME extension, duration and retry helpers | `src/lib/voice-note.ts` |
| One-active-player coordination | `src/lib/voice-note-audio.ts` |
| Helper tests | `src/lib/voice-note.test.ts` |

## Supported student journey

1. **Permission preparation.** The first use shows the in-app explanation. The user explicitly grants microphone access; a previously denied permission shows browser / Android settings guidance. Permission probing is separate from recording.
2. **Press and hold.** A pointer-down begins microphone acquisition. Pointer listeners are attached immediately, before awaiting the microphone request, so a quick release cannot be lost during startup.
3. **Recording state.** The normal message composer is replaced by the recording capsule. It shows elapsed time, a live waveform, a recording pulse, and gesture hints.
4. **Slide left to cancel.** Moving left by the cancel threshold and releasing discards the draft and stops microphone tracks.
5. **Release to send.** Releasing normally finalizes the audio Blob and sends it automatically.
6. **Slide up to lock.** Moving up and releasing stops capture but keeps a preview. The student can listen, discard, or explicitly send it.
7. **Sending and recovery.** The UI changes to a sending state. A failed send keeps the Blob and stable message ID so the student can retry without recording again.
8. **Recipient playback.** The sent message appears as an audio bubble with an animated waveform, playback, seek, and download controls. Only one voice-note preview or message is allowed to play at once.
9. **Presence.** While a user records, the existing PresenceContext publishes `recording_vn_in` for the active conversation. Direct-message and group headers render the appropriate recording state.
10. **Offline.** If the device is offline at send time, the Blob and stable message ID enter the existing `useChat` queue. The queue flushes on the browser's `online` event and can also be retried from the chat UI.

## Database and storage contract — do not change casually

Voice notes use the same message schema as other chat attachments:

- `messages.message_type = 'audio'`
- `messages.file_url` contains the public URL in the existing `chat-files` bucket
- `messages.file_name` is normally `Voice note`
- `messages.file_type` stores the actual MediaRecorder MIME type
- `messages.file_size` stores the Blob size
- `messages.client_msg_id` is the stable idempotency key
- `messages.content` contains a short duration label such as `Voice note 0:08`

Storage keys are scoped to the sender's first path segment to comply with the existing chat-files storage policy:

`{senderId}/voice-notes/{conversationId}/voice_{clientMessageId}.{extension}`

The sender folder is required by the current upload RLS policy. The deterministic object key and stable `client_msg_id` let retries reconcile an upload or insert whose first response was lost.

**Do not introduce `message_type = 'voice'`, `audio_url`, or `duration_seconds` without a separate schema migration and a deliberate migration of every existing chat reader, notification path, and queue.** Those columns are not the current voice-note contract.

## Interaction rules

- A normal release sends; a left swipe cancels; an upward swipe locks for preview.
- Pointer-up, pointer-cancel, window blur, and app backgrounding must all be handled.
- A conversation change or component unmount must stop capture, release tracks, clean up the analyser, and clear recording presence.
- Recording and sending must not create duplicate message rows on rapid taps or network retries.
- Microphone permission errors, unsupported recording APIs, missing microphones, and upload errors must leave the composer in a recoverable state.
- Keep the existing permission onboarding and offline queue. Do not create a second parallel presence channel or message schema.
- Keep recording animations compact, safe on narrow Android screens, and respectful of touch interaction. The recording capsule replaces the composer; it must not stack on top of it.

## Important current boundary

The offline queue is currently held in memory by `useChat`. It retries automatically when connectivity returns while the app is still running, but it is **not a durable queue across a full app/browser restart**. Durable IndexedDB persistence would be a separate enhancement; do not claim that an offline voice note survives force-stop or app data clearing.

Playback is subject to the device/browser audio decoder and output routing. Do not expose an earpiece control unless a supported native audio-routing implementation is actually wired and verified on the target platform.

## Verification before merge or release

Run the repository checks:

```sh
npx tsc --noEmit -p tsconfig.app.json --pretty false
npx tsc --noEmit -p tsconfig.node.json --pretty false
npx tsc --noEmit -p tsconfig.sw.json --pretty false
npm test -- --reporter=dot
npm run build
```

Then verify on a real Android device and a desktop browser:

1. First-use permission explanation, allow, deny, and settings recovery.
2. Press/hold, immediate release during startup, normal release-to-send.
3. Swipe-left cancel and swipe-up lock, preview, discard, and send.
4. Background the app, switch conversations, or unmount while recording; microphone capture and presence must stop.
5. Confirm the other participant sees the live recording state in a DM and group.
6. Confirm a sent message is an `audio` row with `file_url`, and that recipients can play, pause, seek, and download it.
7. Start another voice note while one is playing; the first must pause.
8. Simulate offline send, reconnect, flush the queue, and retry after an ambiguous upload/insert response; no duplicate message should appear.
9. Verify microphone, storage, playback, and upload failures leave a clear recovery path.
10. Check narrow mobile layout, touch targets, scroll behavior, and reduced-motion preferences.

The current implementation uses the existing Supabase schema and storage bucket. A feature branch / draft PR is not a production deployment; merge and release are separate decisions.
