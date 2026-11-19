import { describe, expect, it } from 'vitest';
import { getLegacyProgramStorageKey } from './useUserStorage';

describe('legacy programme-scoped storage migration', () => {
  it('maps the old JUPEB subject preference key to its new JUPEB namespace', () => {
    expect(getLegacyProgramStorageKey('onboarding-subjects:jupeb')).toBe('onboarding-subjects');
  });

  it('maps the old JUPEB daily goal key to its new JUPEB namespace', () => {
    expect(getLegacyProgramStorageKey('onboarding-daily-goal:jupeb')).toBe('onboarding-daily-goal');
  });

  it('maps the old onboarding reminder dismissal key to JUPEB only', () => {
    expect(getLegacyProgramStorageKey('onboarding-nudge-dismissed:jupeb')).toBe('onboarding-nudge-dismissed');
  });

  it('does not seed JAMB or unrelated keys from legacy JUPEB values', () => {
    expect(getLegacyProgramStorageKey('onboarding-subjects:jamb')).toBeNull();
    expect(getLegacyProgramStorageKey('onboarding-daily-goal:jamb')).toBeNull();
    expect(getLegacyProgramStorageKey('onboarding-nudge-dismissed:jamb')).toBeNull();
    expect(getLegacyProgramStorageKey('profile-theme:jupeb')).toBeNull();
  });
});
