import type { QuestionImagePosition } from "@/types/question";

const INLINE_IMAGE_POSITION = /^image-inline:(\d+)$/;

/** Detect the inline layout while keeping legacy layout values untouched. */
export function isInlineImagePosition(position?: string | null): boolean {
  return position === "image-inline" || INLINE_IMAGE_POSITION.test(position || "");
}

// Tokens that must stay intact when an image is inserted into question prose.
const PROTECTED_SPAN = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|`[^`]*`|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[^*\n]+\*|_[^_\n]+_/g;

/** Read the saved character anchor and clamp it to the current question text. */
export function getInlineImageOffset(position: string | null | undefined, content: string): number {
  const match = INLINE_IMAGE_POSITION.exec(position || "");
  const parsed = match ? Number(match[1]) : 0;
  const requested = Number.isSafeInteger(parsed) ? parsed : 0;
  return getSafeQuestionImageOffset(content, requested);
}

/** Clamp an anchor and keep it outside LaTeX, code, and Markdown emphasis spans. */
export function getSafeQuestionImageOffset(content: string, requestedOffset: number): number {
  const requested = Number.isFinite(requestedOffset)
    ? Math.max(0, Math.min(content.length, Math.floor(requestedOffset)))
    : 0;

  for (const match of content.matchAll(PROTECTED_SPAN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (requested > start && requested < end) {
      return requested - start <= end - requested ? start : end;
    }
  }

  return requested;
}

/** Create the durable character offset stored in study_questions.image_position. */
export function createInlineImagePosition(offset: number): QuestionImagePosition {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return `image-inline:${safeOffset}`;
}

/** Split question content at a safe saved character anchor. */
export function splitQuestionAtImageOffset(
  content: string,
  requestedOffset: number,
): [before: string, after: string] {
  const offset = getSafeQuestionImageOffset(content, requestedOffset);
  return [content.slice(0, offset), content.slice(offset)];
}

/**
 * Return the source offsets of visible text units. Inline/display maths and
 * markdown emphasis/code spans are treated as indivisible units so the editor
 * never offers a drop point in the middle of their syntax.
 */
export function getQuestionPositionTokens(content: string): Array<{ start: number; end: number }> {
  const tokens: Array<{ start: number; end: number }> = [];
  const tokenPattern = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|`[^`]*`|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[^*\n]+\*|_[^_\n]+_|\S+/g;

  for (const match of content.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (getSafeQuestionImageOffset(content, start) === start) {
      tokens.push({ start, end });
    }
  }

  return tokens;
}
