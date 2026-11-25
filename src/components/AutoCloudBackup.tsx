import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserDataBackupToCloud } from "@/lib/cloud-data-backup";
import { isAutoCloudBackupDue } from "@/lib/auto-cloud-backup-schedule";

const BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const BACKUP_START_DELAY_MS = 12 * 1000;

function lastSuccessKey(userId: string): string {
  return "rutex:auto-cloud-backup:last-success:" + userId;
}

/**
 * Creates a private cloud snapshot at most once per day per signed-in account.
 * Failed attempts are not marked as successful, so the next foreground/hourly
 * check can retry. Manual backup and export controls remain available in
 * Profile Settings.
 */
export function AutoCloudBackup() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user?.id) return;

    const userId = user.id;
    const storageKey = lastSuccessKey(userId);
    let running = false;

    const attemptBackup = async () => {
      if (running || document.visibilityState === "hidden") return;

      let lastSuccessfulBackupAt: number | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        lastSuccessfulBackupAt = raw === null ? null : Number(raw);
      } catch (error) {
        console.warn("[backup] Could not read the last backup timestamp.", error);
      }

      if (!isAutoCloudBackupDue(lastSuccessfulBackupAt)) return;

      running = true;
      try {
        await saveUserDataBackupToCloud(userId);
        try {
          localStorage.setItem(storageKey, String(Date.now()));
        } catch (error) {
          console.warn("[backup] Snapshot succeeded but its local timestamp could not be saved.", error);
        }
      } catch (error) {
        console.warn("[backup] Automatic cloud snapshot failed; it will retry later.", error);
      } finally {
        running = false;
      }
    };

    const initialTimer = window.setTimeout(() => {
      void attemptBackup();
    }, BACKUP_START_DELAY_MS);
    const interval = window.setInterval(() => {
      void attemptBackup();
    }, BACKUP_CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void attemptBackup();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loading, user?.id]);

  return null;
}
