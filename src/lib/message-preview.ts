/**
 * Shared helpers for building notification content from a chat message.
 * Used by BOTH the in-app banner and the native (Android shade) popup so
 * the two never drift apart.
 */

/** Short, shade-friendly preview: media types get a label, text is capped. */
export function buildMessagePreview(message: {
  content?: string | null;
  message_type?: string | null;
}): string {
  switch (message.message_type) {
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'file':
      return 'File';
    default:
      return message.content?.slice(0, 80) || 'Message';
  }
}

/**
 * Stable positive int32 id for a notification key (e.g. `conv-<uuid>`).
 * The same key always maps to the same id, so a new message REPLACES that
 * conversation's previous notification in the shade instead of stacking a
 * new popup for every message — WhatsApp-style per-conversation grouping.
 */
export function stableNotificationId(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  // Android notification ids are ints; keep it positive and non-zero.
  return (hash >>> 0) % 2147483647 || 1;
}
