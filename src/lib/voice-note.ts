/** Shared, browser-independent helpers for voice-note capture and delivery. */

const RECORDER_MIME_PREFERENCES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

/** Return a recorder MIME type only when the current browser explicitly supports it. */
export function getVoiceRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): string | undefined {
  return RECORDER_MIME_PREFERENCES.find((mimeType) => isTypeSupported(mimeType));
}

/** Use a file suffix that matches the encoded container rather than the browser. */
export function getVoiceNoteFileExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (normalized === "audio/mp4") return "mp4";
  if (normalized === "audio/ogg") return "ogg";
  if (normalized === "audio/wav" || normalized === "audio/wave") return "wav";
  if (normalized === "audio/mpeg" || normalized === "audio/mp3") return "mp3";
  return "webm";
}

/** Round a non-zero recording up so a short note never displays as 0:00. */
export function getVoiceNoteDurationSeconds(startedAt: number, stoppedAt = Date.now()): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(stoppedAt) || stoppedAt <= startedAt) return 0;
  return Math.max(1, Math.ceil((stoppedAt - startedAt) / 1000));
}

export function formatVoiceNoteDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

/** Supabase Storage reports an already-uploaded deterministic object as a conflict. */
export function isDuplicateStorageUploadError(
  error: { message?: string | null; statusCode?: string | number | null } | null | undefined,
): boolean {
  if (!error) return false;
  return String(error.statusCode ?? "") === "409" ||
    /already exists|duplicate|resource exists/i.test(error.message ?? "");
}

export type VoiceNoteGestureAction = "cancel" | "lock" | "send";

/** Resolve the release gesture consistently: left-to-cancel takes precedence over up-to-lock. */
export function getVoiceNoteGestureAction(
  deltaX: number,
  deltaY: number,
): VoiceNoteGestureAction {
  if (deltaX <= -80) return "cancel";
  if (deltaY <= -70) return "lock";
  return "send";
}
