import { recordSuccess, recordError, shouldTryProvider } from "./provider-health.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

interface Opts {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  stream?: boolean;
}

function getKey(name: string): string | null {
  const k = Deno.env.get(name);
  return k && k.length > 0 ? k : null;
}

function buildMsgs(systemPrompt: string, messages: { role: string; content: string }[]) {
  const msgs: { role: string; content: string }[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  for (const m of messages) msgs.push({ role: m.role, content: m.content });
  return msgs;
}

// --- Provider 1: Gemini (cheapest, primary) ---
async function tryGemini(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts
): Promise<{ text: string | null; latency: number }> {
  const t0 = performance.now();
  const key = getKey("GEMINI_API_KEY");
  if (!key || !shouldTryProvider("Gemini")) return { text: null, latency: 0 };
  try {
    const chatMessages = messages.filter(m => m.role !== "system");
    const fullPrompt = systemPrompt
      ? systemPrompt + "\n\n---\n\n" + chatMessages.map(m =>
          `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
        ).join("\n\n")
      : chatMessages.map(m =>
          `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
        ).join("\n\n");

    const body: any = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    };
    if (opts.json) body.generationConfig.responseMimeType = "application/json";

    const res = await fetch(
      `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      recordError("Gemini", `${res.status}: ${err.slice(0, 200)}`, ms);
      return { text: null, latency: ms };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (text) recordSuccess("Gemini", ms);
    return { text, latency: ms };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    recordError("Gemini", String(err), ms);
    return { text: null, latency: ms };
  }
}

// --- Provider 2: Kimi K2.6 via NVIDIA NIM (free, 40 RPM) ---
async function tryKimi(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts
): Promise<{ text: string | null; latency: number }> {
  const t0 = performance.now();
  const key = getKey("NVIDIA_API_KEY");
  if (!key || !shouldTryProvider("Kimi")) return { text: null, latency: 0 };
  try {
    const body: any = {
      model: "nvidia/kimi-k2-6",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: false,
    };
    if (opts.json) body.response_format = { type: "json_object" };
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      recordError("Kimi", `${res.status}: ${err.slice(0, 200)}`, ms);
      return { text: null, latency: ms };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) recordSuccess("Kimi", ms);
    return { text, latency: ms };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    recordError("Kimi", String(err), ms);
    return { text: null, latency: ms };
  }
}

// --- Provider 3: Groq (safe fallback — key already exists) ---
async function tryGroq(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts
): Promise<{ text: string | null; latency: number }> {
  const t0 = performance.now();
  const key = getKey("GROQ_API_KEY");
  if (!key || !shouldTryProvider("Groq")) return { text: null, latency: 0 };
  try {
    const body: any = {
      model: opts.model || "llama-3.3-70b-versatile",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: false,
    };
    if (opts.json) body.response_format = { type: "json_object" };
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      recordError("Groq", `${res.status}: ${err.slice(0, 200)}`, ms);
      return { text: null, latency: ms };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || null;
    if (text) recordSuccess("Groq", ms);
    return { text, latency: ms };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    recordError("Groq", String(err), ms);
    return { text: null, latency: ms };
  }
}

// --- Parallel dispatch: first valid non-streaming response wins ---
interface ProviderFn {
  name: string;
  fn: () => Promise<{ text: string | null; latency: number }>;
}

async function firstValid(fns: ProviderFn[]): Promise<{ text: string; name: string; latency: number }> {
  const results = new Array<{ text: string | null; latency: number; name: string } | null>(fns.length).fill(null);
  let settled = 0;

  return new Promise((resolve, reject) => {
    for (const pf of fns) {
      const idx = fns.indexOf(pf);
      pf.fn().then(r => {
        results[idx] = { ...r, name: pf.name };
        settled++;
        if (r.text) resolve(results[idx] as { text: string; name: string; latency: number });
        else if (settled === fns.length) {
          const allErrors = results.map(r =>
            r ? `${r.name}(lat:${r.latency}ms, text:${r.text ? "ok" : "null"})` : "pending"
          ).join(", ");
          reject(new Error(`All providers failed: ${allErrors}`));
        }
      }).catch(err => {
        results[idx] = { text: null, latency: 0, name: pf.name };
        settled++;
        if (settled === fns.length) {
          reject(new Error(`All providers failed: last error ${err}`));
        }
      });
    }
  });
}

// ============================================================
// Public non-streaming API
// ============================================================

export async function routerText(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts: Opts = {}
): Promise<{ text: string; provider: string; latency: number }> {
  const providers: ProviderFn[] = [
    { name: "Gemini", fn: () => tryGemini(systemPrompt, messages, opts) },
    { name: "Kimi", fn: () => tryKimi(systemPrompt, messages, opts) },
    { name: "Groq", fn: () => tryGroq(systemPrompt, messages, opts) },
  ];

  const result = await firstValid(providers);
  console.log(`[Router] ${result.name} responded in ${result.latency}ms`);
  return { text: result.text, provider: result.name, latency: result.latency };
}

export async function routerJSON(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts: Opts = {}
): Promise<any> {
  const { text } = await routerText(systemPrompt, messages, { ...opts, json: true });
  return JSON.parse(text);
}

// ============================================================
// Streaming
// ============================================================

const encoder = new TextEncoder();

async function tryGeminiStream(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts, signal: AbortSignal
): Promise<ReadableStream | null> {
  const key = getKey("GEMINI_API_KEY");
  if (!key || !shouldTryProvider("Gemini")) return null;
  try {
    const chatMessages = messages.filter(m => m.role !== "system");
    const fullPrompt = systemPrompt
      ? systemPrompt + "\n\n---\n\n" + chatMessages.map(m =>
          `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
        ).join("\n\n")
      : chatMessages.map(m =>
          `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
        ).join("\n\n");
    const body: any = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 2048 },
    };
    const res = await fetch(
      `${GEMINI_BASE}/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }
    );
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}

async function tryKimiStream(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts, signal: AbortSignal
): Promise<ReadableStream | null> {
  const key = getKey("NVIDIA_API_KEY");
  if (!key || !shouldTryProvider("Kimi")) return null;
  try {
    const body: any = {
      model: "nvidia/kimi-k2-6",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    };
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}

async function tryGroqStream(
  systemPrompt: string, messages: { role: string; content: string }[], opts: Opts, signal: AbortSignal
): Promise<ReadableStream | null> {
  const key = getKey("GROQ_API_KEY");
  if (!key || !shouldTryProvider("Groq")) return null;
  try {
    const body: any = {
      model: opts.model || "llama-3.3-70b-versatile",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true,
    };
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}

function parseSSE(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;
  const data = trimmed.slice(6).trim();
  if (data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) return delta;
    const geminiText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (geminiText) return geminiText;
  } catch {}
  return null;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StreamEntry {
  provider: string;
  stream: ReadableStream<Uint8Array>;
  controller: AbortController;
}

export async function routerStream(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts: Opts = {}
): Promise<ReadableStream> {
  const abortControllers: AbortController[] = [];
  const cleanup = () => { for (const ac of abortControllers) try { ac.abort(); } catch {} };

  const ac1 = new AbortController(); abortControllers.push(ac1);
  const ac2 = new AbortController(); abortControllers.push(ac2);
  const ac3 = new AbortController(); abortControllers.push(ac3);

  const attempts: Promise<StreamEntry | null>[] = [
    tryGeminiStream(systemPrompt, messages, opts, ac1.signal).then(s => s ? { provider: "Gemini", stream: s, controller: ac1 } : null),
    tryKimiStream(systemPrompt, messages, opts, ac2.signal).then(s => s ? { provider: "Kimi", stream: s, controller: ac2 } : null),
    tryGroqStream(systemPrompt, messages, opts, ac3.signal).then(s => s ? { provider: "Groq", stream: s, controller: ac3 } : null),
  ];

  const entries: StreamEntry[] = [];
  let settled = 0;
  let elected = false;

  return new ReadableStream({
    async start(controller) {
      while (settled < 3 && !elected) {
        const r = await Promise.race(attempts);
        settled++;
        if (r) {
          entries.push(r);
          if (!elected) {
            elected = true;
            recordSuccess(r.provider, 0);
            for (const ac of abortControllers) {
              if (ac !== r.controller) try { ac.abort(); } catch {}
            }
            const electedEntry = r;
            const reader = electedEntry.stream.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  const delta = parseSSE(line);
                  if (delta) {
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`
                    ));
                  }
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err) {
              const remaining = entries.filter(e => e.provider !== electedEntry.provider);
              if (remaining.length > 0) {
                console.warn(`[Router] ${electedEntry.provider} stream failed, handing off to ${remaining[0].provider}`);
                recordError(electedEntry.provider, `mid-stream failure: ${err}`, 0);
                await handoffStream(remaining[0], controller);
              } else {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              }
            }
          }
        }
      }

      if (!elected) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ error: "All AI providers unavailable for streaming" })}\n\n`
        ));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }

      cleanup();
    },
  });
}

async function handoffStream(entry: StreamEntry, controller: ReadableStreamDefaultController): Promise<void> {
  const reader = entry.stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const delta = parseSSE(line);
        if (delta) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`
          ));
        }
      }
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  } catch {
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  }
}

export { CORS_HEADERS };
