/** Per-user, per-programme onboarding status cache. */
import { supabase } from '@/integrations/supabase/client';
import { normalizeOnboardingData, type OnboardingData } from './onboarding';
import type { ExamProgramId } from './exam-program';

export interface OnboardingStatus {
  loaded: boolean;
  completedAt: string | null;
  finalized: boolean;
  isAdmin: boolean;
  isNewStudent: boolean;
  displayName: string | null;
  themePreference: string | null;
  schoolName: string | null;
  examSeatNumber: string | null;
  selectedExamProgram: ExamProgramId | null;
  data: OnboardingData;
}

const EMPTY: OnboardingStatus = {
  loaded: false, completedAt: null, finalized: false, isAdmin: false,
  isNewStudent: true, displayName: null, themePreference: null,
  schoolName: null, examSeatNumber: null, selectedExamProgram: null, data: {},
};

const cache = new Map<string, OnboardingStatus>();
const inFlight = new Map<string, Promise<OnboardingStatus>>();
const keyFor = (userId: string, programId: ExamProgramId) => `${userId}:${programId}`;

export function getCachedOnboardingStatus(userId: string, programId: ExamProgramId): OnboardingStatus | null {
  return cache.get(keyFor(userId, programId)) ?? null;
}

export function patchCachedOnboardingStatus(
  userId: string, programId: ExamProgramId, patch: Partial<OnboardingStatus>,
) {
  const key = keyFor(userId, programId);
  cache.set(key, { ...(cache.get(key) ?? EMPTY), ...patch });
}

export function fetchOnboardingStatus(userId: string, programId: ExamProgramId): Promise<OnboardingStatus> {
  const key = keyFor(userId, programId);
  const cached = cache.get(key);
  if (cached?.loaded) return Promise.resolve(cached);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const [profileRes, sessionsRes, onboardingRes] = await Promise.all([
        supabase.from('profiles')
          .select('is_admin, display_name, theme_preference, school_name, exam_seat_number, selected_exam_program, onboarding_completed_at, onboarding_data')
          .eq('user_id', userId).maybeSingle(),
        supabase.from('study_sessions').select('sessions').eq('user_id', userId).maybeSingle(),
        supabase.from('exam_program_onboarding').select('completed_at, data')
          .eq('user_id', userId).eq('exam_program_id', programId).maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (onboardingRes.error) throw onboardingRes.error;

      const profile = profileRes.data;
      const programRow = onboardingRes.data;
      const rawData = programRow?.data ?? (programId === 'jupeb' ? profile?.onboarding_data : {});
      const data = normalizeOnboardingData(rawData);
      const rawSessions = (sessionsRes.data as { sessions?: unknown } | null)?.sessions;
      const isNewStudent = programId === 'jamb'
        ? !programRow?.completed_at
        : !Array.isArray(rawSessions) || rawSessions.length === 0;
      const selected = profile?.selected_exam_program;

      const status: OnboardingStatus = {
        loaded: true,
        completedAt: programRow?.completed_at ?? (programId === 'jupeb' ? profile?.onboarding_completed_at ?? null : null),
        finalized: data.finalized === true,
        isAdmin: profile?.is_admin ?? false,
        isNewStudent,
        displayName: profile?.display_name ?? null,
        themePreference: profile?.theme_preference === 'light' || profile?.theme_preference === 'dark'
          ? profile.theme_preference : null,
        schoolName: programId === 'jupeb' ? profile?.school_name ?? null : null,
        examSeatNumber: programId === 'jupeb' ? profile?.exam_seat_number ?? null : null,
        selectedExamProgram: selected === 'jamb' || selected === 'jupeb' ? selected : null,
        data,
      };
      cache.set(key, status);
      return status;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
