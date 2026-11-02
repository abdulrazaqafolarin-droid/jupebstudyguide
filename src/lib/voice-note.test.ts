import { describe, expect, it, vi } from "vitest";
import {
  formatVoiceNoteDuration,
  getVoiceNoteDurationSeconds,
  getVoiceNoteFileExtension,
  getVoiceRecorderMimeType,
  isDuplicateStorageUploadError,
} from "./voice-note";

describe("voice note helpers", () => {
  it("selects the first supported recorder format and leaves browser defaults available", () => {
    expect(getVoiceRecorderMimeType((type) => type === "audio/mp4")).toBe("audio/mp4");
    expect(getVoiceRecorderMimeType(() => false)).toBeUndefined();
  });

  it("maps encoded media types to matching file extensions", () => {
    expect(getVoiceNoteFileExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(getVoiceNoteFileExtension("audio/mp4")).toBe("mp4");
    expect(getVoiceNoteFileExtension("audio/ogg;codecs=opus")).toBe("ogg");
    expect(getVoiceNoteFileExtension("audio/wav")).toBe("wav");
    expect(getVoiceNoteFileExtension("audio/mpeg")).toBe("mp3");
  });

  it("rounds elapsed recording time up without inventing time for an empty recording", () => {
    expect(getVoiceNoteDurationSeconds(1000, 1000)).toBe(0);
    expect(getVoiceNoteDurationSeconds(1000, 1100)).toBe(1);
    expect(getVoiceNoteDurationSeconds(1000, 2050)).toBe(2);
    expect(getVoiceNoteDurationSeconds(1000, 65000)).toBe(64);
  });

  it("formats playback and recording durations safely", () => {
    expect(formatVoiceNoteDuration(0)).toBe("0:00");
    expect(formatVoiceNoteDuration(9)).toBe("0:09");
    expect(formatVoiceNoteDuration(125)).toBe("2:05");
    expect(formatVoiceNoteDuration(Number.NaN)).toBe("0:00");
  });

  it("recognizes an idempotent storage-object conflict", () => {
    expect(isDuplicateStorageUploadError({ statusCode: 409 })).toBe(true);
    expect(isDuplicateStorageUploadError({ message: "The resource already exists" })).toBe(true);
    expect(isDuplicateStorageUploadError({ statusCode: 400, message: "Payload too large" })).toBe(false);
    expect(isDuplicateStorageUploadError(null)).toBe(false);
  });
});


describe("voice note playback coordination", () => {
  it("pauses the previous voice note when a new one starts", async () => {
    const { claimVoiceNotePlayback, releaseVoiceNotePlayback } = await import("./voice-note-audio");
    const first = { pause: vi.fn() };
    const second = { pause: vi.fn() };

    claimVoiceNotePlayback(first);
    claimVoiceNotePlayback(second);

    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(second.pause).not.toHaveBeenCalled();

    releaseVoiceNotePlayback(first);
    const third = { pause: vi.fn() };
    claimVoiceNotePlayback(third);
    expect(second.pause).toHaveBeenCalledTimes(1);
    releaseVoiceNotePlayback(third);
  });

  it("does not let an old player release a newer player's ownership", async () => {
    const { claimVoiceNotePlayback, releaseVoiceNotePlayback } = await import("./voice-note-audio");
    const current = { pause: vi.fn() };
    const stale = { pause: vi.fn() };
    const next = { pause: vi.fn() };

    claimVoiceNotePlayback(current);
    claimVoiceNotePlayback(stale);
    releaseVoiceNotePlayback(current);
    claimVoiceNotePlayback(next);

    expect(stale.pause).toHaveBeenCalledTimes(1);
    releaseVoiceNotePlayback(next);
  });
});
