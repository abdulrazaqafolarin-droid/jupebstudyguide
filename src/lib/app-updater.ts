import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

const STORAGE_ORIGIN = "https://gzyczowqqywesqhqqpdi.supabase.co";
const STORAGE_ROOT_PATH = "/storage/v1/object/public/app-releases";
const DEFAULT_RELEASE_BASE_URL = `${STORAGE_ORIGIN}${STORAGE_ROOT_PATH}`;
const DEFAULT_APK_FILE_NAME = "jupeb-master.apk";

function resolveReleaseBaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) return DEFAULT_RELEASE_BASE_URL;
  try {
    const candidate = new URL(raw.trim());
    const allowedPath = candidate.pathname === STORAGE_ROOT_PATH
      || candidate.pathname.startsWith(`${STORAGE_ROOT_PATH}/`);
    if (
      candidate.protocol !== "https:"
      || candidate.origin !== STORAGE_ORIGIN
      || !allowedPath
      || candidate.search
      || candidate.hash
    ) {
      return DEFAULT_RELEASE_BASE_URL;
    }
    return candidate.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_RELEASE_BASE_URL;
  }
}

/**
 * The existing Rutex Master install keeps the legacy release folder. The
 * successor app compiles with its own folder and versioned immutable APK names.
 */
export const RELEASE_BASE_URL = resolveReleaseBaseUrl(
  import.meta.env.VITE_ANDROID_RELEASE_BASE_URL,
);
const configuredApkFileName = import.meta.env.VITE_ANDROID_RELEASE_APK_NAME?.trim();
export const APK_FILE_NAME = configuredApkFileName
  && /^[a-z0-9][a-z0-9-]*\.apk$/i.test(configuredApkFileName)
  ? configuredApkFileName
  : DEFAULT_APK_FILE_NAME;
const EXPECTED_PACKAGE_NAME = import.meta.env.VITE_ANDROID_PACKAGE_NAME?.trim();

export const VERSION_URL = `${RELEASE_BASE_URL}/version.json`;

/** Returns the only permitted APK URL for the supplied manifest version. */
export function getReleaseApkUrl(versionCode: number): string {
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) return "";
  const fileName = APK_FILE_NAME === DEFAULT_APK_FILE_NAME
    ? APK_FILE_NAME
    : `${APK_FILE_NAME.replace(/\.apk$/i, "")}-${versionCode}.apk`;
  return `${RELEASE_BASE_URL}/${fileName}`;
}

// Backward-compatible export for code paths that only need the legacy default.
export const RELEASE_APK_URL = getReleaseApkUrl(1);

export interface ReleaseInfo {
  versionCode: number;
  versionName: string;
  commit: string;
  builtAt: string;
  url: string;
  sha256: string;
  /** True only for an explicitly reviewed signing-key transition. */
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

/** The APK updater is an Android-only capability; never expose it in the iOS shell. */
export const isAndroidApp = () => Capacitor.getPlatform() === "android";

/** Plain numeric comparison: any higher published code is an update. */
export function isNewer(installedCode: number, latestCode: number): boolean {
  return (
    Number.isFinite(installedCode) &&
    Number.isFinite(latestCode) &&
    latestCode > installedCode
  );
}

/** Strict-shape validation keeps corrupt metadata from reaching the installer. */
export function parseReleaseInfo(raw: unknown): ReleaseInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.versionCode !== "number" ||
    !Number.isSafeInteger(r.versionCode) ||
    r.versionCode < 1 ||
    typeof r.url !== "string" ||
    r.url !== getReleaseApkUrl(r.versionCode) ||
    typeof r.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(r.sha256) ||
    (EXPECTED_PACKAGE_NAME && r.packageName !== EXPECTED_PACKAGE_NAME)
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
  if (!isAndroidApp()) return null;
  try {
    const v = await AppUpdater.getInstalledVersion();
    return Number.isFinite(v.versionCode) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Streams a trusted APK directly into the app-private native cache. The
 * native downloader independently allowlists the same release folders, checks
 * package identity and signing certificate, enforces size limits, and hashes
 * the bytes without passing the APK through the WebView.
 */
export async function downloadApk(
  url: string,
  versionCode: number,
  expectedSha256: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  if (!isAndroidApp()) throw new Error("APK downloads are only available in the Android app");
  if (url !== getReleaseApkUrl(versionCode)) throw new Error("Untrusted APK download URL");
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
  if (!isAndroidApp()) return false;
  const result = await AppUpdater.canInstallPackages();
  return result.canInstall === true;
}

export async function openInstallSettings(): Promise<void> {
  if (!isAndroidApp()) throw new Error("APK updates are available only in the Android app");
  await AppUpdater.openInstallSettings();
}

export async function installDownloadedApk(absolutePath: string): Promise<void> {
  if (!isAndroidApp()) throw new Error("APK installation is only available in the Android app");
  await AppUpdater.installApk({ filePath: absolutePath });
}
