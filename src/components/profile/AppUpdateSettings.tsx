import { useEffect, useState } from 'react';
import { Download, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  canInstallPackages,
  downloadApk,
  fetchLatestRelease,
  getInstalledVersion,
  installDownloadedApk,
  isAndroidApp,
  isNewer,
  openInstallSettings,
  type ReleaseInfo,
} from '@/lib/app-updater';

export function AppUpdateSettings() {
  const [installed, setInstalled] = useState<{ versionCode: number; versionName: string } | null>(null);
  const [latest, setLatest] = useState<ReleaseInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAndroidApp()) return;
    let active = true;
    getInstalledVersion().then((version) => {
      if (active) setInstalled(version);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!isAndroidApp()) return null;

  const updateAvailable = Boolean(
    installed && latest && isNewer(installed.versionCode, latest.versionCode),
  );

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const [current, release] = await Promise.all([
        getInstalledVersion(),
        fetchLatestRelease(),
      ]);
      setInstalled(current);
      setLatest(release);
      if (!release) {
        toast.error('Could not check for updates. Please try again later.');
        return;
      }
      if (!current) {
        toast.error('Could not read the installed app version.');
        return;
      }
      if (!isNewer(current.versionCode, release.versionCode)) {
        toast.success('You are using the latest version.');
        return;
      }

      const allowed = await canInstallPackages();
      if (!allowed) {
        toast.info('Allow Rutex Master Next to install updates, then return here and check again.');
        await openInstallSettings();
        return;
      }

      setDownloading(true);
      setProgress(0);
      const filePath = await downloadApk(
        release.url,
        release.versionCode,
        release.sha256,
        setProgress,
      );
      toast.success(`Downloaded version ${release.versionName}. Opening installer...`);
      await installDownloadedApk(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed unexpectedly.';
      toast.error(message);
    } finally {
      setChecking(false);
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">App updates</h3>
          <p className="text-xs text-muted-foreground">
            {installed ? `Installed version ${installed.versionName}` : 'Check for the latest Rutex Master Next version'}
          </p>
        </div>
      </div>
      {updateAvailable && latest && (
        <p className="text-sm text-primary">
          Version {latest.versionName} is available.
        </p>
      )}
      {downloading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Downloading update</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}
      <Button onClick={checkForUpdates} disabled={checking || downloading} className="w-full">
        {checking || downloading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {downloading ? 'Downloading update…' : checking ? 'Checking…' : 'Check for Updates'}
      </Button>
    </section>
  );
}
