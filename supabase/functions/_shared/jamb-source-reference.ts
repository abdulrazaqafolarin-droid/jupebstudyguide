export interface JambSourceReference {
  year: number;
  questionNumber: string;
  canonical: string;
}

/** Parse one resolved citation; multiple or unknown references fail closed. */
export function parseJambSourceReference(value: unknown): JambSourceReference | null {
  if (typeof value !== "string") return null;
  let candidate = value.trim();
  if (!candidate) return null;

  const hasRoundOpen = candidate.startsWith("(");
  const hasRoundClose = candidate.endsWith(")");
  const hasSquareOpen = candidate.startsWith("[");
  const hasSquareClose = candidate.endsWith("]");
  if (hasRoundOpen || hasRoundClose || hasSquareOpen || hasSquareClose) {
    const pairedRound = hasRoundOpen && hasRoundClose;
    const pairedSquare = hasSquareOpen && hasSquareClose;
    if (!pairedRound && !pairedSquare) return null;
    candidate = candidate.slice(1, -1).trim();
  }

  // Some source documents repeat a printed number and distinguish the second
  // occurrence with a letter suffix (for example, 1981:Q29b). Preserve that
  // printed identifier; do not invent a different numeric question number.
  const match = /^((?:19|20)\d{2})\s*:\s*Q\s*(\d+)([a-z])?$/i.exec(candidate);
  if (!match) return null;
  const year = Number(match[1]);
  const questionNumberValue = Number(match[2]);
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(questionNumberValue) || questionNumberValue <= 0) return null;

  const suffix = (match[3] ?? "").toLowerCase();
  const questionNumber = match[2] + suffix;
  return { year, questionNumber, canonical: String(year) + ":Q" + questionNumber };
}