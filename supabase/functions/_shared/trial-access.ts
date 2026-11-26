/** Programme-scoped access helpers for AI-backed features. */
export interface AiProgrammeEntitlement {
  is_admin?: boolean | null;
  trial_expires_at?: string | null;
  subscription_expires_at?: string | null;
}

/** A programme trial/subscription is active strictly before its server expiry. */
export function isProgrammeEntitlementActive(
  entitlement: AiProgrammeEntitlement | null | undefined,
  now = Date.now(),
): boolean {
  if (!entitlement) return false;
  const active = (value: string | null | undefined) => {
    if (!value) return false;
    const expiresAt = Date.parse(value);
    return Number.isFinite(expiresAt) && expiresAt > now;
  };
  return entitlement.is_admin === true ||
    active(entitlement.trial_expires_at) ||
    active(entitlement.subscription_expires_at);
}

/*
 * Backwards-compatible helpers used by older tests and shared AI callers.
 * Keep these thin wrappers on the same strict expiry rule as programme-scoped
 * access; they do not read the legacy profiles.is_activated flag.
 */
export function isSubscriptionActive(
  expiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp > now;
}

export function isTrialActive(
  expiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  return isSubscriptionActive(expiresAt, now);
}

export interface LegacyAiAccountAccessSnapshot {
  is_admin?: boolean | null;
  trial_expires_at?: string | null;
  subscription_expires_at?: string | null;
}

export function hasAiAccountAccess(
  profile: LegacyAiAccountAccessSnapshot | null | undefined,
  now = Date.now(),
): boolean {
  return isProgrammeEntitlementActive(profile, now);
}
