import type { QuestionImagePosition } from "@/types/question";

const INLINE_IMAGE_POSITION = /^image-inline:(\d+(?:,\d+)*)$/;

/**
 * Protect every math delimiter supported by QuestionMath, plus code and
 * Markdown emphasis, so an image anchor never splits a formatted expression.
 */
const PROTECTED_SPAN = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\x60[^\x60]*\x60|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[^*\n]+\*|_[^_\n]+_/g;

/** Detect the inline layout while keeping legacy layout values untouched. */
export function isInlineImagePosition(position?: string | null): boolean {
  return position === "image-inline" || INLINE_IMAGE_POSITION.test(position || "");
}

/** Read the saved character anchor and clamp it to the current question text. */
export function getInlineImageOffsets(
  position: string | null | undefined,
  content: string,
  imageCount: number,
): number[] {
  const match = INLINE_IMAGE_POSITION.exec(position || "");
  const savedOffsets = match ? match[1].split(",") : [];
  const count = Math.max(0, Math.floor(Number.isFinite(imageCount) ? imageCount : 0));

  return Array.from({ length: count }, (_, index) => {
    const parsed = Number(savedOffsets[index]);
    const requested = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
    return getSafeQuestionImageOffset(content, requested);
  });
}

/** Backwards-compatible first-image accessor for existing single-image callers. */
export function getInlineImageOffset(position: string | null | undefined, content: string): number {
  return getInlineImageOffsets(position, content, 1)[0] ?? 0;
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
export function createInlineImagePosition(offset: number | readonly number[]): QuestionImagePosition {
  const offsets = Array.isArray(offset) ? offset : [offset];
  const safeOffsets = offsets.map((value) =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  );
  const normalized = safeOffsets.length > 0 ? safeOffsets : [0];
  return ("image-inline:" + normalized.join(",")) as QuestionImagePosition;
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
 * Return the source offsets of visible text units. Math, code and emphasis
 * spans are indivisible units, so the editor does not offer a drop point in
 * the middle of their syntax.
 */
export function getQuestionPositionTokens(content: string): Array<{ start: number; end: number }> {
  const tokens: Array<{ start: number; end: number }> = [];
  const tokenPattern = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\x60[^\x60]*\x60|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[^*\n]+\*|_[^_\n]+_|\S+/g;

  for (const match of content.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (getSafeQuestionImageOffset(content, start) === start) {
      tokens.push({ start, end });
    }
  }

  return tokens;
}
