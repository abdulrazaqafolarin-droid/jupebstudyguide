/**
 * Per-user onboarding status cache.
 *
 * The guard wraps every protected route and remounts on each navigation —
 * fetching per navigation would flash a spinner on every tap. This module
 * caches the status for the lifetime of the app load (one fetch per signed-in
 * user per tab) and lets the onboarding page update it synchronously when the
 * student finishes, so the very next render already knows onboarding is done.
 *
 * The same fetch also restores theme_preference on a fresh device — but only
 * when next-themes has no stored choice, so a live toggle on this device is
 * never overridden.
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
  data: {},
};

const cache = new Map<string, OnboardingStatus>();

export function getCachedOnboardingStatus(userId: string): OnboardingStatus | null {
  return cache.get(userId) ?? null;
}

export function patchCachedOnboardingStatus(userId: string, patch: Partial<OnboardingStatus>) {
  const current = cache.get(userId) ?? EMPTY;
  cache.set(userId, { ...current, ...patch });
}

export async function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [profileRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('onboarding_completed_at, onboarding_data, is_admin, display_name, theme_preference')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('study_sessions')
      .select('sessions')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

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
    data,
  };
  cache.set(userId, status);
  return status;
}
