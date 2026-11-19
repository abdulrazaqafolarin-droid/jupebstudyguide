export const JAMB_IMPORT_PROTOCOL_VERSION = 2;

export function supportsResumableJambImport(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const capabilities = value as Record<string, unknown>;
  return capabilities.protocol_version === JAMB_IMPORT_PROTOCOL_VERSION &&
    capabilities.resumable_source_chunks === true &&
    capabilities.stable_item_offsets === true &&
    capabilities.duplicate_chunk_retries === true;
}
