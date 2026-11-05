import { supabase } from "@/integrations/supabase/client";
import {
  createUserDataBackup,
  parseUserDataBackup,
  type UserDataBackup,
} from "@/lib/local-data-backup";
import {
  CLOUD_BACKUP_FILE_PREFIX,
  findLatestCloudBackupFile,
  isCloudBackupFileName,
} from "@/lib/cloud-data-backup-utils";

const BACKUP_BUCKET = "documents";
const BACKUP_FOLDER = "device-backups";
const MAX_RETAINED_BACKUPS = 3;

function backupFolder(userId: string): string {
  if (!userId.trim()) throw new Error("A signed-in account is required.");
  return `${userId}/${BACKUP_FOLDER}`;
}

export async function saveUserDataBackupToCloud(userId: string): Promise<void> {
  const backup = createUserDataBackup(userId);
  const raw = JSON.stringify(backup);
  const blob = new Blob([raw], { type: "application/json" });
  const fileName = `${CLOUD_BACKUP_FILE_PREFIX}${Date.now()}.json`;
  const folder = backupFolder(userId);
  const path = `${folder}/${fileName}`;

  // Never use upsert here: the existing bucket policy permits INSERT but
  // intentionally does not grant UPDATE on existing document objects.
  const { error: uploadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(path, blob, {
      cacheControl: "0",
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Cloud backup upload failed: ${uploadError.message}`);
  }

  // Retain a small rolling history. A cleanup error must not turn a completed
  // upload into a reported failure or remove the newly uploaded backup.
  try {
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list(folder, {
        limit: 100,
        sortBy: { column: "name", order: "desc" },
      });
    if (error || !data) return;

    const backups = data
      .filter(entry => entry.id !== null && isCloudBackupFileName(entry.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    const oldPaths = backups
      .slice(MAX_RETAINED_BACKUPS)
      .map(entry => `${folder}/${entry.name}`);
    if (oldPaths.length) {
      await supabase.storage.from(BACKUP_BUCKET).remove(oldPaths);
    }
  } catch (error) {
    console.warn("Cloud backup retention cleanup was skipped.", error);
  }
}

export async function loadLatestUserDataBackupFromCloud(
  userId: string,
): Promise<UserDataBackup> {
  const folder = backupFolder(userId);
  const { data: files, error: listError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .list(folder, {
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });

  if (listError) {
    throw new Error(`Could not find your cloud backup: ${listError.message}`);
  }

  const latest = findLatestCloudBackupFile(files ?? []);
  if (!latest) {
    throw new Error("No cloud backup was found for this account. Create one on the original device first.");
  }

  const path = `${folder}/${latest.name}`;
  const { data, error: downloadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .download(path);

  if (downloadError || !data) {
    throw new Error(downloadError
      ? `Could not download your cloud backup: ${downloadError.message}`
      : "The cloud backup file was empty.");
  }

  const backup = parseUserDataBackup(await data.text());
  if (backup.userId !== userId) {
    throw new Error("The cloud backup belongs to a different account. No data was restored.");
  }
  return backup;
}
