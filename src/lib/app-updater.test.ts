import { describe, expect, it } from "vitest";
import { isNewer, parseReleaseInfo, RELEASE_APK_URL } from "./app-updater";

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
