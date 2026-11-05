import { describe, expect, it } from 'vitest';
import { hasAiAccountAccess, isTrialActive } from '../../supabase/functions/_shared/trial-access.ts';

const NOW = Date.parse('2026-11-05T12:00:00.000Z');

describe('five-day trial AI access', () => {
  it('allows an account whose server-issued trial has not expired', () => {
    expect(hasAiAccountAccess({
      is_activated: false,
      is_admin: false,
      trial_expires_at: '2026-11-06T12:00:00.000Z',
    }, NOW)).toBe(true);
  });

  it('denies access at the exact expiry instant', () => {
    expect(isTrialActive('2026-11-05T12:00:00.000Z', NOW)).toBe(false);
  });

  it('denies a trial after its expiry', () => {
    expect(hasAiAccountAccess({
      is_activated: false,
      is_admin: false,
      trial_expires_at: '2026-11-05T11:59:59.999Z',
    }, NOW)).toBe(false);
  });

  it('keeps activated accounts working even when their trial date is expired', () => {
    expect(hasAiAccountAccess({
      is_activated: true,
      is_admin: false,
      trial_expires_at: '2026-11-01T00:00:00.000Z',
    }, NOW)).toBe(true);
  });

  it('keeps administrator access independent of trial dates', () => {
    expect(hasAiAccountAccess({
      is_activated: false,
      is_admin: true,
      trial_expires_at: null,
    }, NOW)).toBe(true);
  });

  it('fails closed for missing profiles or invalid expiry timestamps', () => {
    expect(hasAiAccountAccess(null, NOW)).toBe(false);
    expect(hasAiAccountAccess({
      is_activated: false,
      is_admin: false,
      trial_expires_at: 'not-a-timestamp',
    }, NOW)).toBe(false);
  });
});
