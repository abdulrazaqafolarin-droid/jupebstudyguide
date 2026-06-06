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
    } catch (err) {
      console.warn('Failed to read user storage:', err);
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
          } catch (err) {
            console.warn('Failed to write user storage:', err);
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


