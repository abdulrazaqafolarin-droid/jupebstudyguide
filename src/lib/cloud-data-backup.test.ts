import { describe, expect, it } from "vitest";
import { findLatestCloudBackupFile } from "./cloud-data-backup-utils";

describe("findLatestCloudBackupFile", () => {
  it("selects the newest timestamped backup file", () => {
    const result = findLatestCloudBackupFile([
      { id: "old", name: "jupeb-backup-1793900000000.json" },
      { id: "new", name: "jupeb-backup-1794000000000.json" },
      { id: "middle", name: "jupeb-backup-1793950000000.json" },
    ]);

    expect(result?.id).toBe("new");
  });

  it("ignores folders and unrelated files", () => {
    const result = findLatestCloudBackupFile([
      { id: null, name: "jupeb-backup-1794000000000.json" },
      { id: "document", name: "notes.pdf" },
      { id: "malformed", name: "jupeb-backup-latest.json" },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when no backup exists", () => {
    expect(findLatestCloudBackupFile([])).toBeNull();
  });
});
