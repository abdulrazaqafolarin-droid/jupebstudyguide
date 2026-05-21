const OLLAMA_BASE = Deno.env.get("OLLAMA_HOST") || "http://localhost:11434";

export interface OllamaChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function ollamaChat(
  messages: OllamaChatMessage[],
  opts: OllamaChatOptions = {}
): Promise<Response | null> {
  const model = opts.model || "qwen2.5:7b";
  try {
    const body: any = {
      model,
      messages,
      stream: opts.stream ?? false,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_predict: opts.maxTokens ?? 2048,
      },
    };
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`Ollama error (${model}): ${res.status} ${err.slice(0, 200)}`);
      return null;
    }
    return res;
  } catch (err) {
    console.error(`Ollama unreachable (${model}):`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function ollamaChatText(
  messages: OllamaChatMessage[],
  opts?: OllamaChatOptions
): Promise<string | null> {
  const res = await ollamaChat(messages, { ...opts, stream: false });
  if (!res) return null;
  const data = await res.json();
  return data.message?.content || null;
}

export async function ollamaEmbed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch {
    return null;
  }
}
