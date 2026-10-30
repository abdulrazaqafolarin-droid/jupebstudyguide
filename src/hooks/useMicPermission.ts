import { useCallback, useEffect, useState } from 'react';

export type MicPermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

/**
 * Microphone permission state + request helper for voice notes.
 *
 * - Reads the Permissions API where available (Chrome, Firefox, Safari 16+)
 *   so we know BEFORE the press-hold gesture whether the mic is allowed,
 *   blocked, or still to be asked — and reacts to changes made in browser
 *   settings while the app is open.
 * - `request()` is the actual ask: getUserMedia is the only portable way to
 *   trigger the system prompt (the Permissions API can read but not ask).
 *   The stream is stopped immediately — this is a permission probe, not a
 *   recording.
 * - `unknown` means the Permissions API isn't available (older WebViews /
 *   Safari): we fall back to asking at the point of use.
 */
export function useMicPermission() {
  const [state, setState] = useState<MicPermissionState>('unknown');

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;

    const apply = (s: PermissionStatus) => {
      setState(s.state === 'granted' ? 'granted' : s.state === 'denied' ? 'denied' : 'prompt');
    };

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        apply(s);
        s.onchange = () => apply(s);
      })
      .catch(() => {
        // Unsupported query for 'microphone' — point-of-use fallback.
        if (!cancelled) setState('unknown');
      });

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('denied');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState('granted');
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setState('denied');
      // NotFoundError etc. leave the state as-is — the recorder reports it.
      return false;
    }
  }, []);

  return { state, request };
}
