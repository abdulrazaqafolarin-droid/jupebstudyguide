import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'jupeb-dm';
const DB_VERSION = 1;

export type MessageState = 'pending' | 'sending' | 'sent' | 'delivered' | 'read';

export interface OutboundMessage {
  clientMsgId: string;
  conversationId: string;
  type: string;
  ciphertext: string;
  iv: string;
  mediaUrl?: string;
  mediaMeta?: Record<string, unknown>;
  replyToId?: number | null;
  viewOnce?: boolean;
  forwardedHops?: number;
  state: MessageState;
  createdAt: string;
  retryCount: number;
}

interface DmDatabase {
  outbox: OutboundMessage;
  conversationKeys: {
    conversationId: string;
    encryptedKey: string;
    createdAt: string;
  };
}

let dbPromise: Promise<IDBPDatabase<DmDatabase>> | null = null;

function getDb(): Promise<IDBPDatabase<DmDatabase>> {
  if (!dbPromise) {
    dbPromise = openDB<DmDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'clientMsgId' });
          outbox.createIndex('state', 'state');
          outbox.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('conversationKeys')) {
          const ck = db.createObjectStore('conversationKeys', { keyPath: 'conversationId' });
          ck.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOutboundMessage(msg: OutboundMessage): Promise<void> {
  const db = await getDb();
  await db.put('outbox', msg);
}

export async function getOutboundMessage(clientMsgId: string): Promise<OutboundMessage | undefined> {
  const db = await getDb();
  return db.get('outbox', clientMsgId);
}

export async function updateOutboundState(clientMsgId: string, state: MessageState): Promise<void> {
  const db = await getDb();
  const msg = await db.get('outbox', clientMsgId);
  if (msg) {
    msg.state = state;
    await db.put('outbox', msg);
  }
}

export async function removeOutboundMessage(clientMsgId: string): Promise<void> {
  const db = await getDb();
  await db.delete('outbox', clientMsgId);
}

export async function getQueuedMessages(): Promise<OutboundMessage[]> {
  const db = await getDb();
  const all = await db.getAll('outbox');
  return all.filter(m => m.state === 'pending');
}

export async function getAllPendingMessages(): Promise<OutboundMessage[]> {
  const db = await getDb();
  const index = db.transaction('outbox').store.index('state');
  return index.getAll('pending');
}

export async function incrementRetry(clientMsgId: string): Promise<void> {
  const db = await getDb();
  const msg = await db.get('outbox', clientMsgId);
  if (msg) {
    msg.retryCount += 1;
    await db.put('outbox', msg);
  }
}

export async function storeConversationKey(conversationId: string, encryptedKey: string): Promise<void> {
  const db = await getDb();
  await db.put('conversationKeys', {
    conversationId,
    encryptedKey,
    createdAt: new Date().toISOString(),
  });
}

export async function getConversationKey(conversationId: string): Promise<string | undefined> {
  const db = await getDb();
  const entry = await db.get('conversationKeys', conversationId);
  return entry?.encryptedKey;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.clear('outbox');
  await db.clear('conversationKeys');
}
