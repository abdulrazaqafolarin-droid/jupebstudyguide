import { describe, expect, it } from "vitest";
import {
  AUTO_CLOUD_BACKUP_INTERVAL_MS,
  isAutoCloudBackupDue,
} from "./auto-cloud-backup-schedule";

describe("isAutoCloudBackupDue", () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);

  it("backs up when no successful backup has been recorded", () => {
    expect(isAutoCloudBackupDue(null, now)).toBe(true);
  });

  it("waits until a full day has passed", () => {
    expect(isAutoCloudBackupDue(now - AUTO_CLOUD_BACKUP_INTERVAL_MS + 1, now)).toBe(false);
    expect(isAutoCloudBackupDue(now - AUTO_CLOUD_BACKUP_INTERVAL_MS, now)).toBe(true);
  });

  it("retries when the recorded timestamp is invalid", () => {
    expect(isAutoCloudBackupDue(Number.NaN, now)).toBe(true);
    expect(isAutoCloudBackupDue(0, now)).toBe(true);
  });

  it("does not treat a clock moving backwards as a due backup", () => {
    expect(isAutoCloudBackupDue(now + 1, now)).toBe(false);
  });

  it("rejects an invalid current time", () => {
    expect(isAutoCloudBackupDue(null, Number.NaN)).toBe(false);
  });
});
