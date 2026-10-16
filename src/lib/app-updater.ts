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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const comma = url.indexOf(",");
      if (comma < 0) {
        reject(new Error("bad data URL"));
        return;
      }
      resolve(url.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads the APK into the app cache dir with progress callbacks.
 * Returns the absolute file path for the native installer.
 */
export async function downloadApk(
  url: string,
  versionCode: number,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  onProgress(1);
  const base64 = await blobToBase64(new Blob(chunks, { type: "application/vnd.android.package-archive" }));
  const path = `updates/${APK_FILE_NAME.replace(".apk", "")}-${versionCode}.apk`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  // Native side needs a filesystem path, not a URI.
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

export async function installDownloadedApk(absolutePath: string): Promise<void> {
  await AppUpdater.installApk({ filePath: absolutePath });
}
