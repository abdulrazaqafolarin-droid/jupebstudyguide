import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const VERSION_URL =
  "https://gzyczowqqywesqhqqpdi.supabase.co/storage/v1/object/public/app-releases/version.json";
export const APK_FILE_NAME = "jupeb-master.apk";
export const RELEASE_APK_URL =
  "https://gzyczowqqywesqhqqpdi.supabase.co/storage/v1/object/public/app-releases/jupeb-master.apk";

export interface ReleaseInfo {
  versionCode: number;
  versionName: string;
  commit: string;
  builtAt: string;
  url: string;
  sha256: string;
  /** True only for the one-time transition away from the legacy debug signing key. */
  requiresReinstall?: boolean;
}

interface DownloadProgress {
  url: string;
  bytes: number;
  contentLength: number;
  lengthComputable: boolean;
}

interface AppUpdaterPlugin {
  getInstalledVersion(): Promise<{ versionCode: number; versionName: string }>;
  canInstallPackages(): Promise<{ canInstall: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadApk(options: { url: string; versionCode: number }): Promise<{
    filePath: string;
    bytes: number;
    sha256: string;
  }>;
  deleteDownloadedApk(options: { filePath: string }): Promise<void>;
  installApk(options: { filePath: string }): Promise<void>;
  getFileSha256(options: { filePath: string }): Promise<{ sha256: string }>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (status: DownloadProgress) => void,
  ): Promise<PluginListenerHandle>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater");

export const isNativeApp = () => Capacitor.isNativePlatform();

/** Plain numeric comparison: any higher published code is an update. */
export function isNewer(installedCode: number, latestCode: number): boolean {
  return (
    Number.isFinite(installedCode) &&
    Number.isFinite(latestCode) &&
    latestCode > installedCode
  );
}

/** Strict-shape validation so a corrupt version.json can never brick the flow. */
export function parseReleaseInfo(raw: unknown): ReleaseInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.versionCode !== "number" ||
    !Number.isSafeInteger(r.versionCode) ||
    r.versionCode < 1 ||
    typeof r.url !== "string" ||
    r.url !== RELEASE_APK_URL ||
    typeof r.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(r.sha256)
  ) {
    return null;
  }
  return {
    versionCode: r.versionCode,
    versionName: typeof r.versionName === "string" ? r.versionName : String(r.versionCode),
    commit: typeof r.commit === "string" ? r.commit : "",
    builtAt: typeof r.builtAt === "string" ? r.builtAt : "",
    url: r.url,
    sha256: r.sha256.toLowerCase(),
    requiresReinstall: r.requiresReinstall === true,
  };
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(VERSION_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseReleaseInfo(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getInstalledVersion(): Promise<{
  versionCode: number;
  versionName: string;
} | null> {
  if (!isNativeApp()) return null;
  try {
    const v = await AppUpdater.getInstalledVersion();
    return Number.isFinite(v.versionCode) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Streams a trusted APK directly into the app-private native cache. The
 * background native downloader enforces HTTP/size limits, removes partial
 * files, and calculates SHA-256 without passing APK bytes through the WebView.
 */
export async function downloadApk(
  url: string,
  versionCode: number,
  expectedSha256: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  if (url !== RELEASE_APK_URL) throw new Error("Untrusted APK download URL");
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error("Release version code is invalid");
  }
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256)) {
    throw new Error("Release checksum is missing or invalid");
  }

  let progressListener: PluginListenerHandle | null = null;
  let downloadedPath: string | null = null;

  try {
    try {
      progressListener = await AppUpdater.addListener("downloadProgress", (status) => {
        if (status.url !== url || !status.lengthComputable || status.contentLength <= 0) return;
        if (Number.isFinite(status.bytes) && Number.isFinite(status.contentLength)) {
          onProgress(Math.min(1, Math.max(0, status.bytes / status.contentLength)));
        }
      });
    } catch {
      // The APK can still download safely if progress callbacks are unavailable.
    }

    const result = await AppUpdater.downloadApk({ url, versionCode });
    downloadedPath = result.filePath;
    if (!downloadedPath || !Number.isFinite(result.bytes) || result.bytes <= 0) {
      throw new Error("Download finished without a valid APK file");
    }
    if (result.sha256?.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error("APK checksum verification failed");
    }

    // Re-read the finalized file to verify the bytes presented to Android's installer.
    const checksum = await AppUpdater.getFileSha256({ filePath: downloadedPath });
    if (checksum.sha256?.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error("APK checksum verification failed");
    }

    onProgress(1);
    return downloadedPath;
  } catch (error) {
    if (downloadedPath) {
      try {
        await AppUpdater.deleteDownloadedApk({ filePath: downloadedPath });
      } catch {
        // Best-effort cleanup; a subsequent download removes the same version file.
      }
    }
    throw error;
  } finally {
    if (progressListener) {
      try {
        await progressListener.remove();
      } catch {
        // Listener cleanup must not turn a valid APK into a failed download.
      }
    }
  }
}

export async function canInstallPackages(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const result = await AppUpdater.canInstallPackages();
  return result.canInstall === true;
}

export async function openInstallSettings(): Promise<void> {
  if (!isNativeApp()) throw new Error("APK updates are available only in the Android app");
  await AppUpdater.openInstallSettings();
}

export async function installDownloadedApk(absolutePath: string): Promise<void> {
  await AppUpdater.installApk({ filePath: absolutePath });
}
