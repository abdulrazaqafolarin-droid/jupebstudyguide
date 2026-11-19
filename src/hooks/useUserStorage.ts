import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** One-time migration for local JUPEB preferences written before programme namespaces existed. */
export function getLegacyProgramStorageKey(key: string): string | null {
  const legacyKeys: Record<string, string> = {
    'onboarding-subjects:jupeb': 'onboarding-subjects',
    'onboarding-daily-goal:jupeb': 'onboarding-daily-goal',
    'onboarding-nudge-dismissed:jupeb': 'onboarding-nudge-dismissed',
  };
  return legacyKeys[key] ?? null;
}

/**
 * Per-user namespaced localStorage hook.
 *
 * Storage key shape:  `u:<userId>:<key>`
 *
 * For the three JUPEB onboarding keys above, the first read copies a value
 * from the old unscoped JUPEB key into the JUPEB namespace. The old value is
 * retained so rollback does not destroy browser data. JAMB never reads it.
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

    if (!storageKey || !userId) {
      setValue(defaultValue);
      setLoadedStorageKey(null);
      return;
    }

    // The previous account's value must not be considered ready for this key.
    setLoadedStorageKey(undefined);
    try {
      let raw = localStorage.getItem(storageKey);

      // Copy legacy JUPEB onboarding values only when the scoped key is absent.
      // Never use a prior JUPEB value to seed JAMB.
      if (raw === null) {
        const legacyKey = getLegacyProgramStorageKey(key);
        if (legacyKey) {
          const legacyStorageKey = `u:${userId}:${legacyKey}`;
          const legacyRaw = localStorage.getItem(legacyStorageKey);
          if (legacyRaw !== null) {
            raw = legacyRaw;
            localStorage.setItem(storageKey, legacyRaw);
          }
        }
      }

      setValue(raw !== null ? (JSON.parse(raw) as T) : defaultValue);
    } catch (err) {
      console.warn('Failed to read user storage:', err);
      setValue(defaultValue);
    }
    setLoadedStorageKey(storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, loading, userId]);

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

  // Hide the previous account's in-memory value until this account's storage
  // has been read, preventing a one-render cross-account data flash.
  return [isReady ? value : defaultValue, update, { isReady, reset }];
}
