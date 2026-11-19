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
