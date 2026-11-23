import type { ExamProgramId } from "@/lib/exam-program";

/** Local textbook indexes are isolated by exam programme and authenticated account. */
export function getTextbookDatabaseName(program: ExamProgramId, userId: string): string {
  const safeUserId = userId.trim();
  if (!safeUserId) throw new Error("A signed-in account is required for a textbook library.");
  return `${program}-rag-${safeUserId}`;
}
