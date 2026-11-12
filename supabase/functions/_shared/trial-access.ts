/**
 * Server-authoritative subscription check for AI-backed features.
 * Admin status is supplied only after the caller verifies the established
 * owner email together with the protected profiles.is_admin flag.
 */
export interface AiAccessProfile {
  is_admin?: boolean | null;
  trial_expires_at?: string | null;
  subscription_expires_at?: string | null;
}

/** A subscription is active strictly before its server-issued expiry timestamp. */
export function isSubscriptionActive(
  subscriptionExpiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!subscriptionExpiresAt) return false;
  const expiresAt = Date.parse(subscriptionExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function isTrialActive(
  trialExpiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!trialExpiresAt) return false;
  const expiresAt = Date.parse(trialExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function hasAiAccountAccess(
  profile: AiAccessProfile | null | undefined,
  now = Date.now(),
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.is_admin ||
    isTrialActive(profile.trial_expires_at, now) ||
    isSubscriptionActive(profile.subscription_expires_at, now)
  );
}
