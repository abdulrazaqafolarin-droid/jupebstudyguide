import { describe, expect, it } from "vitest";
import { getTextbookDatabaseName } from "@/lib/rag";

describe("programme and account scoped textbook indexes", () => {
  it("uses a distinct local index for each exam programme", () => {
    expect(getTextbookDatabaseName("jupeb", "user-1")).not.toBe(getTextbookDatabaseName("jamb", "user-1"));
  });

  it("uses a distinct local index for each signed-in account", () => {
    expect(getTextbookDatabaseName("jamb", "user-1")).not.toBe(getTextbookDatabaseName("jamb", "user-2"));
  });

  it("rejects a missing account identity", () => {
    expect(() => getTextbookDatabaseName("jamb", " ")).toThrow("signed-in account");
  });
});
