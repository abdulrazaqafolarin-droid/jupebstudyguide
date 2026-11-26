import { describe, expect, it } from "vitest";
import {
  canAccessStudyContent,
  resolveActivationFailure,
  type ActivationStatusSnapshot,
} from "./activation-status";

const cached = (overrides: Partial<ActivationStatusSnapshot> = {}): ActivationStatusSnapshot => ({
  is_activated: true,
  is_admin: false,
  trial_expires_at: null,
  checking: false,
  ...overrides,
});

describe("resolveActivationFailure", () => {
  it("preserves previously verified activation when a refresh fails", () => {
    expect(resolveActivationFailure(false, cached())).toEqual(cached({ check_error: false }));
  });

  it("preserves a still-live trial snapshot for offline navigation", () => {
    const trial = cached({
      is_activated: false,
      trial_expires_at: "2026-11-08T12:00:00.000Z",
    });
    expect(resolveActivationFailure(false, trial)).toEqual({ ...trial, check_error: false });
  });

  it("preserves a previously verified administrator status", () => {
    const admin = cached({ is_activated: false, is_admin: true });
    expect(resolveActivationFailure(false, admin)).toEqual({ ...admin, check_error: false });
  });

  it("distinguishes a first-load network failure from a real inactive account", () => {
    expect(resolveActivationFailure(false, null)).toEqual({
      is_activated: false,
      is_admin: false,
      trial_expires_at: null,
      subscription_expires_at: null,
      subscription_duration_days: null,
      checking: false,
      check_error: true,
    });
  });

  it("continues to allow the configured administrator email during a profile outage", () => {
    expect(resolveActivationFailure(true, null)).toEqual({
      is_activated: false,
      is_admin: true,
      trial_expires_at: null,
      subscription_expires_at: null,
      subscription_duration_days: null,
      checking: false,
      check_error: false,
    });
  });
});


describe("canAccessStudyContent", () => {
  const now = Date.parse("2026-11-18T20:00:00.000Z");

  it("does not treat the legacy is_activated flag as permanent entitlement", () => {
    expect(canAccessStudyContent({
      is_admin: false,
      trial_expires_at: null,
      subscription_expires_at: "2026-11-17T20:00:00.000Z",
    }, now)).toBe(false);
  });

  it("allows an unexpired subscription", () => {
    expect(canAccessStudyContent({
      is_admin: false,
      trial_expires_at: null,
      subscription_expires_at: "2026-12-18T20:00:00.000Z",
    }, now)).toBe(true);
  });

  it("allows an active trial and a configured administrator", () => {
    expect(canAccessStudyContent({
      is_admin: false,
      trial_expires_at: "2026-11-19T20:00:00.000Z",
      subscription_expires_at: null,
    }, now)).toBe(true);
    expect(canAccessStudyContent({
      is_admin: true,
      trial_expires_at: null,
      subscription_expires_at: null,
    }, now)).toBe(true);
  });

  it("denies missing, invalid, and expired entitlements", () => {
    expect(canAccessStudyContent({
      is_admin: false,
      trial_expires_at: null,
      subscription_expires_at: null,
    }, now)).toBe(false);
    expect(canAccessStudyContent({
      is_admin: false,
      trial_expires_at: "not-a-date",
      subscription_expires_at: null,
    }, now)).toBe(false);
  });
});
