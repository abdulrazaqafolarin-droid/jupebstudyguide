import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useExamProgram } from '@/contexts/ExamProgramContext';
import {
  getFlow, getOnboardingFlow, mergeOnboardingData, normalizeOnboardingData,
  type OnboardingData, type OnboardingStepId,
} from '@/lib/onboarding';
import { fetchOnboardingStatus, patchCachedOnboardingStatus } from '@/lib/onboardingStatus';

/** Each programme owns its step state; profile-level fields remain shared. */
export function useOnboarding() {
  const { user } = useAuth();
  const { programId } = useExamProgram();
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<OnboardingStepId[]>([]);
  const [data, setData] = useState<OnboardingData>({});
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isReplay, setIsReplay] = useState(false);
  const [profileSchoolName, setProfileSchoolName] = useState<string | null>(null);
  const [profileSeatNumber, setProfileSeatNumber] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchOnboardingStatus(user.id, programId)
      .then((status) => {
        if (cancelled) return;
        const next = normalizeOnboardingData(status.data);
        setFlow(getOnboardingFlow(getFlow(status.isNewStudent), programId));
        setData(next);
        setDisplayName(status.displayName);
        setIsReplay(status.finalized === true);
        setProfileSchoolName(status.schoolName);
        setProfileSeatNumber(status.examSeatNumber);
        setCompletedAt(status.completedAt);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[onboarding] load failed:', error);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, programId]);

  const saveStep = useCallback(async (
    stepId: OnboardingStepId,
    patch: Partial<OnboardingData>,
    extraPatch: Record<string, unknown> = {},
  ) => {
    if (!user) return false;
    const next = mergeOnboardingData(data, stepId, patch);
    setData(next);
    const { error: onboardingError } = await supabase.from('exam_program_onboarding')
      .upsert({
        user_id: user.id, exam_program_id: programId,
        completed_at: completedAt,
        data: next as never, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exam_program_id' });

    let profileError: Error | null = null;
    if (Object.keys(extraPatch).length > 0) {
      const result = await supabase.from('profiles').update(extraPatch as never).eq('user_id', user.id);
      profileError = result.error;
    }
    if (!onboardingError && !profileError) {
      patchCachedOnboardingStatus(user.id, programId, { data: next, finalized: next.finalized === true, completedAt });
    }
    return !onboardingError && !profileError;
  }, [user?.id, programId, data, completedAt]);

  const complete = useCallback(async (finalized: boolean, patch: Partial<OnboardingData> = {}) => {
    if (!user) return false;
    const next: OnboardingData = { ...data, ...patch, finalized };
    setData(next);
    const nextCompletedAt = new Date().toISOString();
    const { error } = await supabase.from('exam_program_onboarding').upsert({
      user_id: user.id, exam_program_id: programId, completed_at: nextCompletedAt,
      data: next as never, updated_at: nextCompletedAt,
    }, { onConflict: 'user_id,exam_program_id' });
    if (!error) {
      setCompletedAt(nextCompletedAt);
      patchCachedOnboardingStatus(user.id, programId, { completedAt: nextCompletedAt, finalized, data: next });
    }
    return !error;
  }, [user?.id, programId, data]);

  return { loading, flow, data, displayName, isReplay, profileSchoolName, profileSeatNumber, saveStep, complete };
}
