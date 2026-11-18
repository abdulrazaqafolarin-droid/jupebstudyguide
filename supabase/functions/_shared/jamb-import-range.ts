export interface JambImportItemRange {
  /** Zero-based offset within the original source package. */
  offset: number;
  /** One-based first item_number written to question_import_items. */
  firstItemNumber: number;
  /** One-based last item_number written to question_import_items. */
  lastItemNumber: number;
}

/** Resolve a chunk's stable package offset and reject ranges outside the source pack. */
export function resolveJambImportItemRange(
  requestedOffset: unknown,
  currentCount: number,
  chunkLength: number,
  expectedItems: number,
): JambImportItemRange {
  const offset = Number.isInteger(requestedOffset)
    ? Number(requestedOffset)
    : currentCount;

  if (!Number.isInteger(offset) || offset < 0 ||
      !Number.isInteger(chunkLength) || chunkLength < 1 ||
      !Number.isInteger(expectedItems) || expectedItems < 1 ||
      offset + chunkLength > expectedItems) {
    throw new RangeError("The requested item range must stay within the source package.");
  }

  return {
    offset,
    firstItemNumber: offset + 1,
    lastItemNumber: offset + chunkLength,
  };
}
