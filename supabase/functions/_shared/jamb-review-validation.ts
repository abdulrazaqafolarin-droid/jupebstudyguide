/** Server-side review guards for JAMB source-import items. */
export function getJambReviewDecisionError(
  decision: string,
  explanation: string,
): string | null {
  if (decision === "approved_ungraded") {
    return "JAMB questions cannot be approved without a verified answer key and meaningful explanation.";
  }

  if (decision === "approved" && explanation.trim().length < 12) {
    return "A meaningful explanation of at least 12 characters is required before a JAMB question can be approved.";
  }

  return null;
}
