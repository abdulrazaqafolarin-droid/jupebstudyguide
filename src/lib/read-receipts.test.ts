import { describe, it, expect } from 'vitest';
import {
  shouldMarkReadOnArrival,
  applyPeerReadBroadcast,
  type ReadReceiptMessage,
} from './read-receipts';

const msg = (over: Partial<ReadReceiptMessage> = {}): ReadReceiptMessage => ({
  id: 'm1',
  conversation_id: 'c1',
  sender_id: 'peer',
  is_read: false,
  read_at: null,
  delivered_at: null,
  ...over,
});

describe('shouldMarkReadOnArrival', () => {
  it('marks when the message lands in the open conversation from the peer', () => {
    expect(
      shouldMarkReadOnArrival({
        conversationId: 'c1',
        senderId: 'peer',
        activeConversationId: 'c1',
        selfId: 'me',
      }),
    ).toBe(true);
  });

  it('does NOT mark when another conversation is open', () => {
    expect(
      shouldMarkReadOnArrival({
        conversationId: 'c2',
        senderId: 'peer',
        activeConversationId: 'c1',
        selfId: 'me',
      }),
    ).toBe(false);
  });

  it('does NOT mark when no conversation is open', () => {
    expect(
      shouldMarkReadOnArrival({
        conversationId: 'c1',
        senderId: 'peer',
        activeConversationId: null,
        selfId: 'me',
      }),
    ).toBe(false);
  });

  it('does NOT mark our own outgoing echoes', () => {
    expect(
      shouldMarkReadOnArrival({
        conversationId: 'c1',
        senderId: 'me',
        activeConversationId: 'c1',
        selfId: 'me',
      }),
    ).toBe(false);
  });

  it('never marks without a signed-in user or conversation id', () => {
    expect(
      shouldMarkReadOnArrival({
        conversationId: 'c1',
        senderId: 'peer',
        activeConversationId: 'c1',
        selfId: null,
      }),
    ).toBe(false);
    expect(
      shouldMarkReadOnArrival({
        conversationId: '',
        senderId: 'peer',
        activeConversationId: '',
        selfId: 'me',
      }),
    ).toBe(false);
  });
});

describe('applyPeerReadBroadcast', () => {
  // Perspective: the SENDER of the messages receives the peer's `read`
  // broadcast — their OWN outgoing messages are what turn blue.
  it('flips own unread messages of the broadcast conversation to read', () => {
    const out = applyPeerReadBroadcast(
      [msg({ sender_id: 'me' }), msg({ id: 'm2', sender_id: 'me' })],
      { conversationId: 'c1', readerId: 'peer', selfId: 'me', readAt: 'T' },
    );
    expect(out).toHaveLength(2);
    out.forEach((m) => {
      expect(m.is_read).toBe(true);
      expect(m.read_at).toBe('T');
      expect(m.delivered_at).toBe('T');
    });
  });

  it('leaves other conversations and the peer\'s own messages untouched', () => {
    const other = msg({ id: 'm2', conversation_id: 'c2', sender_id: 'me' });
    const theirs = msg({ id: 'm3', sender_id: 'peer' });
    const input = [msg({ sender_id: 'me' }), other, theirs];
    const out = applyPeerReadBroadcast(
      input,
      { conversationId: 'c1', readerId: 'peer', selfId: 'me', readAt: 'T' },
    );
    expect(out.find((m) => m.id === 'm1')!.is_read).toBe(true);
    expect(out.find((m) => m.id === 'm2')!.is_read).toBe(false);
    expect(out.find((m) => m.id === 'm3')!.is_read).toBe(false);
  });

  it('keeps existing read_at / delivered_at values', () => {
    const stamped = msg({ id: 'm4', sender_id: 'me', read_at: 'OLD', delivered_at: 'OLD2', is_read: false });
    const out = applyPeerReadBroadcast(
      [stamped],
      { conversationId: 'c1', readerId: 'peer', selfId: 'me', readAt: 'T' },
    );
    expect(out[0].read_at).toBe('OLD');
    expect(out[0].delivered_at).toBe('OLD2');
    expect(out[0].is_read).toBe(true);
  });

  it('ignores broadcasts from ourselves', () => {
    const input = [msg({ sender_id: 'me' })];
    const out = applyPeerReadBroadcast(
      input,
      { conversationId: 'c1', readerId: 'me', selfId: 'me', readAt: 'T' },
    );
    expect(out).toBe(input);
  });

  it('returns the same array reference when nothing changes', () => {
    const alreadyRead = msg({ id: 'm5', sender_id: 'me', is_read: true, read_at: 'X', delivered_at: 'X' });
    const input = [alreadyRead];
    const out = applyPeerReadBroadcast(
      input,
      { conversationId: 'c1', readerId: 'peer', selfId: 'me', readAt: 'T' },
    );
    expect(out).toBe(input);
  });
});
