import { recordSuccess, recordError, shouldTryProvider } from "./provider-health.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

export interface RouterMessage {
  role: string;
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
}

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

const GEMINI_INLINE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "application/pdf", "text/plain"];
function isGeminiInlineType(mimeType: string): boolean {
  return GEMINI_INLINE_TYPES.some(t => mimeType.startsWith(t));
}

function buildMsgs(systemPrompt: string, messages: RouterMessage[]) {
  const msgs: { role: string; content: string }[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  for (const m of messages) {
    let content = m.content || "";
    if (m.attachment) {
      const prefix = m.attachment.mimeType?.startsWith("image/")
        ? `[Image attached: ${m.attachment.name}]`
        : `[File attached: ${m.attachment.name}]`;
      content = content ? `${prefix}\n${content}` : prefix;
    }
    msgs.push({ role: m.role, content });
  }
  return msgs;
}

function buildGeminiParts(m: RouterMessage): any[] {
  const parts: any[] = [];
  if (m.attachment?.base64 && isGeminiInlineType(m.attachment.mimeType)) {
    parts.push({
      inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.base64 },
    });
  }
  parts.push({ text: m.content || "" });
  return parts;
}

// --- Provider 1: Gemini (cheapest, primary) ---
async function tryGemini(
  systemPrompt: string, messages: RouterMessage[], opts: Opts
): Promise<{ text: string | null; latency: number }> {
  const t0 = performance.now();
  const key = getKey("GEMINI_API_KEY");
  if (!key || !shouldTryProvider("Gemini")) return { text: null, latency: 0 };
  try {
    const chatMessages = messages.filter(m => m.role !== "system");
    const mappedMessages = chatMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: buildGeminiParts(m),
    }));

    const body: any = {};
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }
    body.contents = mappedMessages;
    body.generationConfig = {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    };
    if (opts.json) body.generationConfig.responseMimeType = "application/json";

    const res = await fetch(
      `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:generateContent?key=${key}`,
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
  systemPrompt: string, messages: RouterMessage[], opts: Opts
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
  systemPrompt: string, messages: RouterMessage[], opts: Opts
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

function hasAttachment(messages: RouterMessage[]): boolean {
  return messages.some(m => m.attachment?.base64 != null);
}

function stripAttachments(messages: RouterMessage[]): RouterMessage[] {
  return messages.map(m => {
    const { attachment, ...rest } = m;
    return rest;
  });
}

// ============================================================
// Public non-streaming API
// ============================================================

export async function routerText(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: Opts = {}
): Promise<{ text: string; provider: string; latency: number }> {
  const hasMedia = hasAttachment(messages);
  // When images/files are present, only Gemini can process them.
  // Try Gemini first; fall back to Groq/Kimi with text-only messages if Gemini fails.
  if (hasMedia) {
    const geminiResult = await tryGemini(systemPrompt, messages, opts).catch(() => ({ text: null as string | null, latency: 0 }));
    if (geminiResult.text) {
      return { text: geminiResult.text, provider: "Gemini", latency: geminiResult.latency };
    }
    console.warn("[Router] Gemini failed for attachment request, falling back to text-only providers");
    const textOnly = stripAttachments(messages);
    const fallbackProviders: ProviderFn[] = [
      { name: "Groq", fn: () => tryGroq(systemPrompt, textOnly, opts) },
      { name: "Kimi", fn: () => tryKimi(systemPrompt, textOnly, opts) },
    ];
    const result = await firstValid(fallbackProviders);
    return { text: result.text, provider: result.name, latency: result.latency };
  }
  const providers: ProviderFn[] = [
    { name: "Gemini", fn: () => tryGemini(systemPrompt, messages, opts) },
    { name: "Groq", fn: () => tryGroq(systemPrompt, messages, opts) },
    { name: "Kimi", fn: () => tryKimi(systemPrompt, messages, opts) },
  ];

  const result = await firstValid(providers);
  console.log(`[Router] ${result.name} responded in ${result.latency}ms`);
  return { text: result.text, provider: result.name, latency: result.latency };
}

export async function routerJSON(
  systemPrompt: string,
  messages: RouterMessage[],
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
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal
): Promise<ReadableStream | null> {
  const key = getKey("GEMINI_API_KEY");
  if (!key || !shouldTryProvider("Gemini")) return null;
  try {
    const chatMessages = messages.filter(m => m.role !== "system");
    const mappedMessages = chatMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: buildGeminiParts(m),
    }));
    const body: any = {};
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }
    body.contents = mappedMessages;
    body.generationConfig = { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 2048 };
    const res = await fetch(
      `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }
    );
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}

async function tryKimiStream(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal
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
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal
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
  } catch { /* ignore parse error */ }
  return null;
}

interface StreamEntry {
  provider: string;
  stream: ReadableStream<Uint8Array>;
  controller: AbortController;
}

export async function routerStream(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: Opts = {}
): Promise<ReadableStream> {
  const abortControllers: AbortController[] = [];
  const cleanup = () => { for (const ac of abortControllers) try { ac.abort(); } catch { /* abort may throw */ } };

  const hasMedia = hasAttachment(messages);

  if (hasMedia) {
    // Only Gemini can process images/files. Try it solo; fall back to text-only providers.
    const ac1 = new AbortController(); abortControllers.push(ac1);
    const geminiResult = await tryGeminiStream(systemPrompt, messages, opts, ac1.signal);
    if (geminiResult) {
      return new ReadableStream({
        async start(controller) {
          try {
            const reader = geminiResult.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Gemini stream failed: ${err}` })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
          cleanup();
        },
      });
    }
    console.warn("[Router] Gemini stream unavailable for attachment, falling back to text-only providers");
    const textOnly = stripAttachments(messages);
    const ac2 = new AbortController(); abortControllers.push(ac2);
    const ac3 = new AbortController(); abortControllers.push(ac3);
    const fallbackAttempts: Promise<StreamEntry | null>[] = [
      tryGroqStream(systemPrompt, textOnly, opts, ac2.signal).then(s => s ? { provider: "Groq", stream: s, controller: ac2 } : null),
      tryKimiStream(systemPrompt, textOnly, opts, ac3.signal).then(s => s ? { provider: "Kimi", stream: s, controller: ac3 } : null),
    ];
    const electedFallback = new Promise<StreamEntry>((resolve, reject) => {
      let settled = 0;
      for (let i = 0; i < fallbackAttempts.length; i++) {
        fallbackAttempts[i].then(r => {
          if (r) resolve(r);
          else { settled++; if (settled === fallbackAttempts.length) reject(new Error("All fallback providers unavailable")); }
        });
      }
    });
    return new ReadableStream({
      async start(controller) {
        try {
          const entry = await electedFallback;
          for (const ac of abortControllers) { if (ac !== entry.controller) try { ac.abort(); } catch {} }
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`));
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Fallback stream failed: ${err}` })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "All AI providers unavailable for streaming" })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
        cleanup();
      },
    });
  }

  const ac1 = new AbortController(); abortControllers.push(ac1);
  const ac2 = new AbortController(); abortControllers.push(ac2);
  const ac3 = new AbortController(); abortControllers.push(ac3);

  const attempts: Promise<StreamEntry | null>[] = [
    tryGeminiStream(systemPrompt, messages, opts, ac1.signal).then(s => s ? { provider: "Gemini", stream: s, controller: ac1 } : null),
    tryGroqStream(systemPrompt, messages, opts, ac2.signal).then(s => s ? { provider: "Groq", stream: s, controller: ac2 } : null),
    tryKimiStream(systemPrompt, messages, opts, ac3.signal).then(s => s ? { provider: "Kimi", stream: s, controller: ac3 } : null),
  ];

  const elected = new Promise<StreamEntry>((resolve, reject) => {
    let settled = 0;
    for (let i = 0; i < attempts.length; i++) {
      attempts[i].then(r => {
        if (r) {
          resolve(r);
        } else {
          settled++;
          if (settled === attempts.length) reject(new Error("All AI providers unavailable"));
        }
      });
    }
  });

  return new ReadableStream({
    async start(controller) {
      try {
        const entry = await elected;
        recordSuccess(entry.provider, 0);
        for (const ac of abortControllers) {
          if (ac !== entry.controller) try { ac.abort(); } catch { /* abort may throw */ }
        }
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
        } catch (err) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: `Stream failed: ${err}` })}\n\n`
          ));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      } catch {
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

