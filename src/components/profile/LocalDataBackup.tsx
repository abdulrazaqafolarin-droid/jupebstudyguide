import { useRef, useState } from 'react';
import { Download, FileUp, ShieldCheck, CloudUpload, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  createUserDataBackup,
  parseUserDataBackup,
  restoreUserDataBackup,
} from '@/lib/local-data-backup';
import {
  loadLatestUserDataBackupFromCloud,
  saveUserDataBackupToCloud,
} from '@/lib/cloud-data-backup';

export function LocalDataBackup() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [restoreSharedBookmarks, setRestoreSharedBookmarks] = useState(false);

  const exportBackup = () => {
    if (!user) return;
    try {
      const backup = createUserDataBackup(user.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `jupeb-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Give mobile browsers time to begin the download before revoking the URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success('Your account backup has been created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the backup.');
    }
  };

  const backupToCloud = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveUserDataBackupToCloud(user.id);
      toast.success('Your private cloud backup is saved to your account.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your cloud backup.');
    } finally {
      setBusy(false);
    }
  };

  const restoreFromCloud = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const backup = await loadLatestUserDataBackupFromCloud(user.id);
      const result = restoreUserDataBackup(backup, user.id, restoreSharedBookmarks);
      toast.success(`Cloud backup restored: ${result.restored} added, ${result.merged} merged, ${result.skipped} kept unchanged. Reloading your study data…`);
      window.setTimeout(() => window.location.reload(), 1_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore your cloud backup.');
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const raw = await file.text();
      const backup = parseUserDataBackup(raw);
      if (backup.userId !== user.id) {
        throw new Error('Sign in with the account that created this backup before restoring it.');
      }
      const result = restoreUserDataBackup(backup, user.id, restoreSharedBookmarks);
      toast.success(`Backup restored: ${result.restored} added, ${result.merged} merged, ${result.skipped} kept unchanged. Reloading your study data…`);
      window.setTimeout(() => window.location.reload(), 1_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore this backup.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Study Data Backup
        </CardTitle>
        <CardDescription>
          A private cloud snapshot is saved automatically about once per day while you are signed in and online. You can also create one now or export a separate backup file. Cloud backups are private to the signed-in account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          Backups include your account-namespaced study progress, syllabus data, sessions, bookmarks and streak, plus allowlisted legacy learning keys and this account's device-only hidden-message list. Login tokens, credentials and API-key-like entries are excluded. Keep downloaded backup files private.
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox checked={restoreSharedBookmarks} onCheckedChange={(value) => setRestoreSharedBookmarks(value === true)} />
          <span>Also restore legacy device-shared learning data, including old bookmarks. All restored legacy learning records are moved into this account's private namespace; none are written back to shared global keys.</span>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="default" className="w-full" onClick={() => void backupToCloud()} disabled={!user || busy}>
            <CloudUpload className="mr-2 h-4 w-4" />
            {busy ? 'Please wait…' : 'Back up to Cloud'}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => void restoreFromCloud()} disabled={!user || busy}>
            <CloudDownload className="mr-2 h-4 w-4" />
            Restore from Cloud
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={exportBackup} disabled={!user || busy}>
            <Download className="mr-2 h-4 w-4" />
            Export Backup File
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={!user || busy}>
            <FileUp className="mr-2 h-4 w-4" />
            Restore Backup File
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importBackup(file);
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Restore never replaces existing settings automatically. Study progress and sessions are merged; unknown conflicts remain unchanged.
        </p>
      </CardContent>
    </Card>
  );
}
