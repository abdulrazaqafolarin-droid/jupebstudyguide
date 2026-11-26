export interface ActivationStatusSnapshot {
  is_activated: boolean;
  is_admin: boolean;
  trial_expires_at: string | null;
  /** End of a 7-, 30-, or 90-day activation-code subscription. */
  subscription_expires_at?: string | null;
  /** Duration of the most recently activated paid term, when known. */
  subscription_duration_days?: number | null;
  checking: boolean;
  /** True only when the first verification failed and no trusted cache exists. */
  check_error?: boolean;
}

/**
 * Network failure must never erase a previously verified access decision.
 * Without a trusted cache, fail closed but distinguish the outage from an
 * actual inactive account so the UI can offer a retry instead of a paywall.
 */

/** The client-side gate mirrors the question-bank RLS entitlement rule. */
export function canAccessStudyContent(
  status: Pick<ActivationStatusSnapshot, "is_admin" | "trial_expires_at" | "subscription_expires_at">,
  now = Date.now(),
): boolean {
  const isUnexpired = (value: string | null | undefined) => {
    if (!value) return false;
    const expiresAt = Date.parse(value);
    return Number.isFinite(expiresAt) && expiresAt > now;
  };

  return (
    status.is_admin ||
    isUnexpired(status.trial_expires_at) ||
    isUnexpired(status.subscription_expires_at)
  );
}

export function resolveActivationFailure(
  isAdminEmail: boolean,
  cached: ActivationStatusSnapshot | null,
): ActivationStatusSnapshot {
  if (cached) {
    return { ...cached, checking: false, check_error: false };
  }

  return {
    is_activated: false,
    is_admin: isAdminEmail,
    trial_expires_at: null,
    subscription_expires_at: null,
    checking: false,
    check_error: !isAdminEmail,
  };
}
