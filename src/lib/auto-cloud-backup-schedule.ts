export const AUTO_CLOUD_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function isAutoCloudBackupDue(
  lastSuccessfulBackupAt: number | null,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(now) || now < 0) return false;
  if (
    lastSuccessfulBackupAt === null
    || !Number.isFinite(lastSuccessfulBackupAt)
    || lastSuccessfulBackupAt <= 0
  ) return true;

  return now >= lastSuccessfulBackupAt
    && now - lastSuccessfulBackupAt >= AUTO_CLOUD_BACKUP_INTERVAL_MS;
}
