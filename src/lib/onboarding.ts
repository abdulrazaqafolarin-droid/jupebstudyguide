/**
 * Onboarding domain logic — pure, dependency-free, unit-tested.
 *
 * The flow adapts to the student:
 *  - Fresh accounts (no study sessions yet) see the full tour.
 *  - Students who pre-date the feature (they already have a syllabus)
 *    get a trimmed tour: welcome → theme → chat → finish.
 *  - Admins never see it (the guard passes them through).
 *
 * Progress is stored in profiles.onboarding_data (jsonb). A student who
 * presses "Skip for now" gets onboarding_completed_at set (so the guard
 * never traps them) but finalized stays false — that is what makes the
 * home-page "Finish setup" nudge appear.
 */

export type OnboardingStepId = 'welcome' | 'theme' | 'study' | 'chat' | 'notify' | 'finish';

export const FULL_FLOW: OnboardingStepId[] = ['welcome', 'theme', 'study', 'chat', 'notify', 'finish'];
export const TRIMMED_FLOW: OnboardingStepId[] = ['welcome', 'theme', 'chat', 'finish'];

export interface OnboardingData {
  completedSteps?: string[];
  subjects?: string[];
  examTarget?: string;
  dailyGoalMinutes?: number;
  finalized?: boolean;
  chat?: { online?: boolean; receipts?: boolean; discover?: boolean };
}

/** Normalize raw jsonb (unknown shapes, nulls) into a safe OnboardingData. */
export function normalizeOnboardingData(raw: unknown): OnboardingData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const data: OnboardingData = {};
  if (Array.isArray(r.completedSteps)) {
    data.completedSteps = r.completedSteps.filter((s): s is string => typeof s === 'string');
  }
  if (Array.isArray(r.subjects)) {
    data.subjects = r.subjects.filter((s): s is string => typeof s === 'string');
  }
  if (typeof r.examTarget === 'string') data.examTarget = r.examTarget;
  if (typeof r.dailyGoalMinutes === 'number') data.dailyGoalMinutes = r.dailyGoalMinutes;
  if (typeof r.finalized === 'boolean') data.finalized = r.finalized;
  if (r.chat && typeof r.chat === 'object' && !Array.isArray(r.chat)) {
    const c = r.chat as Record<string, unknown>;
    data.chat = {
      online: typeof c.online === 'boolean' ? c.online : undefined,
      receipts: typeof c.receipts === 'boolean' ? c.receipts : undefined,
      discover: typeof c.discover === 'boolean' ? c.discover : undefined,
    };
  }
  return data;
}

export function getFlow(isNewStudent: boolean): OnboardingStepId[] {
  return isNewStudent ? [...FULL_FLOW] : [...TRIMMED_FLOW];
}

/** First unfinished step (or the last step when everything is done). */
export function firstIncompleteStep(flow: OnboardingStepId[], completedSteps: string[]): OnboardingStepId {
  for (const step of flow) {
    if (!completedSteps.includes(step)) return step;
  }
  return flow[flow.length - 1];
}

/**
 * Merge a step's partial data into the stored jsonb. Never mutates `prev`.
 * `completedSteps` de-dupes so a replay can't double-count.
 */
export function mergeOnboardingData(
  prev: OnboardingData,
  stepId: OnboardingStepId,
  patch: Partial<OnboardingData>,
): OnboardingData {
  const completedSteps = prev.completedSteps ?? [];
  return {
    ...prev,
    ...patch,
    completedSteps: completedSteps.includes(stepId) ? completedSteps : [...completedSteps, stepId],
  };
}

/**
 * The home-page nudge shows when the student left the flow early:
 * completed_at set (guard lets them through) but never finalized.
 */
export function shouldShowSetupNudge(
  profile: { onboarding_completed_at?: string | null; onboarding_data?: unknown } | null | undefined,
): boolean {
  if (!profile?.onboarding_completed_at) return false; // still in the flow (guard redirects)
  return normalizeOnboardingData(profile.onboarding_data).finalized !== true;
}

/** Privacy toggles on the chat step map to the existing 'everyone'/'nobody' knobs. */
export function privacyValueFromToggle(on: boolean): 'everyone' | 'nobody' {
  return on ? 'everyone' : 'nobody';
}
