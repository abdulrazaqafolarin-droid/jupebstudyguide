import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

export const VERSION_URL =
  "https://gzyczowqqywesqhqqpdi.supabase.co/storage/v1/object/public/app-releases/version.json";
export const APK_FILE_NAME = "jupeb-master.apk";

export interface ReleaseInfo {
  versionCode: number;
  versionName: string;
  commit: string;
  builtAt: string;
  url: string;
}

interface AppUpdaterPlugin {
  getInstalledVersion(): Promise<{ versionCode: number; versionName: string }>;
  canInstallPackages(): Promise<{ canInstall: boolean }>;
  installApk(options: { filePath: string }): Promise<void>;
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
    !Number.isFinite(r.versionCode) ||
    typeof r.url !== "string" ||
    !r.url.startsWith("https://")
  ) {
    return null;
  }
  return {
    versionCode: r.versionCode,
    versionName: typeof r.versionName === "string" ? r.versionName : String(r.versionCode),
    commit: typeof r.commit === "string" ? r.commit : "",
    builtAt: typeof r.builtAt === "string" ? r.builtAt : "",
    url: r.url,
  };
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(VERSION_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return parseReleaseInfo(await res.json());
  } catch {
    return null;
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
 * Downloads the APK into the app cache dir with progress callbacks.
 * Uses the native downloader so the file streams straight to disk (the old
 * fetch→base64→bridge path pushed ~16MB strings through the WebView and
 * wrote into a non-existent `updates/` dir, which Filesystem.writeFile
 * rejects unless `recursive` is set — that was the "Update failed" bug).
 * Returns the absolute file path for the native installer.
 */
export async function downloadApk(
  url: string,
  versionCode: number,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const dir = "updates";
  const path = `${dir}/${APK_FILE_NAME.replace(".apk", "")}-${versionCode}.apk`;
  // downloadFile does not create missing parents — ensure the subdir exists.
  try {
    await Filesystem.mkdir({ path: dir, directory: Directory.Cache });
  } catch {
    /* already exists */
  }
  const handle = await Filesystem.addListener("progress", (status) => {
    if (status.url !== url) return;
    if (status.contentLength > 0) {
      onProgress(Math.min(1, status.bytes / status.contentLength));
    }
  });
  try {
    const result = await Filesystem.downloadFile({
      url,
      path,
      directory: Directory.Cache,
      progress: true,
    });
    onProgress(1);
    if (!result.path) throw new Error("download returned no path");
    // Native side needs a plain filesystem path (result.path is absolute).
    return result.path;
  } finally {
    await handle.remove();
  }
}

export async function installDownloadedApk(absolutePath: string): Promise<void> {
  await AppUpdater.installApk({ filePath: absolutePath });
}
