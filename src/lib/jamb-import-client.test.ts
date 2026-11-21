import { describe, expect, it } from "vitest";
import { JAMB_IMPORT_PROTOCOL_VERSION, supportsResumableJambImport } from "./jamb-import-client";

const currentCapabilities = {
  protocol_version: 2,
  resumable_source_chunks: true,
  stable_item_offsets: true,
  duplicate_chunk_retries: true,
  supported_subjects: ["physics", "chemistry", "biology", "use_of_english"],
  source_answer_suggestions_supported: true,
  verified_answer_and_explanation_required: true,
};

describe("JAMB resumable importer protocol", () => {
  it("uses the version implemented by the branch importer", () => {
    expect(JAMB_IMPORT_PROTOCOL_VERSION).toBe(2);
  });

  it("accepts all supported JAMB subjects, including compulsory Use of English", () => {
    for (const subject of currentCapabilities.supported_subjects) {
      expect(supportsResumableJambImport(currentCapabilities, subject)).toBe(true);
    }
  });

  it("rejects a subject the deployed backend does not support", () => {
    expect(supportsResumableJambImport(currentCapabilities, "mathematics")).toBe(false);
  });

  it("rejects old or incomplete backends before source files can be uploaded", () => {
    expect(supportsResumableJambImport({ protocol_version: 1 }, "use_of_english")).toBe(false);
    expect(supportsResumableJambImport({
      ...currentCapabilities,
      supported_subjects: undefined,
    }, "use_of_english")).toBe(false);
    expect(supportsResumableJambImport({
      ...currentCapabilities,
      source_answer_suggestions_supported: false,
    }, "use_of_english")).toBe(false);
    expect(supportsResumableJambImport({
      ...currentCapabilities,
      verified_answer_and_explanation_required: false,
    }, "use_of_english")).toBe(false);
    expect(supportsResumableJambImport({
      ...currentCapabilities,
      duplicate_chunk_retries: false,
    }, "use_of_english")).toBe(false);
    expect(supportsResumableJambImport(null, "use_of_english")).toBe(false);
  });
});
