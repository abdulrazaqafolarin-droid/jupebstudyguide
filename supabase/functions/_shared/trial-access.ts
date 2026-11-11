/**
 * Server-authoritative subscription check for AI-backed features.
 * Admin status is supplied only after the caller verifies the established
 * owner email together with the protected profiles.is_admin flag.
 */
export interface AiAccessProfile {
  is_admin?: boolean | null;
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

export function hasAiAccountAccess(
  profile: AiAccessProfile | null | undefined,
  now = Date.now(),
): boolean {
  if (!profile) return false;
  return Boolean(profile.is_admin || isSubscriptionActive(profile.subscription_expires_at, now));
}
