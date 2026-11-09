/**
 * Per-user onboarding status cache.
 *
 * Protected routes remount during navigation. A successful result is cached
 * for this app session, while concurrent route guards share one in-flight
 * request. ProtectedRoute starts this fetch alongside activation validation
 * so the two independent checks do not create a serial navigation delay.
 */
import { supabase } from '@/integrations/supabase/client';
import { normalizeOnboardingData, type OnboardingData } from './onboarding';

export interface OnboardingStatus {
  loaded: boolean;
  completedAt: string | null;
  finalized: boolean;
  isAdmin: boolean;
  isNewStudent: boolean;
  displayName: string | null;
  themePreference: string | null;
  /** Profile-column fallbacks so a replay prefills what Settings already saved. */
  schoolName: string | null;
  examSeatNumber: string | null;
  data: OnboardingData;
}

const EMPTY: OnboardingStatus = {
  loaded: false,
  completedAt: null,
  finalized: false,
  isAdmin: false,
  isNewStudent: true,
  displayName: null,
  themePreference: null,
  schoolName: null,
  examSeatNumber: null,
  data: {},
};

const cache = new Map<string, OnboardingStatus>();
const inFlight = new Map<string, Promise<OnboardingStatus>>();

// A profile/session read must never leave the protected route on an infinite spinner.
const ONBOARDING_REQUEST_TIMEOUT_MS = 12_000;

export function getCachedOnboardingStatus(userId: string): OnboardingStatus | null {
  return cache.get(userId) ?? null;
}

export function patchCachedOnboardingStatus(userId: string, patch: Partial<OnboardingStatus>) {
  const current = cache.get(userId) ?? EMPTY;
  cache.set(userId, { ...current, ...patch });
}

/**
 * One profile + study-session snapshot per user per app session.
 * Failed reads are deliberately not cached: a temporary network failure must
 * not turn into a false "new student" decision on the next route mount.
 */
export function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const cached = cache.get(userId);
  if (cached?.loaded) return Promise.resolve(cached);

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const request = (async () => {
    try {
      // Both reads share one deadline. AbortController is supported by older
      // mobile browsers where AbortSignal.timeout() may not be available.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        ONBOARDING_REQUEST_TIMEOUT_MS,
      );
      const [profileRes, sessionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('onboarding_completed_at, onboarding_data, is_admin, display_name, theme_preference, school_name, exam_seat_number')
          .eq('user_id', userId)
          .abortSignal(controller.signal)
          .maybeSingle(),
        supabase
          .from('study_sessions')
          .select('sessions')
          .eq('user_id', userId)
          .abortSignal(controller.signal)
          .maybeSingle(),
      ])
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            throw new Error('Loading your study profile timed out. Check your connection and try again.');
          }
          throw error;
        })
        .finally(() => window.clearTimeout(timeoutId));

      if (profileRes.error) throw profileRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      const profile = profileRes.data;
      const sessions = sessionsRes.data;
      const data = normalizeOnboardingData(profile?.onboarding_data);
      const rawSessions = (sessions as { sessions?: unknown } | null)?.sessions;
      const isNewStudent = !Array.isArray(rawSessions) || rawSessions.length === 0;

      const status: OnboardingStatus = {
        loaded: true,
        completedAt: profile?.onboarding_completed_at ?? null,
        finalized: data.finalized === true,
        isAdmin: profile?.is_admin ?? false,
        isNewStudent,
        displayName: profile?.display_name ?? null,
        themePreference:
          profile?.theme_preference === 'light' || profile?.theme_preference === 'dark'
            ? profile.theme_preference
            : null,
        schoolName: profile?.school_name ?? null,
        examSeatNumber: profile?.exam_seat_number ?? null,
        data,
      };
      cache.set(userId, status);
      return status;
    } finally {
      inFlight.delete(userId);
    }
  })();

  inFlight.set(userId, request);
  return request;
}
