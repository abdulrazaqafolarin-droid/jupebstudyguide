export interface ActivationStatusSnapshot {
  is_activated: boolean;
  is_admin: boolean;
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
  subscription_duration_days: number | null;
  checking: boolean;
  /** True only when the first verification failed and no trusted cache exists. */
  check_error?: boolean;
}

/**
 * Network failure must never erase a previously verified access decision.
 * Without a trusted cache, fail closed but distinguish the outage from an
 * actual inactive account so the UI can offer a retry instead of a paywall.
 */
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
    subscription_duration_days: null,
    checking: false,
    check_error: !isAdminEmail,
  };
}
