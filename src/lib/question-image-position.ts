export type QuestionImagePosition =
  | "text-only"
  | "image-only"
  | "image-above"
  | "image-beside"
  | string;

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

export function createInlineImagePosition(index: number): string {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return "image-inline:" + safeIndex;
}

/**
 * Split prose at authored newlines, but preserve a multiline $$...$$
 * display-math block as one positionable unit.
 */
export function splitQuestionIntoPositionableLines(content: string): string[] {
  if (!content) return [];

  const mathBlocks: string[] = [];
  const masked = content.replace(/\$\$[\s\S]*?\$\$/g, (block) => {
    const token = "\u0000QUESTION_MATH_BLOCK_" + mathBlocks.length + "\u0000";
    mathBlocks.push(block);
    return token;
  });

  return masked.split("\n").map((line) =>
    line.replace(/\u0000QUESTION_MATH_BLOCK_(\d+)\u0000/g, (token, index: string) =>
      mathBlocks[Number(index)] ?? token
    )
  );
}
