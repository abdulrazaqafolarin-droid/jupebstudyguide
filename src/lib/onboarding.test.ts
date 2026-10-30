import { describe, it, expect } from 'vitest';
import {
  FULL_FLOW,
  TRIMMED_FLOW,
  firstIncompleteStep,
  getFlow,
  mergeOnboardingData,
  normalizeOnboardingData,
  privacyValueFromToggle,
  shouldShowSetupNudge,
} from './onboarding';

describe('getFlow', () => {
  it('gives fresh students the full six-step tour', () => {
    expect(getFlow(true)).toEqual(FULL_FLOW);
  });

  it('gives pre-existing students the trimmed tour (no study setup, no notifications)', () => {
    const flow = getFlow(false);
    expect(flow).toEqual(TRIMMED_FLOW);
    expect(flow).not.toContain('study');
    expect(flow).not.toContain('notify');
    expect(flow).toContain('chat');
  });

  it('returns a copy so callers cannot mutate the shared constants', () => {
    const flow = getFlow(true);
    flow.pop();
    expect(getFlow(true)).toHaveLength(FULL_FLOW.length);
  });
});

describe('firstIncompleteStep', () => {
  it('starts a brand-new student at welcome', () => {
    expect(firstIncompleteStep(FULL_FLOW, [])).toBe('welcome');
  });

  it('resumes at the first unfinished step', () => {
    expect(firstIncompleteStep(FULL_FLOW, ['welcome', 'theme'])).toBe('study');
  });

  it('tolerates out-of-order and duplicate completions', () => {
    expect(firstIncompleteStep(FULL_FLOW, ['theme', 'theme', 'welcome'])).toBe('study');
  });

  it('falls back to the last step when everything is done (replay entry)', () => {
    expect(firstIncompleteStep(TRIMMED_FLOW, [...TRIMMED_FLOW])).toBe('finish');
  });
});

describe('mergeOnboardingData', () => {
  it('merges the patch and records the step', () => {
    const next = mergeOnboardingData({}, 'study', { subjects: ['physics', 'chemistry'] });
    expect(next.subjects).toEqual(['physics', 'chemistry']);
    expect(next.completedSteps).toEqual(['study']);
  });

  it('de-dupes completed steps on replay', () => {
    const prev = mergeOnboardingData({}, 'theme', {});
    const next = mergeOnboardingData(prev, 'theme', {});
    expect(next.completedSteps).toEqual(['theme']);
  });

  it('never mutates the previous data', () => {
    const prev = { completedSteps: ['welcome'], examTarget: 'early' };
    mergeOnboardingData(prev, 'theme', { examTarget: 'this-session' });
    expect(prev.completedSteps).toEqual(['welcome']);
    expect(prev.examTarget).toBe('early');
  });
});

describe('normalizeOnboardingData', () => {
  it('survives null, arrays, strings and garbage', () => {
    expect(normalizeOnboardingData(null)).toEqual({});
    expect(normalizeOnboardingData('oops')).toEqual({});
    expect(normalizeOnboardingData([1, 2])).toEqual({});
  });

  it('keeps only well-typed fields', () => {
    const data = normalizeOnboardingData({
      completedSteps: ['welcome', 42, null, 'theme'],
      subjects: ['physics', {}],
      dailyGoalMinutes: '30',
      examTarget: 7,
      finalized: 'yes',
      chat: { online: true, receipts: 'nope' },
    });
    expect(data.completedSteps).toEqual(['welcome', 'theme']);
    expect(data.subjects).toEqual(['physics']);
    expect(data.dailyGoalMinutes).toBeUndefined();
    expect(data.examTarget).toBeUndefined();
    expect(data.finalized).toBeUndefined();
    expect(data.chat).toEqual({ online: true, receipts: undefined, discover: undefined });
  });

  it('normalizes school name and exam seat number', () => {
    const data = normalizeOnboardingData({
      schoolName: '  Baptist   High  School ',
      examSeatNumber: ' 43-21 ',
    });
    expect(data.schoolName).toBe('Baptist High School');
    expect(data.examSeatNumber).toBe('4321');
  });

  it('drops unusable school/seat input instead of storing it', () => {
    const data = normalizeOnboardingData({
      schoolName: '   ',
      examSeatNumber: '42', // too short to be a seat number
    });
    expect(data.schoolName).toBeUndefined();
    expect(data.examSeatNumber).toBeUndefined();
  });
});

describe('shouldShowSetupNudge', () => {
  it('never shows for a student still in the flow (no completed_at)', () => {
    expect(shouldShowSetupNudge(null)).toBe(false);
    expect(shouldShowSetupNudge({ onboarding_completed_at: null })).toBe(false);
  });

  it('shows for skippers (seen but not finalized)', () => {
    expect(
      shouldShowSetupNudge({ onboarding_completed_at: '2026-10-30T00:00:00Z', onboarding_data: {} }),
    ).toBe(true);
    expect(
      shouldShowSetupNudge({
        onboarding_completed_at: '2026-10-30T00:00:00Z',
        onboarding_data: { finalized: false, completedSteps: ['welcome'] },
      }),
    ).toBe(true);
  });

  it('hides for students who finished the tour', () => {
    expect(
      shouldShowSetupNudge({
        onboarding_completed_at: '2026-10-30T00:00:00Z',
        onboarding_data: { finalized: true },
      }),
    ).toBe(false);
  });
});

describe('privacyValueFromToggle', () => {
  it('maps switches onto the existing everyone/nobody privacy knobs', () => {
    expect(privacyValueFromToggle(true)).toBe('everyone');
    expect(privacyValueFromToggle(false)).toBe('nobody');
  });
});
