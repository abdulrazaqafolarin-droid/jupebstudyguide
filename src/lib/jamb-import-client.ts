export const JAMB_IMPORT_PROTOCOL_VERSION = 2;

export function supportsResumableJambImport(value: unknown, subject: string): boolean {
  if (!value || typeof value !== "object" || !subject.trim()) return false;
  const capabilities = value as Record<string, unknown>;
  const supportedSubjects = capabilities.supported_subjects;
  return capabilities.protocol_version === JAMB_IMPORT_PROTOCOL_VERSION &&
    capabilities.resumable_source_chunks === true &&
    capabilities.stable_item_offsets === true &&
    capabilities.duplicate_chunk_retries === true &&
    capabilities.source_answer_suggestions_supported === true &&
    capabilities.verified_answer_and_explanation_required === true &&
    Array.isArray(supportedSubjects) &&
    supportedSubjects.every((entry) => typeof entry === "string") &&
    supportedSubjects.includes(subject);
}
