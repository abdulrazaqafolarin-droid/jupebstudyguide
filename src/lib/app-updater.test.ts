import { afterEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { downloadApk, getReleaseApkUrl, installDownloadedApk, isNewer, parseReleaseInfo, RELEASE_APK_URL } from "./app-updater";

describe("isAndroidApp", () => {
  afterEach(() => vi.restoreAllMocks());

  it("enables the APK updater only on Android", async () => {
    const { isAndroidApp } = await import("./app-updater");
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("android");
    expect(isAndroidApp()).toBe(true);
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("ios");
    expect(isAndroidApp()).toBe(false);
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("web");
    expect(isAndroidApp()).toBe(false);
  });
});

describe("Android-only updater operations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("blocks APK download and installation on iOS before touching the native plugin", async () => {
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("ios");

    await expect(
      downloadApk(RELEASE_APK_URL, 1, "a".repeat(64), vi.fn()),
    ).rejects.toThrow("APK downloads are only available in the Android app");

    await expect(
      installDownloadedApk("/tmp/not-a-real-apk"),
    ).rejects.toThrow("APK installation is only available in the Android app");
  });

  it("blocks APK download and installation in the browser too", async () => {
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("web");

    await expect(
      downloadApk(RELEASE_APK_URL, 1, "a".repeat(64), vi.fn()),
    ).rejects.toThrow("APK downloads are only available in the Android app");

    await expect(
      installDownloadedApk("/tmp/not-a-real-apk"),
    ).rejects.toThrow("APK installation is only available in the Android app");
  });
});

describe("getReleaseApkUrl", () => {
  it("keeps the legacy app on its fixed APK URL", () => {
    expect(getReleaseApkUrl(41, "https://example.supabase.co/app-releases", "jupeb-master.apk"))
      .toBe("https://example.supabase.co/app-releases/jupeb-master.apk");
  });

  it("uses an immutable APK URL for each successor version", () => {
    expect(getReleaseApkUrl(200321, "https://example.supabase.co/app-releases/rutex-master-next", "rutex-master-next.apk"))
      .toBe("https://example.supabase.co/app-releases/rutex-master-next/rutex-master-next-200321.apk");
  });

  it("rejects invalid version codes", () => {
    expect(getReleaseApkUrl(0, "https://example.supabase.co/app-releases/rutex-master-next", "rutex-master-next.apk"))
      .toBe("");
  });
});

describe("isNewer", () => {
  it("detects a higher published code", () => {
    expect(isNewer(2, 3)).toBe(true);
    expect(isNewer(40, 41)).toBe(true);
  });

  it("ignores equal or older codes", () => {
    expect(isNewer(3, 3)).toBe(false);
    expect(isNewer(5, 4)).toBe(false);
  });

  it("rejects non-finite codes", () => {
    expect(isNewer(NaN, 3)).toBe(false);
    expect(isNewer(2, NaN)).toBe(false);
  });
});

describe("parseReleaseInfo", () => {
  it("accepts a well-formed payload", () => {
    expect(
      parseReleaseInfo({
        versionCode: 41,
        versionName: "1.1.41",
        commit: "abc123",
        builtAt: "2026-10-16T15:00:00Z",
        url: RELEASE_APK_URL,
        sha256: "a".repeat(64),
      }),
    ).toEqual({
      versionCode: 41,
      versionName: "1.1.41",
      commit: "abc123",
      builtAt: "2026-10-16T15:00:00Z",
      url: RELEASE_APK_URL,
      sha256: "a".repeat(64),
      requiresReinstall: false,
    });
  });

  it("preserves the explicit one-time reinstall flag", () => {
    expect(parseReleaseInfo({
      versionCode: 42,
      url: RELEASE_APK_URL,
      sha256: "b".repeat(64),
      requiresReinstall: true,
    })).toMatchObject({
      versionCode: 42,
      requiresReinstall: true,
    });

    // Older metadata remains valid and defaults to a normal in-place update.
    expect(parseReleaseInfo({
      versionCode: 43,
      url: RELEASE_APK_URL,
      sha256: "c".repeat(64),
    })?.requiresReinstall).toBe(false);
  });

  it("rejects corrupt payloads", () => {
    expect(parseReleaseInfo(null)).toBeNull();
    expect(parseReleaseInfo({})).toBeNull();
    expect(parseReleaseInfo({ versionCode: "41", url: "https://x" })).toBeNull();
    expect(parseReleaseInfo({ versionCode: 41, url: "http://insecure/x.apk" })).toBeNull();
    expect(parseReleaseInfo({ versionCode: 41, url: "https://example.com/jupeb-master.apk" })).toBeNull();
    expect(parseReleaseInfo({ versionCode: 0, url: RELEASE_APK_URL, sha256: "a".repeat(64) })).toBeNull();
    expect(parseReleaseInfo({ versionCode: 41, url: RELEASE_APK_URL, sha256: "not-a-checksum" })).toBeNull();
  });
});
