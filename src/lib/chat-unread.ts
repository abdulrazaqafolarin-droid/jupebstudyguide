export interface IncomingChatMessage {
  id?: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  message_type?: string | null;
  is_deleted?: boolean | null;
}

/**
 * Mirrors get_unread_counts for one newly-arrived message. The caller must
 * already have confirmed that the signed-in user is a conversation member.
 */
export function shouldCountIncomingChatMessage(
  message: IncomingChatMessage,
  userId: string,
  lastReadAt: string | null,
): boolean {
  if (!userId || !message.conversation_id || message.sender_id === userId) return false;
  if (message.message_type === 'system' || message.is_deleted === true) return false;

  const createdAt = Date.parse(message.created_at);
  if (!Number.isFinite(createdAt)) return false;
  if (!lastReadAt) return true;

  const lastRead = Date.parse(lastReadAt);
  return Number.isFinite(lastRead) && createdAt > lastRead;
}

/** The navigation badge represents conversations with unread messages. */
export function countUnreadConversations(counts: Iterable<number>): number {
  let total = 0;
  for (const count of counts) {
    if (Number.isFinite(count) && count > 0) total += 1;
  }
  return total;
}
