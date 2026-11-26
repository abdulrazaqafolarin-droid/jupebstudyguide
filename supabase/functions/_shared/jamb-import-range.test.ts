import { JAMB_IMPORT_PROTOCOL_VERSION, resolveJambImportItemRange } from "./jamb-import-range.ts";

Deno.test("JAMB importer advertises the resumable chunk protocol version", () => {
  if (JAMB_IMPORT_PROTOCOL_VERSION !== 2) {
    throw new Error("The resumable JAMB importer protocol version must match the client capability gate.");
  }
});

Deno.test("JAMB import chunk uses its explicit source-package offset", () => {
  const range = resolveJambImportItemRange(50, 50, 50, 896);
  if (range.offset !== 50 || range.firstItemNumber !== 51 || range.lastItemNumber !== 100) {
    throw new Error("Explicit chunk offsets must map to stable one-based item numbers.");
  }
});

Deno.test("JAMB import chunk falls back to the current count for legacy callers", () => {
  const range = resolveJambImportItemRange(undefined, 100, 25, 896);
  if (range.offset !== 100 || range.firstItemNumber !== 101 || range.lastItemNumber !== 125) {
    throw new Error("Legacy chunks should continue from the current item count.");
  }
});

Deno.test("JAMB import chunk rejects negative and overflowing ranges", () => {
  for (const args of [
    [-1, 0, 10, 100],
    [95, 0, 10, 100],
    [0, 0, 0, 100],
  ] as const) {
    let rejected = false;
    try {
      resolveJambImportItemRange(args[0], args[1], args[2], args[3]);
    } catch (error) {
      rejected = error instanceof RangeError;
    }
    if (!rejected) throw new Error("Invalid JAMB source chunk range was accepted.");
  }
});
