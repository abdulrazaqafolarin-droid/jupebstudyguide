type PausableVoiceAudio = Pick<HTMLMediaElement, "pause">;

let activeVoiceAudio: PausableVoiceAudio | null = null;

/** Only one voice note preview or message may play at a time, like a chat app. */
export function claimVoiceNotePlayback(audio: PausableVoiceAudio): void {
  if (activeVoiceAudio && activeVoiceAudio !== audio) {
    activeVoiceAudio.pause();
  }
  activeVoiceAudio = audio;
}

/** Release ownership only when the caller is still the active player. */
export function releaseVoiceNotePlayback(audio: PausableVoiceAudio): void {
  if (activeVoiceAudio === audio) {
    activeVoiceAudio = null;
  }
}
