import { SYLLABUSES, type SyllabusTopic } from '@/types/syllabus';
import type { Subject } from '@/types/question';
import type { AIMessage } from '@/hooks/useAITutorChats';
import { todayDateString } from '@/lib/daily-mission';

/** Row shape of `ai_chats` as consumed by the Study Chat UI. */
export interface StudyChatMeta {
  id: string;
  title: string;
  topic_id: string | null;
  subtopic: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
}

/** Only the newest N messages are sent upstream — keeps latency and token
 *  cost flat no matter how long a study thread grows. */
export const CONTEXT_MESSAGE_CAP = 30;

export const CHAT_SELECT_COLS =
  'id,title,topic_id,subtopic,subject,created_at,updated_at';

/** Newest-N window of a thread for the model (order preserved). */
export function trimMessagesForContext<T>(messages: T[], cap = CONTEXT_MESSAGE_CAP): T[] {
  if (messages.length <= cap) return messages;
  return messages.slice(messages.length - cap);
}

/** Sidebar title for a topic thread: the topic name only (subtopic lives in
 *  its own column so long topic names are never truncated by a suffix). */
export function topicChatTitle(topicName: string): string {
  return (topicName.trim() || 'Study chat').slice(0, 60);
}

export interface ChatGroup {
  label: string;
  chats: StudyChatMeta[];
}

/** Group chats for the history sidebar: Today / Yesterday / Previous 7 days
 *  / Older. Input is expected sorted newest-first; order is preserved. */
export function groupChatsByDate(chats: StudyChatMeta[]): ChatGroup[] {
  const today = todayDateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = todayDateString(yesterdayDate);
  const weekDate = new Date();
  weekDate.setDate(weekDate.getDate() - 7);
  const weekStart = todayDateString(weekDate);

  const buckets: ChatGroup[] = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 days', chats: [] },
    { label: 'Older', chats: [] },
  ];
  for (const chat of chats) {
    const day = todayDateString(new Date(chat.updated_at)); // same local-day key as today/yesterday
    if (day >= today) buckets[0].chats.push(chat);
    else if (day >= yesterday) buckets[1].chats.push(chat);
    else if (day >= weekStart) buckets[2].chats.push(chat);
    else buckets[3].chats.push(chat);
  }
  return buckets.filter((group) => group.chats.length > 0);
}

/** Topic-aware starter chips for an empty thread. */
export function buildStarterPrompts(topicName: string, subtopic?: string | null): string[] {
  const focus = subtopic?.trim() || topicName;
  return [
    `Explain ${focus} in simple terms`,
    `Quiz me on ${focus} with 5 JUPEB-style questions`,
    `Why is ${focus} important for the JUPEB exam?`,
    `Work a past question on ${focus} step by step`,
  ];
}

/**
 * Where an edited message cuts the stored thread: the first persisted
 * message at/after the edit index (inclusive), else the last persisted
 * message before it (exclusive), else "everything is stale" (delete all).
 * Copied behaviour from FloatingAITutor so both surfaces rewind identically.
 */
export function resolveEditBoundary(
  list: AIMessage[],
  index: number,
): { ts: string | null; include: boolean } {
  const first = list.slice(index).find((m) => m.created_at);
  if (first?.created_at) return { ts: first.created_at, include: true };
  for (let j = index - 1; j >= 0; j--) {
    const m = list[j];
    if (m.created_at) return { ts: m.created_at, include: false };
  }
  return { ts: null, include: true };
}

/** Look a syllabus topic up by id across all subjects (for resuming a
 *  thread from its stored topic_id without needing the original URL). */
export function findSyllabusTopic(
  topicId: string,
): { topic: SyllabusTopic; subject: Subject } | null {
  for (const [subject, topics] of Object.entries(SYLLABUSES)) {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) return { topic, subject: subject as Subject };
  }
  return null;
}
