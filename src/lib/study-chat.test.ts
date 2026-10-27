import { describe, expect, it } from 'vitest';
import {
  buildStarterPrompts,
  CONTEXT_MESSAGE_CAP,
  findSyllabusTopic,
  groupChatsByDate,
  resolveEditBoundary,
  type StudyChatMeta,
  topicChatTitle,
  trimMessagesForContext,
} from './study-chat';
import { buildTopicSystemPrompt } from './syllabus-context';
import { TUTOR_SYSTEM_PROMPT } from './prompts';
import type { AIMessage } from '@/hooks/useAITutorChats';

function chat(updatedAt: Date, overrides: Partial<StudyChatMeta> = {}): StudyChatMeta {
  return {
    id: `chat-${updatedAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'Chat',
    topic_id: null,
    subtopic: null,
    subject: null,
    created_at: updatedAt.toISOString(),
    updated_at: updatedAt.toISOString(),
    ...overrides,
  };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

describe('trimMessagesForContext', () => {
  it('keeps a short thread untouched', () => {
    const msgs = [{ n: 1 }, { n: 2 }, { n: 3 }];
    expect(trimMessagesForContext(msgs)).toBe(msgs);
  });

  it('keeps only the newest N messages, in order', () => {
    const msgs = Array.from({ length: CONTEXT_MESSAGE_CAP + 5 }, (_, i) => ({ n: i }));
    const trimmed = trimMessagesForContext(msgs);
    expect(trimmed).toHaveLength(CONTEXT_MESSAGE_CAP);
    expect(trimmed[0].n).toBe(5);
    expect(trimmed[trimmed.length - 1].n).toBe(CONTEXT_MESSAGE_CAP + 4);
  });

  it('handles an empty thread', () => {
    expect(trimMessagesForContext([])).toEqual([]);
  });
});

describe('topicChatTitle', () => {
  it('uses the topic name as-is', () => {
    expect(topicChatTitle('Ohm\'s Law')).toBe('Ohm\'s Law');
  });

  it('falls back when blank', () => {
    expect(topicChatTitle('   ')).toBe('Study chat');
  });

  it('caps at 60 characters', () => {
    expect(topicChatTitle('x'.repeat(80))).toHaveLength(60);
  });
});

describe('groupChatsByDate', () => {
  it('buckets chats into Today / Yesterday / Previous 7 days / Older', () => {
    const groups = groupChatsByDate([
      chat(new Date()),
      chat(daysAgo(1)),
      chat(daysAgo(4)),
      chat(daysAgo(30)),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      'Today',
      'Yesterday',
      'Previous 7 days',
      'Older',
    ]);
    expect(groups[0].chats).toHaveLength(1);
    expect(groups[1].chats).toHaveLength(1);
    expect(groups[2].chats).toHaveLength(1);
    expect(groups[3].chats).toHaveLength(1);
  });

  it('drops empty buckets and preserves input order within a bucket', () => {
    const newest = chat(new Date());
    const older = chat(daysAgo(2));
    const oldest = chat(daysAgo(3));
    const groups = groupChatsByDate([newest, older, oldest]);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Previous 7 days']);
    expect(groups[1].chats.map((c) => c.id)).toEqual([older.id, oldest.id]);
  });

  it('returns no groups for an empty list', () => {
    expect(groupChatsByDate([])).toEqual([]);
  });
});

describe('buildStarterPrompts', () => {
  it('returns four topic-aware starters', () => {
    const prompts = buildStarterPrompts('Photosynthesis');
    expect(prompts).toHaveLength(4);
    expect(prompts.every((p) => p.includes('Photosynthesis'))).toBe(true);
  });

  it('prefers the subtopic as focus when provided', () => {
    const prompts = buildStarterPrompts('Cell Biology', 'Mitochondria');
    expect(prompts[0]).toContain('Mitochondria');
    expect(prompts[0]).not.toContain('Cell Biology');
  });
});

describe('resolveEditBoundary', () => {
  const persisted: AIMessage[] = [
    { role: 'user', content: 'a', created_at: '2026-10-27T10:00:00Z' },
    { role: 'assistant', content: 'b', created_at: '2026-10-27T10:00:05Z' },
  ];

  it('cuts inclusively at the first persisted message at/after the index', () => {
    const list: AIMessage[] = [...persisted, { role: 'user', content: 'c' }];
    // Editing the first message: everything from it on is stale.
    expect(resolveEditBoundary(list, 0)).toEqual({
      ts: '2026-10-27T10:00:00Z',
      include: true,
    });
    // Editing the second: cut at that message, inclusive.
    expect(resolveEditBoundary(list, 1)).toEqual({
      ts: '2026-10-27T10:00:05Z',
      include: true,
    });
    // Editing an unpersisted tail message: nothing stored after the last
    // persisted one, so cut exclusively right after it.
    expect(resolveEditBoundary(list, 2)).toEqual({
      ts: '2026-10-27T10:00:05Z',
      include: false,
    });
  });

  it('cuts exclusively after the last persisted message before the index', () => {
    const list: AIMessage = { role: 'user', content: 'newer' };
    const before: AIMessage[] = [persisted[0], list];
    expect(resolveEditBoundary(before, 1)).toEqual({
      ts: '2026-10-27T10:00:00Z',
      include: false,
    });
  });

  it('deletes everything when nothing before the index is persisted', () => {
    const list: AIMessage[] = [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }];
    expect(resolveEditBoundary(list, 0)).toEqual({ ts: null, include: true });
  });
});

describe('findSyllabusTopic', () => {
  it('resolves a known topic id with its subject', () => {
    const found = findSyllabusTopic('phy-units');
    expect(found).not.toBeNull();
    expect(found?.topic.id).toBe('phy-units');
    expect(found?.subject).toBe('physics');
  });

  it('returns null for unknown ids', () => {
    expect(findSyllabusTopic('nope-not-a-topic')).toBeNull();
  });
});

describe('buildTopicSystemPrompt', () => {
  const topic = findSyllabusTopic('phy-units')!.topic;

  it('includes the base tutor prompt and the full syllabus reference', () => {
    const prompt = buildTopicSystemPrompt(topic, 'physics');
    expect(prompt.startsWith(TUTOR_SYSTEM_PROMPT.slice(0, 40))).toBe(true);
    expect(prompt).toContain('JUPEB SYLLABUS REFERENCE');
  });

  it('locks scope to the topic: name, description and subtopics', () => {
    const prompt = buildTopicSystemPrompt(topic, 'physics');
    expect(prompt).toContain('TOPIC FOCUS');
    expect(prompt).toContain(topic.name);
    expect(prompt).toContain(topic.description);
    for (const sub of topic.subtopics) expect(prompt).toContain(sub);
  });

  it('prioritises the given subtopic', () => {
    const prompt = buildTopicSystemPrompt(topic, 'physics', 'Dimensional Analysis');
    expect(prompt).toContain('Current focus: Dimensional Analysis');
  });

  it('omits the focus line without a subtopic', () => {
    const prompt = buildTopicSystemPrompt(topic, 'physics');
    expect(prompt).not.toContain('Current focus:');
  });
});
