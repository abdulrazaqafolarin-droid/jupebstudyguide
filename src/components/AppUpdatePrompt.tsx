import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  canInstallPackages,
  downloadApk,
  fetchLatestRelease,
  getInstalledVersion,
  installDownloadedApk,
  openInstallSettings,
  isNativeApp,
  isNewer,
  type ReleaseInfo,
} from "@/lib/app-updater";

const DISMISS_KEY_PREFIX = "app-update-dismissed:";
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type PendingInstall = { release: ReleaseInfo; filePath: string };
type Phase =
  | { kind: "idle" }
  | { kind: "available"; release: ReleaseInfo }
  | { kind: "downloading"; release: ReleaseInfo; progress: number }
  | { kind: "permission"; release: ReleaseInfo; filePath: string }
  | { kind: "ready"; release: ReleaseInfo }
  | { kind: "reinstall"; release: ReleaseInfo }
  | { kind: "error"; release: ReleaseInfo | null; message: string; filePath?: string };

/**
 * Native APK updater. Checks again on resume/online, cleans partial downloads,
 * verifies the downloaded file is non-empty, and checks Android package-install
 * permission before launching the system installer.
 */
export function AppUpdatePrompt() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const pendingInstallRef = useRef<PendingInstall | null>(null);
  const installInProgressRef = useRef(false);
  const checkInFlightRef = useRef<Promise<void> | null>(null);
  const lastCheckAtRef = useRef(0);

  const dismiss = useCallback((versionCode: number) => {
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + versionCode, "1");
    } catch {
      /* storage can be unavailable in restricted WebViews */
    }
    pendingInstallRef.current = null;
    setPhase({ kind: "idle" });
  }, []);

  const checkForUpdate = useCallback(async (force = false) => {
    if (!isNativeApp() || !navigator.onLine || phaseRef.current.kind !== "idle") return;
    if (!force && Date.now() - lastCheckAtRef.current < UPDATE_CHECK_INTERVAL_MS) return;
    if (checkInFlightRef.current) return checkInFlightRef.current;

    const task = (async () => {
      lastCheckAtRef.current = Date.now();
      const [installed, latest] = await Promise.all([getInstalledVersion(), fetchLatestRelease()]);
      if (!installed || !latest) {
        // A transient offline/timeout failure must be retried on the next resume,
        // not suppressed by the normal six-hour successful-check interval.
        lastCheckAtRef.current = 0;
        return;
      }
      if (!isNewer(installed.versionCode, latest.versionCode)) return;

      try {
        if (localStorage.getItem(DISMISS_KEY_PREFIX + latest.versionCode)) return;
      } catch {
        /* still offer the update if storage is blocked */
      }
      setPhase(latest.requiresReinstall
        ? { kind: "reinstall", release: latest }
        : { kind: "available", release: latest });
    })().finally(() => {
      checkInFlightRef.current = null;
    });

    checkInFlightRef.current = task;
    return task;
  }, []);

  const attemptInstall = useCallback(async (pending: PendingInstall) => {
    if (installInProgressRef.current) return;
    installInProgressRef.current = true;

    try {
      const allowed = await canInstallPackages();
      if (!allowed) {
        pendingInstallRef.current = pending;
        setPhase({ kind: "permission", release: pending.release, filePath: pending.filePath });
        await openInstallSettings();
        return;
      }

      setPhase({ kind: "ready", release: pending.release });
      await installDownloadedApk(pending.filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown installer error";
      setPhase({
        kind: "error",
        release: pending.release,
        filePath: pending.filePath,
        message: message.toLowerCase().includes("permission")
          ? "Android blocked this installation. Allow JUPEB Master to install unknown apps, then retry."
          : "The APK downloaded, but Android could not open the installer. Retry the installation.",
      });
    } finally {
      installInProgressRef.current = false;
    }
  }, []);

  const startDownload = useCallback(async (release: ReleaseInfo) => {
    setPhase({ kind: "downloading", release, progress: 0 });
    pendingInstallRef.current = null;

    try {
      const filePath = await downloadApk(release.url, release.versionCode, release.sha256, (fraction) => {
        setPhase((current) => current.kind === "downloading" && current.release.versionCode === release.versionCode
          ? { ...current, progress: fraction }
          : current);
      });
      const pending = { release, filePath };
      pendingInstallRef.current = pending;
      await attemptInstall(pending);
    } catch (error) {
      pendingInstallRef.current = null;
      const message = error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Download failed or the downloaded file was incomplete. Check your connection and retry.";
      setPhase({ kind: "error", release, message });
    }
  }, [attemptInstall]);

  const retryInstall = useCallback(() => {
    const pending = pendingInstallRef.current;
    if (pending) void attemptInstall(pending);
  }, [attemptInstall]);

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;

    const check = () => {
      if (disposed || document.visibilityState !== "visible") return;
      const pending = pendingInstallRef.current;
      if (pending && phaseRef.current.kind === "permission") {
        // Returning from Android Settings should not reopen Settings in a loop.
        void canInstallPackages()
          .then((allowed) => {
            if (allowed) void attemptInstall(pending);
          })
          .catch(() => {});
      } else if (pending && phaseRef.current.kind === "error") {
        void attemptInstall(pending);
      } else {
        void checkForUpdate(false);
      }
    };

    void checkForUpdate(true);
    window.addEventListener("online", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const interval = window.setInterval(() => void checkForUpdate(false), UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      window.removeEventListener("online", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(interval);
    };
  }, [attemptInstall, checkForUpdate]);

  if (phase.kind === "idle") return null;
  const release = phase.release;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[9998] w-[92vw] max-w-sm -translate-x-1/2">
      <div className="space-y-2.5 rounded-2xl border border-primary/30 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {phase.kind === "error"
                ? "Update needs attention"
                : phase.kind === "permission"
                  ? "Allow APK installation"
                  : phase.kind === "reinstall"
                    ? "One-time reinstall required"
                    : "Update available · v" + (release?.versionName ?? "")}
            </p>
            <p className="text-xs text-muted-foreground">
              {phase.kind === "downloading" && "Downloading… " + Math.round(phase.progress * 100) + "%"}
              {phase.kind === "ready" && "Installer opened. Confirm the update in Android’s system prompt."}
              {phase.kind === "reinstall" && "This release uses a new Android signing key, so Android cannot install it over the current app. Confirm your account is synced, download the APK, uninstall the older JUPEB Master app, then install the new APK and sign in again. Your Supabase account data stays online."}
              {phase.kind === "available" && "A newer version is ready. Your study data stays on your account."}
              {phase.kind === "permission" && "Android needs install permission. Choose Allow in its system prompt, then return here."}
              {phase.kind === "error" && phase.message}
            </p>
          </div>
          {phase.kind === "available" && release && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void startDownload(release)}>
              <Download className="h-3.5 w-3.5" />
              Update
            </Button>
          )}
          {phase.kind === "reinstall" && (
            <Button
              size="sm"
              className="h-8 shrink-0 gap-1.5"
              onClick={() => window.location.assign("/download")}
            >
              <Download className="h-3.5 w-3.5" />
              Download page
            </Button>
          )}
          {phase.kind === "ready" && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={retryInstall}>
              <Download className="h-3.5 w-3.5" />
              Open installer
            </Button>
          )}
          {phase.kind === "permission" && (
            <Button
              size="sm"
              className="h-8 shrink-0 gap-1.5"
              onClick={() => void openInstallSettings().catch(() => {
                setPhase({ kind: "error", release, filePath: phase.filePath, message: "Could not open Android's install-permission settings. Open Settings → Apps → Special app access → Install unknown apps → JUPEB Master." });
              })}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Open settings
            </Button>
          )}
          {phase.kind === "error" && phase.filePath && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={retryInstall}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Retry install
            </Button>
          )}
          {phase.kind === "error" && release && !phase.filePath && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void startDownload(release)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {(phase.kind === "available" || phase.kind === "reinstall" || phase.kind === "permission" || phase.kind === "error" || phase.kind === "ready") && release && (
            <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => dismiss(release.versionCode)}>
              Later
            </Button>
          )}
        </div>
        {phase.kind === "downloading" && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <Progress value={phase.progress * 100} className="h-2 flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}

export default AppUpdatePrompt;