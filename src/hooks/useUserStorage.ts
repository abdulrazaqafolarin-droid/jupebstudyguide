import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Per-user namespaced localStorage hook.
 *
 * Storage key shape:  `u:<userId>:<key>`
 *
 * isReady is scoped to the current storage key, not just to the first successful
 * read. This prevents a previous account's in-memory state from being treated
 * as hydrated data after the user changes.
 */
export function useUserStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, { isReady: boolean; reset: () => void }] {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = userId ? `u:${userId}:${key}` : null;
  const [value, setValue] = useState<T>(defaultValue);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null | undefined>(undefined);
  const isReady = !loading && loadedStorageKey === storageKey;

  useEffect(() => {
    if (loading) return;

    if (!storageKey) {
      setValue(defaultValue);
      setLoadedStorageKey(null);
      return;
    }

    // The previous account's value must not be considered ready for this key.
    setLoadedStorageKey(undefined);
    try {
      const raw = localStorage.getItem(storageKey);
      setValue(raw ? (JSON.parse(raw) as T) : defaultValue);
    } catch (err) {
      console.warn('Failed to read user storage:', err);
      setValue(defaultValue);
    }
    setLoadedStorageKey(storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, loading]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        // Never persist a previous account's stale in-memory value under a
        // newly selected account's key while that account is still hydrating.
        if (storageKey && loadedStorageKey !== storageKey) return prev;

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
    [storageKey, loadedStorageKey],
  );

  const reset = useCallback(() => {
    if (storageKey && loadedStorageKey !== storageKey) return;
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.warn('Failed to reset user storage:', err);
        return;
      }
    }
    setValue(defaultValue);
  }, [storageKey, loadedStorageKey, defaultValue]);

  return [value, update, { isReady, reset }];
}
