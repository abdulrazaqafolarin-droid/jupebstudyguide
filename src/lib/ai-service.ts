const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const CHAT_MODEL = "google/gemini-3.1-pro-preview";
const EMBED_MODEL = "openai/text-embedding-3-small";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

function buildMessages(system: string, history: AIChatMessage[], ragContext?: string): { role: string; content: string }[] {
  const msgs: { role: string; content: string }[] = [];
  let systemContent = system;
  if (ragContext) {
    systemContent += `\n\n--- REFERENCE MATERIAL FROM TEXTBOOKS ---\n${ragContext}\n\nUse the above reference material to answer questions when relevant. If the material doesn't contain the answer, use your own knowledge.`;
  }
  msgs.push({ role: "system", content: systemContent });
  for (const m of history) {
    if (m.role === "system") continue;
    msgs.push({ role: m.role, content: m.content });
  }
  return msgs;
}

async function* streamOpenRouter(messages: { role: string; content: string }[]): AsyncGenerator<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "JUPEB Study Guide",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${body}`);
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
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {}
    }
  }
}

export async function streamChat(
  systemPrompt: string,
  messages: AIChatMessage[],
  callbacks: StreamCallbacks,
  ragContext?: string
): Promise<void> {
  if (!OPENROUTER_API_KEY) {
    callbacks.onError("OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY in .env");
    return;
  }

  try {
    const msgs = buildMessages(systemPrompt, messages, ragContext);
    for await (const delta of streamOpenRouter(msgs)) {
      callbacks.onDelta(delta);
    }
    callbacks.onDone();
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
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY in .env");
  }

  const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter embedding error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.data?.[0]?.embedding as number[];
}
