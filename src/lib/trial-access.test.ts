import { describe, expect, it } from 'vitest';
import { isProgrammeEntitlementActive } from '../../supabase/functions/_shared/trial-access.ts';

const NOW = Date.parse('2026-11-19T12:00:00.000Z');

describe('programme-scoped AI entitlement checks', () => {
  it('allows a programme whose server-issued trial has not expired', () => {
    expect(isProgrammeEntitlementActive({
      is_admin: false,
      trial_expires_at: '2026-11-20T12:00:00.000Z',
      subscription_expires_at: null,
    }, NOW)).toBe(true);
  });

  it('denies access at the exact trial expiry instant', () => {
    expect(isProgrammeEntitlementActive({
      trial_expires_at: '2026-11-19T12:00:00.000Z',
    }, NOW)).toBe(false);
  });

  it('denies a programme after its trial expires when no subscription is active', () => {
    expect(isProgrammeEntitlementActive({
      trial_expires_at: '2026-11-19T11:59:59.999Z',
      subscription_expires_at: null,
    }, NOW)).toBe(false);
  });

  it('allows a programme with its own unexpired paid subscription', () => {
    expect(isProgrammeEntitlementActive({
      trial_expires_at: null,
      subscription_expires_at: '2026-12-19T12:00:00.000Z',
    }, NOW)).toBe(true);
  });

  it('does not treat a legacy activated flag as a paid entitlement', () => {
    expect(isProgrammeEntitlementActive({
      trial_expires_at: null,
      subscription_expires_at: null,
    }, NOW)).toBe(false);
  });

  it('keeps administrator access independent of entitlement dates', () => {
    expect(isProgrammeEntitlementActive({
      is_admin: true,
      trial_expires_at: null,
      subscription_expires_at: null,
    }, NOW)).toBe(true);
  });

  it('fails closed for a missing entitlement or invalid expiry timestamps', () => {
    expect(isProgrammeEntitlementActive(null, NOW)).toBe(false);
    expect(isProgrammeEntitlementActive({
      trial_expires_at: 'not-a-timestamp',
      subscription_expires_at: 'also-not-a-timestamp',
    }, NOW)).toBe(false);
  });
});
