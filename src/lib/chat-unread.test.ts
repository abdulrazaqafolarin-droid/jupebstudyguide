import { describe, expect, it } from 'vitest';
import {
  countUnreadConversations,
  shouldCountIncomingChatMessage,
  type IncomingChatMessage,
} from './chat-unread';

const message = (overrides: Partial<IncomingChatMessage> = {}): IncomingChatMessage => ({
  conversation_id: 'c1',
  sender_id: 'peer',
  created_at: '2026-11-06T10:00:00.000Z',
  message_type: 'text',
  is_deleted: false,
  ...overrides,
});

describe('shouldCountIncomingChatMessage', () => {
  it('counts a new peer message after the last-read timestamp', () => {
    expect(shouldCountIncomingChatMessage(
      message(),
      'me',
      '2026-11-06T09:59:59.000Z',
    )).toBe(true);
  });

  it('does not count a message at or before the last-read timestamp', () => {
    expect(shouldCountIncomingChatMessage(
      message(),
      'me',
      '2026-11-06T10:00:00.000Z',
    )).toBe(false);
    expect(shouldCountIncomingChatMessage(
      message(),
      'me',
      '2026-11-06T10:00:01.000Z',
    )).toBe(false);
  });

  it('does not count our own messages, system messages, or deleted messages', () => {
    expect(shouldCountIncomingChatMessage(message({ sender_id: 'me' }), 'me', null)).toBe(false);
    expect(shouldCountIncomingChatMessage(message({ message_type: 'system' }), 'me', null)).toBe(false);
    expect(shouldCountIncomingChatMessage(message({ is_deleted: true }), 'me', null)).toBe(false);
  });

  it('handles a conversation whose last-read timestamp is null', () => {
    expect(shouldCountIncomingChatMessage(message(), 'me', null)).toBe(true);
  });

  it('rejects malformed timestamps instead of inflating the badge', () => {
    expect(shouldCountIncomingChatMessage(message({ created_at: 'invalid' }), 'me', null)).toBe(false);
    expect(shouldCountIncomingChatMessage(message(), 'me', 'invalid')).toBe(false);
  });
});

describe('countUnreadConversations', () => {
  it('counts conversations with a positive unread count, not individual messages', () => {
    expect(countUnreadConversations([0, 1, 8, 0, 2])).toBe(3);
  });

  it('ignores zero, negative, NaN, and infinite counts', () => {
    expect(countUnreadConversations([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1])).toBe(1);
  });
});
