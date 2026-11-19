/** One-time migration for browser preferences persisted before programme namespaces existed. */
export function getLegacyProgramStorageKey(key: string): string | null {
  const legacyKeys: Record<string, string> = {
    'onboarding-subjects:jupeb': 'onboarding-subjects',
    'onboarding-daily-goal:jupeb': 'onboarding-daily-goal',
    'onboarding-nudge-dismissed:jupeb': 'onboarding-nudge-dismissed',
  };
  return legacyKeys[key] ?? null;
}
