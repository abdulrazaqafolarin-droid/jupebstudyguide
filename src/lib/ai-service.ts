const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-proxy`;
import { supabase } from '@/integrations/supabase/client';

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  attachment?: { base64: string; mimeType: string; name: string } | null;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

interface OutboundMessage {
  role: string;
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
}

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  throw new Error("No authenticated session");
}

function buildMessages(system: string, history: AIChatMessage[], ragContext?: string): OutboundMessage[] {
  const msgs: OutboundMessage[] = [];
  let systemContent = system;
  if (ragContext) {
    systemContent += `\n\n--- REFERENCE MATERIAL FROM TEXTBOOKS ---\n${ragContext}\n\nUse the above reference material to answer questions when relevant. If the material doesn't contain the answer, use your own knowledge.`;
  }
  msgs.push({ role: "system", content: systemContent });
  for (const m of history) {
    if (m.role === "system") continue;
    if (m.attachment?.base64) {
      msgs.push({
        role: m.role,
        content: m.content,
        attachment: { base64: m.attachment.base64, mimeType: m.attachment.mimeType, name: m.attachment.name },
      });
    } else {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  return msgs;
}

export async function streamChat(
  systemPrompt: string,
  messages: AIChatMessage[],
  callbacks: StreamCallbacks,
  ragContext?: string
): Promise<void> {
  try {
    const token = await getAuthToken();
    const msgs = buildMessages(systemPrompt, messages, ragContext);

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ systemPrompt, messages: msgs }),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI error (${res.status}): ${body}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedContent = false;
    let streamError: string | null = null;
    let lastChunkAt = Date.now();
    let finished = false;
    const STALL_TIMEOUT_MS = 45000;

    // Stall watchdog: a silent stream is cancelled so we never hang forever.
    void (async () => {
      while (!finished) {
        await new Promise((r) => setTimeout(r, 5000));
        if (!finished && Date.now() - lastChunkAt > STALL_TIMEOUT_MS) {
          try { await reader.cancel("stall timeout"); } catch { /* already closed */ }
          return;
        }
      }
    })();

    try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastChunkAt = Date.now();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          if (streamError && !receivedContent) {
            callbacks.onError("AI error: " + streamError);
            return;
          }
          callbacks.onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed.error === "string" && parsed.error) {
            streamError = parsed.error;
            continue;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            receivedContent = true;
            callbacks.onDelta(delta);
          }
        } catch (e) { console.warn('AI stream parse error:', e); }
      }
    }
    if (streamError && !receivedContent) {
      callbacks.onError("AI error: " + streamError);
      return;
    }
    callbacks.onDone();
    } finally {
      finished = true;
    }
  } catch (err) {
    callbacks.onError("AI error: " + (err instanceof Error ? err.message : String(err)));
  }
}

export async function chatCompletion(systemPrompt: string, messages: AIChatMessage[], ragContext?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let full = "";
    streamChat(systemPrompt, messages, {
      onDelta: (t) => { full += t; },
      onDone: () => resolve(full),
      onError: (e) => reject(new Error(e)),
    }, ragContext);
  });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const token = await getAuthToken();

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "embed", text }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding error (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.embedding?.length) {
    throw new Error("Empty embedding returned");
  }
  return data.embedding as number[];
}
