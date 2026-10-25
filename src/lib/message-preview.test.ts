import { describe, it, expect } from 'vitest';
import { buildMessagePreview, stableNotificationId } from './message-preview';

describe('buildMessagePreview', () => {
  it('labels media message types', () => {
    expect(buildMessagePreview({ message_type: 'image', content: 'some url' })).toBe('Photo');
    expect(buildMessagePreview({ message_type: 'video', content: 'some url' })).toBe('Video');
    expect(buildMessagePreview({ message_type: 'audio', content: 'some url' })).toBe('Audio');
    expect(buildMessagePreview({ message_type: 'file', content: 'some url' })).toBe('File');
  });

  it('slices long text at 80 chars', () => {
    const long = 'x'.repeat(120);
    const preview = buildMessagePreview({ content: long });
    expect(preview).toHaveLength(80);
    expect(preview).toBe('x'.repeat(80));
  });

  it('keeps short text as-is', () => {
    expect(buildMessagePreview({ content: 'Are you ready for tomorrow?' })).toBe(
      'Are you ready for tomorrow?',
    );
  });

  it('falls back to "Message" for empty or null content', () => {
    expect(buildMessagePreview({ content: '' })).toBe('Message');
    expect(buildMessagePreview({ content: null })).toBe('Message');
    expect(buildMessagePreview({})).toBe('Message');
  });

  it('treats unknown message types as text', () => {
    expect(buildMessagePreview({ message_type: 'system', content: 'Alice joined' })).toBe(
      'Alice joined',
    );
  });
});

describe('stableNotificationId', () => {
  it('is deterministic for the same key', () => {
    const key = 'conv-4c1a9d7e-1111-2222-3333-444455556666';
    expect(stableNotificationId(key)).toBe(stableNotificationId(key));
  });

  it('maps different conversations to different ids', () => {
    expect(stableNotificationId('conv-a')).not.toBe(stableNotificationId('conv-b'));
  });

  it('produces a positive int32 (Android notification ids must be ints)', () => {
    for (const key of ['conv-1', 'conv-9999', 'a', 'unicode-ключ-🎯', 'x'.repeat(200)]) {
      const id = stableNotificationId(key);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(2147483647);
      expect(Number.isInteger(id)).toBe(true);
    }
  });
});
