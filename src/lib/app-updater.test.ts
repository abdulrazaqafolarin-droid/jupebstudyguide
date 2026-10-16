import { describe, expect, it } from "vitest";
import { isNewer, parseReleaseInfo } from "./app-updater";

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
        url: "https://example.com/jupeb-master.apk",
      }),
    ).toEqual({
      versionCode: 41,
      versionName: "1.1.41",
      commit: "abc123",
      builtAt: "2026-10-16T15:00:00Z",
      url: "https://example.com/jupeb-master.apk",
    });
  });

  it("rejects corrupt payloads", () => {
    expect(parseReleaseInfo(null)).toBeNull();
    expect(parseReleaseInfo({})).toBeNull();
    expect(parseReleaseInfo({ versionCode: "41", url: "https://x" })).toBeNull();
    expect(parseReleaseInfo({ versionCode: 41, url: "http://insecure/x.apk" })).toBeNull();
  });
});
