import { describe, expect, it } from 'vitest';
import {
  hasAiAccountAccess,
  isSubscriptionActive,
  isTrialActive,
} from '../../supabase/functions/_shared/trial-access.ts';

const NOW = Date.parse('2026-11-05T12:00:00.000Z');

describe('term-based AI access', () => {
  it('allows an account with an unexpired paid subscription', () => {
    expect(hasAiAccountAccess({
      is_admin: false,
      subscription_expires_at: '2026-11-06T12:00:00.000Z',
    }, NOW)).toBe(true);
  });

  it('denies access at the exact subscription expiry instant', () => {
    expect(isSubscriptionActive('2026-11-05T12:00:00.000Z', NOW)).toBe(false);
  });

  it('denies a subscription after its expiry', () => {
    expect(hasAiAccountAccess({
      is_admin: false,
      subscription_expires_at: '2026-11-05T11:59:59.999Z',
    }, NOW)).toBe(false);
  });

  it('allows AI features during an active one-day signup trial', () => {
    expect(isTrialActive('2026-11-06T12:00:00.000Z', NOW)).toBe(true);
    expect(hasAiAccountAccess({
      is_admin: false,
      trial_expires_at: '2026-11-06T12:00:00.000Z',
    }, NOW)).toBe(true);
  });

  it('denies AI access at or after the exact trial expiry instant', () => {
    expect(isTrialActive('2026-11-05T12:00:00.000Z', NOW)).toBe(false);
    expect(hasAiAccountAccess({
      is_admin: false,
      trial_expires_at: '2026-11-05T11:59:59.999Z',
    }, NOW)).toBe(false);
  });

  it('does not treat legacy activation flags as a paid subscription', () => {
    expect(hasAiAccountAccess({
      is_activated: true,
      is_admin: false,
    } as never, NOW)).toBe(false);
  });

  it('keeps administrator access independent of subscription dates', () => {
    expect(hasAiAccountAccess({
      is_admin: true,
      subscription_expires_at: null,
    }, NOW)).toBe(true);
  });

  it('fails closed for missing profiles or invalid expiry timestamps', () => {
    expect(hasAiAccountAccess(null, NOW)).toBe(false);
    expect(hasAiAccountAccess({
      is_admin: false,
      subscription_expires_at: 'not-a-timestamp',
    }, NOW)).toBe(false);
  });
});
