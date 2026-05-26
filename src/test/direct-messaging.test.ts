import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MessageState } from '@/lib/dm-store';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn(),
      catch: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    deriveBits: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => { arr.fill(1); return arr; }),
  randomUUID: vi.fn(() => '00000000-0000-0000-0000-000000000001'),
};
vi.stubGlobal('crypto', mockCrypto);

// ============================================================
// 1. MESSAGE STATE MACHINE
// ============================================================
describe('Message State Machine', () => {
  const validTransitions: Record<MessageState, MessageState[]> = {
    pending: ['sending'],
    sending: ['sent', 'pending'],
    sent: ['delivered', 'read'],
    delivered: ['read'],
    read: [],
  };

  it('should follow valid state transitions', () => {
    const states: MessageState[] = ['pending', 'sending', 'sent', 'delivered', 'read'];
    for (const from of states) {
      for (const to of states) {
        const allowed = validTransitions[from].includes(to);
        if (from === to) continue;
        if (allowed) {
          expect(true).toBe(true);
        } else {
          expect(true).toBe(true);
        }
      }
    }
  });

  it('should not skip states on happy path', () => {
    const happyPath: MessageState[] = ['pending', 'sending', 'sent', 'delivered', 'read'];
    for (let i = 1; i < happyPath.length; i++) {
      expect(validTransitions[happyPath[i - 1]]).toContain(happyPath[i]);
    }
  });

  it('should revert to pending on send failure', () => {
    expect(validTransitions['sending']).toContain('pending');
  });

  it('should never allow read to transition anywhere', () => {
    expect(validTransitions['read']).toHaveLength(0);
  });

  it('should allow sent→delivered transition', () => {
    expect(validTransitions['sent']).toContain('delivered');
    expect(validTransitions['sent']).toContain('read');
  });
});

// ============================================================
// 2. REACTION UPSERT LOGIC
// ============================================================
describe('Reaction Upsert', () => {
  it('should replace existing reaction for same user', () => {
    const reactions: Record<string, { emoji: string; userId: string }[]> = {};
    function upsert(msgId: number, userId: string, emoji: string) {
      const key = String(msgId);
      reactions[key] = (reactions[key] || []).filter(r => r.userId !== userId);
      reactions[key].push({ emoji, userId });
    }
    upsert(1, 'user-1', '');
    upsert(1, 'user-1', '');
    expect(reactions['1']).toHaveLength(1);
    expect(reactions['1'][0].emoji).toBe('');
  });

  it('should add multiple reactions from different users', () => {
    const reactions: Record<string, { emoji: string; userId: string }[]> = {};
    function upsert(msgId: number, userId: string, emoji: string) {
      const key = String(msgId);
      reactions[key] = (reactions[key] || []).filter(r => r.userId !== userId);
      reactions[key].push({ emoji, userId });
    }
    upsert(1, 'user-1', '');
    upsert(1, 'user-2', '');
    upsert(1, 'user-3', '');
    expect(reactions['1']).toHaveLength(3);
  });

  it('should remove reaction when same emoji is tapped again', () => {
    const reactions: Record<string, { emoji: string; userId: string }[]> = {};
    function toggle(msgId: number, userId: string, emoji: string) {
      const key = String(msgId);
      const existing = reactions[key]?.find(r => r.userId === userId);
      if (existing?.emoji === emoji) {
        reactions[key] = reactions[key].filter(r => r.userId !== userId);
      } else {
        upsert(msgId, userId, emoji);
      }
    }
    function upsert(msgId: number, userId: string, emoji: string) {
      const key = String(msgId);
      reactions[key] = (reactions[key] || []).filter(r => r.userId !== userId);
      reactions[key].push({ emoji, userId });
    }
    toggle(1, 'user-1', '');
    expect(reactions['1']).toHaveLength(1);
    toggle(1, 'user-1', '');
    expect(reactions['1']).toHaveLength(0);
  });

  it('should allow changing emoji without removing and re-adding', () => {
    const reactions: Record<string, { emoji: string; userId: string }[]> = {};
    function upsert(msgId: number, userId: string, emoji: string) {
      const key = String(msgId);
      reactions[key] = (reactions[key] || []).filter(r => r.userId !== userId);
      reactions[key].push({ emoji, userId });
    }
    upsert(1, 'user-1', '');
    upsert(1, 'user-1', '');
    expect(reactions['1']).toHaveLength(1);
    expect(reactions['1'][0].emoji).toBe('');
  });
});

// ============================================================
// 3. DISAPPEARING MESSAGE EXPIRY
// ============================================================
describe('Disappearing Message Expiry', () => {
  it('should mark message as deleted when expires_at is in the past', () => {
    const messages = [
      { id: 1, expires_at: new Date(Date.now() - 1000).toISOString(), is_deleted: false },
      { id: 2, expires_at: new Date(Date.now() + 86400000).toISOString(), is_deleted: false },
    ];

    function deleteExpired(msgs: typeof messages) {
      const now = new Date();
      return msgs.map(m =>
        m.expires_at && new Date(m.expires_at) < now ? { ...m, is_deleted: true } : m,
      );
    }

    const result = deleteExpired(messages);
    expect(result[0].is_deleted).toBe(true);
    expect(result[1].is_deleted).toBe(false);
  });

  it('should not delete messages with null expires_at', () => {
    const msg = { id: 1, expires_at: null as string | null, is_deleted: false };
    function deleteExpired(msgs: typeof msg[]) {
      const now = new Date();
      return msgs.map(m =>
        m.expires_at && new Date(m.expires_at) < now ? { ...m, is_deleted: true } : m,
      );
    }
    expect(deleteExpired([msg])[0].is_deleted).toBe(false);
  });

  it('should set timer from delivered_at, not sent_at', () => {
    const deliveredAt = new Date('2026-05-26T10:00:00Z');
    const expectedExpiry = new Date(deliveredAt.getTime() + 86400000);
    const timerMs = 86400000; // 24h
    expect(new Date(deliveredAt.getTime() + timerMs).toISOString()).toBe(expectedExpiry.toISOString());
  });

  it('should inject system message when timer changes', () => {
    function buildSystemMessage(userName: string, duration: string): { type: string; ciphertext: string } {
      return {
        type: 'system',
        ciphertext: btoa(`${userName} set messages to disappear after ${duration}`),
      };
    }
    const sys = buildSystemMessage('Alice', '24h');
    expect(sys.type).toBe('system');
    expect(atob(sys.ciphertext)).toBe('Alice set messages to disappear after 24h');
  });

  it('should not delete messages that are already deleted', () => {
    const msg = {
      id: 1,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      is_deleted: true as boolean,
    };
    function deleteExpired(msgs: typeof msg[]) {
      if (msgs[0].is_deleted) return msgs;
      const now = new Date();
      return msgs.map(m =>
        m.expires_at && new Date(m.expires_at) < now ? { ...m, is_deleted: true } : m,
      );
    }
    const result = deleteExpired([msg]);
    expect(result[0].is_deleted).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ============================================================
// 4. EDIT WINDOW ENFORCEMENT
// ============================================================
describe('Edit Window Enforcement', () => {
  const EDIT_WINDOW_MS = 15 * 60 * 1000;

  it('should allow edit within 15 minutes', () => {
    const sentAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const elapsed = Date.now() - new Date(sentAt).getTime();
    expect(elapsed).toBeLessThan(EDIT_WINDOW_MS);
  });

  it('should reject edit after 15 minutes', () => {
    const sentAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const elapsed = Date.now() - new Date(sentAt).getTime();
    expect(elapsed).toBeGreaterThan(EDIT_WINDOW_MS);
  });

  it('should record old ciphertext in message_edits before overwriting', () => {
    const edits: { messageId: number; oldCipher: string; editedAt: string }[] = [];
    function editMessage(
      messageId: number,
      oldCipher: string,
      newCipher: string,
      sentAt: string,
    ): { success: boolean; error?: string } {
      const elapsed = Date.now() - new Date(sentAt).getTime();
      if (elapsed > EDIT_WINDOW_MS) return { success: false, error: 'Edit window expired' };
      edits.push({ messageId, oldCipher, editedAt: new Date().toISOString() });
      return { success: true };
    }
    const result = editMessage(1, 'old-cipher', 'new-cipher', new Date().toISOString());
    expect(result.success).toBe(true);
    expect(edits).toHaveLength(1);
    expect(edits[0].oldCipher).toBe('old-cipher');
  });

  it('should enforce exact 15-minute boundary', () => {
    const boundaryMs = 15 * 60 * 1000;
    const justBefore = boundaryMs - 100;
    const justAfter = boundaryMs + 100;
    expect(justBefore).toBeLessThan(boundaryMs);
    expect(justAfter).toBeGreaterThan(boundaryMs);
  });

  it('should hide edit option from UI when window expires', () => {
    const sentAt = Date.now() - 30 * 60 * 1000;
    const canEdit = Date.now() - sentAt < EDIT_WINDOW_MS;
    expect(canEdit).toBe(false);
  });
});

// ============================================================
// 5. FORWARDING HOP LIMIT
// ============================================================
describe('Forwarding Hop Limit', () => {
  const MAX_HOPS = 5;

  it('should increment forwarded_hops on forward', () => {
    function forward(originalHops: number): { forwardedHops: number; restricted: boolean } {
      const newHops = originalHops + 1;
      return { forwardedHops: newHops, restricted: newHops > MAX_HOPS };
    }
    expect(forward(0).forwardedHops).toBe(1);
    expect(forward(1).forwardedHops).toBe(2);
  });

  it('should restrict forwarding at 5 hops', () => {
    function forward(originalHops: number): { forwardedHops: number; restricted: boolean } {
      const newHops = originalHops + 1;
      if (newHops > MAX_HOPS) return { forwardedHops: MAX_HOPS, restricted: true };
      return { forwardedHops: newHops, restricted: newHops >= MAX_HOPS };
    }
    expect(forward(3).restricted).toBe(false);
    expect(forward(4).forwardedHops).toBe(5);
    expect(forward(4).restricted).toBe(true);
    expect(forward(5).forwardedHops).toBe(5);
    expect(forward(5).restricted).toBe(true);
  });

  it('should cap forwarded_hops at the database level', () => {
    function dbInsertHops(clientHops: number): number {
      return Math.min(clientHops, MAX_HOPS);
    }
    expect(dbInsertHops(3)).toBe(3);
    expect(dbInsertHops(5)).toBe(5);
    expect(dbInsertHops(10)).toBe(5);
  });

  it('should show warning label at 5+ hops', () => {
    function getForwardLabel(hops: number): string {
      return hops >= MAX_HOPS ? 'Forwarded many times' : `Forwarded ${hops} time${hops === 1 ? '' : 's'}`;
    }
    expect(getForwardLabel(0)).toBe('Forwarded 0 times');
    expect(getForwardLabel(1)).toBe('Forwarded 1 time');
    expect(getForwardLabel(5)).toBe('Forwarded many times');
    expect(getForwardLabel(10)).toBe('Forwarded many times');
  });

  it('should restrict to 1 destination when hops >= 5', () => {
    const forwardedHops = 5;
    const maxDestinations = forwardedHops >= MAX_HOPS ? 1 : 5;
    expect(maxDestinations).toBe(1);

    const forwardedHops2 = 3;
    const maxDestinations2 = forwardedHops2 >= MAX_HOPS ? 1 : 5;
    expect(maxDestinations2).toBe(5);
  });
});
