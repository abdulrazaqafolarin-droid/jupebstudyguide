import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  downloadApk,
  fetchLatestRelease,
  getInstalledVersion,
  installDownloadedApk,
  isNativeApp,
  isNewer,
  type ReleaseInfo,
} from "@/lib/app-updater";

const DISMISS_KEY_PREFIX = "app-update-dismissed:";

type Phase =
  | { kind: "idle" }
  | { kind: "available"; release: ReleaseInfo }
  | { kind: "downloading"; release: ReleaseInfo; progress: number }
  | { kind: "ready"; release: ReleaseInfo; filePath: string }
  | { kind: "error"; release: ReleaseInfo | null; message: string };

/**
 * In-app updater for the sideloaded APK. On launch (native only) it compares
 * the installed versionCode against the published version.json; when newer,
 * it offers download-with-progress and fires the system installer.
 * Renders nothing on web — the PWA update banner covers that case.
 */
export function AppUpdatePrompt() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isNativeApp() || checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;
    (async () => {
      const [installed, latest] = await Promise.all([
        getInstalledVersion(),
        fetchLatestRelease(),
      ]);
      if (cancelled || !installed || !latest) return;
      if (!isNewer(installed.versionCode, latest.versionCode)) return;
      try {
        if (localStorage.getItem(DISMISS_KEY_PREFIX + latest.versionCode)) return;
      } catch { /* storage unavailable — still prompt */ }
      if (!cancelled) setPhase({ kind: "available", release: latest });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((versionCode: number) => {
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + versionCode, "1");
    } catch { /* ignore */ }
    setPhase({ kind: "idle" });
  }, []);

  const startDownload = useCallback(async (release: ReleaseInfo) => {
    setPhase({ kind: "downloading", release, progress: 0 });
    let filePath: string;
    try {
      filePath = await downloadApk(release.url, release.versionCode, (fraction) =>
        setPhase({ kind: "downloading", release, progress: fraction }),
      );
    } catch {
      setPhase({
        kind: "error",
        release,
        message: "Download failed. Check your connection and try again.",
      });
      return;
    }
    setPhase({ kind: "ready", release, filePath });
    // Hand straight to the system installer — it shows its own confirm UI.
    try {
      await installDownloadedApk(filePath);
    } catch {
      setPhase({
        kind: "error",
        release,
        message: "Couldn't open the installer. Check that installing unknown apps is allowed, then Retry.",
      });
    }
  }, []);

  if (phase.kind === "idle") return null;

  const release = phase.release;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[9998] w-[92vw] max-w-sm -translate-x-1/2"
    >
      <div className="space-y-2.5 rounded-2xl border border-primary/30 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {phase.kind === "error" ? "Update failed" : `Update available · v${release?.versionName ?? ""}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {phase.kind === "downloading" && `Downloading… ${Math.round(phase.progress * 100)}%`}
              {phase.kind === "ready" && "Downloaded — opening the installer. Tap Install on the system prompt."}
              {phase.kind === "available" && "New features and fixes. Free, no data loss."}
              {phase.kind === "error" && phase.message}
            </p>
          </div>
          {phase.kind === "available" && release && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void startDownload(release)}>
              <Download className="h-3.5 w-3.5" />
              Update
            </Button>
          )}
          {phase.kind === "error" && release && (
            <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => void startDownload(release)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {phase.kind === "ready" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              onClick={() => release && dismiss(release.versionCode)}
            >
              Later
            </Button>
          )}
          {(phase.kind === "available" || phase.kind === "error") && release && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 shrink-0"
              onClick={() => dismiss(release.versionCode)}
            >
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
