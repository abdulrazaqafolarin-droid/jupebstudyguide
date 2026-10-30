import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  getFlow,
  mergeOnboardingData,
  normalizeOnboardingData,
  type OnboardingData,
  type OnboardingStepId,
} from '@/lib/onboarding';
import { fetchOnboardingStatus, patchCachedOnboardingStatus } from '@/lib/onboardingStatus';

/**
 * State for the onboarding page: loads the student's profile row, computes
 * which flow (full vs trimmed) and starting step apply, and persists each
 * step's choices as ONE profiles update on "Next" (never per toggle).
 *
 * All writes are optimistic for the student: a failed save shows a toast but
 * never traps them in the flow — completion is idempotent and retried.
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<OnboardingStepId[]>([]);
  const [data, setData] = useState<OnboardingData>({});
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isReplay, setIsReplay] = useState(false);
  // Profile-column fallbacks: a student who set school/seat in Settings
  // before (or since) a tour sees them prefilled on replay.
  const [profileSchoolName, setProfileSchoolName] = useState<string | null>(null);
  const [profileSeatNumber, setProfileSeatNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const status = await fetchOnboardingStatus(user.id);
      if (cancelled) return;
      const d = normalizeOnboardingData(status.data);
      setFlow(getFlow(status.isNewStudent));
      setData(d);
      setDisplayName(status.displayName);
      setIsReplay(status.finalized === true);
      setProfileSchoolName(status.schoolName);
      setProfileSeatNumber(status.examSeatNumber);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /** Persist one step's progress + choices. Returns false when the write failed. */
  const saveStep = useCallback(
    async (stepId: OnboardingStepId, patch: Partial<OnboardingData>, extraPatch: Record<string, unknown> = {}) => {
      if (!user) return false;
      const next = mergeOnboardingData(data, stepId, patch);
      setData(next);
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_data: next as unknown as Json, ...extraPatch })
        .eq('user_id', user.id);
      if (!error) patchCachedOnboardingStatus(user.id, { data: next, finalized: next.finalized === true });
      return !error;
    },
    [user, data],
  );

  /**
   * Leave the flow. `finalized: false` = "skip for now" (the home nudge will
   * offer resuming); `finalized: true` = tour complete. Either way the student
   * is marked as seen so the guard never blocks them again.
   */
  const complete = useCallback(
    async (finalized: boolean, patch: Partial<OnboardingData> = {}) => {
      if (!user) return false;
      const next: OnboardingData = { ...data, ...patch, finalized };
      setData(next);
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_data: next as unknown as Json, onboarding_completed_at: completedAt })
        .eq('user_id', user.id);
      if (!error) {
        patchCachedOnboardingStatus(user.id, {
          completedAt,
          finalized,
          data: next,
        });
      }
      return !error;
    },
    [user, data],
  );

  return { loading, flow, data, displayName, isReplay, profileSchoolName, profileSeatNumber, saveStep, complete };
}
