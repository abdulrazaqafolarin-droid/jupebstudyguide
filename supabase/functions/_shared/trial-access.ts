/**
 * Server-authoritative access check for AI-backed features.
 * The one-day trial is granted by the auth.users trigger and stored on the
 * profile. Only the database value is trusted here; client metadata is ignored.
 */
export interface AiAccessProfile {
  is_activated?: boolean | null;
  is_admin?: boolean | null;
  trial_expires_at?: string | null;
}

/** A trial is active strictly before its server-issued expiry timestamp. */
export function isTrialActive(trialExpiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!trialExpiresAt) return false;
  const expiresAt = Date.parse(trialExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function hasAiAccountAccess(
  profile: AiAccessProfile | null | undefined,
  now = Date.now(),
): boolean {
  if (!profile) return false;
  return Boolean(profile.is_activated || profile.is_admin || isTrialActive(profile.trial_expires_at, now));
}
