import { describe, expect, it } from "vitest";
import { JAMB_IMPORT_PROTOCOL_VERSION, supportsResumableJambImport } from "./jamb-import-client";

describe("JAMB resumable importer protocol", () => {
  it("uses the version implemented by the branch importer", () => {
    expect(JAMB_IMPORT_PROTOCOL_VERSION).toBe(2);
  });

  it("accepts only an endpoint with all safe-retry capabilities", () => {
    expect(supportsResumableJambImport({
      protocol_version: 2,
      resumable_source_chunks: true,
      stable_item_offsets: true,
      duplicate_chunk_retries: true,
    })).toBe(true);
  });

  it("rejects the old live importer and partial capability responses", () => {
    expect(supportsResumableJambImport({ protocol_version: 1 })).toBe(false);
    expect(supportsResumableJambImport({
      protocol_version: 2,
      resumable_source_chunks: true,
      stable_item_offsets: true,
      duplicate_chunk_retries: false,
    })).toBe(false);
    expect(supportsResumableJambImport(null)).toBe(false);
  });
});
