/**
 * Pure read-receipt logic for student-to-student chat.
 *
 * Two invariants encode the product rule the UI must always obey:
 *  1. A message becomes "read" ONLY when the recipient is actually viewing
 *     that conversation — entering the page is the trigger; merely having
 *     the app open is not.
 *  2. The sender's client learns about it in realtime: the recipient's
 *     client pushes a lightweight `read` broadcast the instant the
 *     mark-read RPC commits, and this module applies it to the sender's
 *     open thread (the DB UPDATE event and the 5s poll remain as truth
 *     sources behind it).
 */

export interface ReadReceiptMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  is_read: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
}

/**
 * Should an incoming message be marked read the moment it lands?
 * True only when it arrived in the conversation the user has open AND it
 * was sent by someone else (our own echoes never trigger mark-read).
 */
export function shouldMarkReadOnArrival(opts: {
  conversationId: string;
  senderId: string;
  activeConversationId: string | null;
  selfId: string | null;
}): boolean {
  const { conversationId, senderId, activeConversationId, selfId } = opts;
  if (!selfId || !conversationId) return false;
  if (activeConversationId === null || conversationId !== activeConversationId) {
    return false;
  }
  return senderId !== selfId;
}

/**
 * Applies a cross-client `read` broadcast to the message list of the
 * sender who is currently viewing that conversation: flips their own
 * unread messages to read, stamps read_at, and back-fills delivered_at.
 *
 * Returns the ORIGINAL array when nothing matches (or nothing changes),
 * so React can skip the state update entirely.
 */
export function applyPeerReadBroadcast<T extends ReadReceiptMessage>(
  messages: T[],
  opts: { conversationId: string; readerId: string; selfId: string; readAt: string },
): T[] {
  const { conversationId, readerId, selfId, readAt } = opts;
  if (readerId === selfId) return messages;

  let changed = false;
  const next = messages.map((m) => {
    if (m.conversation_id !== conversationId) return m;
    if (m.sender_id !== selfId) return m;
    if (m.is_read) return m;
    changed = true;
    return {
      ...m,
      is_read: true,
      read_at: m.read_at ?? readAt,
      delivered_at: m.delivered_at ?? readAt,
    };
  });
  return changed ? next : messages;
}
