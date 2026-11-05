export const CLOUD_BACKUP_FILE_PREFIX = "jupeb-backup-";

export interface CloudBackupFileEntry {
  id: string | null;
  name: string;
}

export function isCloudBackupFileName(name: string): boolean {
  if (!name.startsWith(CLOUD_BACKUP_FILE_PREFIX) || !name.endsWith(".json")) return false;
  const timestamp = name.slice(CLOUD_BACKUP_FILE_PREFIX.length, -5);
  return timestamp.length === 13
    && [...timestamp].every(character => character >= "0" && character <= "9");
}

/** Select the newest valid backup file, ignoring folder entries and other documents. */
export function findLatestCloudBackupFile(
  files: CloudBackupFileEntry[],
): CloudBackupFileEntry | null {
  return files
    .filter(file => file.id !== null && isCloudBackupFileName(file.name))
    .sort((a, b) => b.name.localeCompare(a.name))[0] ?? null;
}
