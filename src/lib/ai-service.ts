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
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI error (${res.status}): ${body}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          callbacks.onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            callbacks.onError(parsed.error);
            return;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) callbacks.onDelta(delta);
        } catch (e) { console.warn('AI stream parse error:', e); }
      }
    }
    callbacks.onDone();
  } catch (err) {
    callbacks.onError("AI error: " + (err instanceof Error ? err.message : String(err)));
  }
}

export async function chatCompletionJSON(systemPrompt: string, messages: AIChatMessage[]): Promise<any> {
  const token = await getAuthToken();
  const msgs = buildMessages(systemPrompt, messages);
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "json", systemPrompt, messages: msgs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI error (${res.status}): ${body}`);
  }
  return res.json();
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
