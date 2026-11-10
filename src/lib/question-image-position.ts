import type { QuestionImagePosition } from "@/types/question";

const INLINE_IMAGE_POSITION = /^image-inline:(\d+)$/;

export function isInlineImagePosition(position?: string | null): boolean {
  return position === "image-inline" || INLINE_IMAGE_POSITION.test(position || "");
}

export function getInlineImageIndex(position: string | null | undefined, lineCount: number): number {
  const match = INLINE_IMAGE_POSITION.exec(position || "");
  const parsed = match ? Number(match[1]) : 0;
  const safeIndex = Number.isSafeInteger(parsed) ? parsed : 0;
  return Math.max(0, Math.min(Math.max(0, Math.floor(lineCount)), safeIndex));
}

export function createInlineImagePosition(index: number): QuestionImagePosition {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return `image-inline:${safeIndex}`;
}

/**
 * Split prose at authored newlines, but preserve multiline $$...$$ display
 * math blocks as single positionable units. CRLF and CR are normalized to LF.
 */
export function splitQuestionIntoPositionableLines(content: string): string[] {
  if (!content) return [];

  const mathBlocks: string[] = [];
  const normalized = content.replace(/\r\n?/g, "\n");
  const masked = normalized.replace(/\$\$[\s\S]*?\$\$/g, (block) => {
    const token = "__QUESTION_MATH_BLOCK_" + mathBlocks.length + "__";
    mathBlocks.push(block);
    return token;
  });

  return masked.split("\n").map((line) =>
    line.replace(/__QUESTION_MATH_BLOCK_(\d+)__/g, (token, index: string) =>
      mathBlocks[Number(index)] ?? token
    )
  );
}
