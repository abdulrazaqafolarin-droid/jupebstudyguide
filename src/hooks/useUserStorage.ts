import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Per-user namespaced localStorage hook.
 *
 * Why this exists:
 * Multiple users can sign in on the same browser/device. If we use a global
 * localStorage key like "jupeb_streak_data", User B will see User A's data
 * after sign-in. This hook namespaces every key by the authenticated user's
 * id, and returns the `defaultValue` whenever no user is signed in.
 *
 * Guarantees:
 *  - Reading before auth resolves returns `defaultValue` (no leak from any prior user).
 *  - Switching accounts in the same tab automatically loads the new user's data.
 *  - Signing out clears in-memory state back to `defaultValue`.
 *  - Writes are scoped to the current user only.
 *
 * Storage key shape:  `u:<userId>:<key>`
 */
export function useUserStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, { isReady: boolean; reset: () => void }] {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  const storageKey = userId ? `u:${userId}:${key}` : null;
  const [value, setValue] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);
  const lastUserId = useRef<string | null>(null);

  // Hydrate when the active user changes.
  useEffect(() => {
    if (loading) return;

    // No user signed in → reset to defaults, never touch storage.
    if (!storageKey) {
      setValue(defaultValue);
      setIsReady(true);
      lastUserId.current = null;
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      setValue(raw ? (JSON.parse(raw) as T) : defaultValue);
    } catch {
      setValue(defaultValue);
    }
    setIsReady(true);
    lastUserId.current = userId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, loading]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(resolved));
          } catch {
            /* quota / serialization */
          }
        }
        return resolved;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setValue(defaultValue);
  }, [storageKey, defaultValue]);

  return [value, update, { isReady, reset }];
}

/**
 * Purge any user-scoped or legacy global keys that don't belong to `currentUserId`.
 * Call this on sign-in and sign-out to guarantee zero cross-account residue.
 *
 * - Removes every `u:<otherUserId>:*` entry.
 * - Removes the legacy un-namespaced keys we used to write globally.
 * - Preserves Supabase auth session keys and the user's own namespace.
 */
const LEGACY_KEYS = [
  'jupeb-study-progress',
  'jupeb_streak_data',
  'jupeb_achievements_unlocked',
  'jupeb_syllabus_progress',
  'jupeb-chat-hub',
];

export function purgeForeignUserData(currentUserId: string | null) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Always nuke legacy global keys — they leak across accounts.
      if (LEGACY_KEYS.includes(k)) {
        toRemove.push(k);
        continue;
      }

      // Remove any other user's namespaced data.
      if (k.startsWith('u:')) {
        const ownerId = k.split(':')[1];
        if (!currentUserId || ownerId !== currentUserId) {
          toRemove.push(k);
        }
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
