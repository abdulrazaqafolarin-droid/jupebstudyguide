const {  createClient  } = await import("npm:@supabase/supabase-js@2");
// --- inlined from _shared/ai.ts ---
// --- inlined from _shared/ai-router.ts ---
// --- inlined from _shared/provider-health.ts ---
export interface ProviderStats {
  name: string;
  ok: boolean;
  latencyMs: number;
  errorCount: number;
  lastError: string | null;
  consecutiveFailures: number;
  backoffUntil: number | null;
}

const BACKOFF_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 3;

function createStore(): Map<string, ProviderStats> {
  return new Map();
}

const store = createStore();

function getOrCreate(name: string): ProviderStats {
  let s = store.get(name);
  if (!s) {
    s = { name, ok: true, latencyMs: 0, errorCount: 0, lastError: null, consecutiveFailures: 0, backoffUntil: null };
    store.set(name, s);
  }
  return s;
}

function recordSuccess(name: string, latencyMs: number): void {
  const s = getOrCreate(name);
  s.ok = true;
  s.latencyMs = latencyMs;
  s.consecutiveFailures = 0;
  s.backoffUntil = null;
  s.lastError = null;
}

function recordError(name: string, error: string, latencyMs: number): void {
  const s = getOrCreate(name);
  s.ok = false;
  s.latencyMs = latencyMs;
  s.errorCount++;
  s.lastError = error.slice(0, 200);
  s.consecutiveFailures++;
  if (s.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    s.backoffUntil = Date.now() + BACKOFF_MS;
    console.warn(`Provider ${name}: ${s.consecutiveFailures} consecutive failures, backing off ${BACKOFF_MS}ms`);
  }
}

function shouldTryProvider(name: string): boolean {
  const s = store.get(name);
  if (!s) return true;
  if (s.backoffUntil && Date.now() < s.backoffUntil) return false;
  return true;
}

function getProviderStats(): ProviderStats[] {
  return [...store.values()].sort((a, b) => a.latencyMs - b.latencyMs);
}

function resetProviderHealth(name: string): void {
  store.delete(name);
}

function resetAllHealth(): void {
  store.clear();
}

// --- end inlined from _shared/provider-health.ts ---
// --- inlined from _shared/keyVault.ts ---
const {  createClient  } = await import("npm:@supabase/supabase-js@2");

export interface ActiveKeyResult {
  keyId: string;
  apiKey: string;
  label: string;
}

async function getActiveGeminiKey(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<ActiveKeyResult | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("ai_api_keys")
    .select("id, label, api_key")
    .eq("is_active", true)
    .eq("token_exhausted", false)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("[KeyVault] No active key available:", error?.message || "no keys");
    return null;
  }

  return { keyId: data.id, apiKey: data.api_key, label: data.label };
}

export interface GeminiUsageMeta {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

async function logKeyUsage(
  supabaseUrl: string,
  supabaseKey: string,
  params: {
    keyId: string;
    feature: string;
    usageMeta?: GeminiUsageMeta | null;
    model?: string;
    status: "success" | "quota_error" | "error";
    errorMessage?: string;
  }
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const usage = params.usageMeta || {};
  const promptTokens = usage.promptTokenCount ?? 0;
  const completionTokens = usage.candidatesTokenCount ?? 0;
  const totalTokens = usage.totalTokenCount ?? (promptTokens + completionTokens);

  await supabase.from("ai_usage_log").insert({
    key_id: params.keyId,
    feature: params.feature,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    model: params.model || "gemini",
    status: params.status,
    error_message: params.errorMessage,
  });

  if (params.status === "success") {
    await supabase.rpc("increment_key_stats", {
      p_key_id: params.keyId,
      p_token_count: totalTokens,
    });
  }
}

async function markKeyExhausted(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase
    .from("ai_api_keys")
    .update({
      token_exhausted: true,
      exhausted_at: new Date().toISOString(),
    })
    .eq("id", keyId);
}

// --- end inlined from _shared/keyVault.ts ---

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

function buildGeminiBody(systemPrompt: string, messages: RouterMessage[], opts: Opts): any {
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
  return body;
}

// ============================================================
// Gemini Key Vault -- replaces static GEMINI_API_KEY env var
// ============================================================

interface GeminiCallResult {
  text: string | null;
  usageMeta?: GeminiUsageMeta;
  is429: boolean;
  error?: string;
}

async function geminiFetch(
  body: any, apiKey: string, stream: boolean, useFlash: boolean = false
): Promise<Response> {
  const model = useFlash ? "gemini-1.5-flash" : "gemma-4-26b-a4b-it";
  const endpoint = stream
    ? `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function geminiCall(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, apiKey: string
): Promise<GeminiCallResult> {
  const body = buildGeminiBody(systemPrompt, messages, opts);
  try {
    const res = await geminiFetch(body, apiKey, false, !!opts.json);
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      const is429 = res.status === 429 || err.toLowerCase().includes("quota") || err.toLowerCase().includes("rate limit");
      return { text: null, is429, error: `${res.status}: ${err.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    const usageMeta: GeminiUsageMeta | undefined = data.usageMetadata ? {
      promptTokenCount: data.usageMetadata.promptTokenCount,
      candidatesTokenCount: data.usageMetadata.candidatesTokenCount,
      totalTokenCount: data.usageMetadata.totalTokenCount,
    } : undefined;
    return { text, usageMeta, is429: false };
  } catch (err) {
    return { text: null, is429: false, error: String(err) };
  }
}

// --- Provider 1: Gemini with Key Vault + automatic failover on 429 ---
async function tryGemini(
  systemPrompt: string, messages: RouterMessage[], opts: Opts
): Promise<{ text: string | null; latency: number }> {
  const t0 = performance.now();

  if (!shouldTryProvider("Gemini")) return { text: null, latency: 0 };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Try vault path first (when Supabase creds available)
  if (supabaseUrl && supabaseKey) {
    const vaultResult = await tryGeminiWithFailover(systemPrompt, messages, opts, supabaseUrl, supabaseKey, t0, 0);
    if (vaultResult.text) return vaultResult;
    console.warn("[Router] Vault returned no active keys, falling back to GEMINI_API_KEY env var");
  }

  // Fallback to GEMINI_API_KEY env var (vault empty or unavailable)
  const fallbackKey = getKey("GEMINI_API_KEY");
  if (fallbackKey) {
    const result = await geminiCall(systemPrompt, messages, opts, fallbackKey);
    const ms = Math.round(performance.now() - t0);
    if (result.text) recordSuccess("Gemini", ms);
    else recordError("Gemini", result.error || "unknown", ms);
    return { text: result.text, latency: ms };
  }

  return { text: null, latency: 0 };
}

async function tryGeminiWithFailover(
  systemPrompt: string, messages: RouterMessage[], opts: Opts,
  supabaseUrl: string, supabaseKey: string,
  t0: number, depth: number
): Promise<{ text: string | null; latency: number }> {
  // Safety: max 3 retries to avoid infinite loops
  if (depth >= 3) {
    console.error("[Router] Gemini failover exhausted all retries");
    return { text: null, latency: Math.round(performance.now() - t0) };
  }

  const activeKey = await getActiveGeminiKey(supabaseUrl, supabaseKey);
  if (!activeKey) {
    if (depth === 0) console.warn("[Router] No active Gemini keys available");
    return { text: null, latency: Math.round(performance.now() - t0) };
  }

  const result = await geminiCall(systemPrompt, messages, opts, activeKey.apiKey);
  const ms = Math.round(performance.now() - t0);

  if (result.text) {
    recordSuccess("Gemini", ms);
    logKeyUsage(supabaseUrl, supabaseKey, {
      keyId: activeKey.keyId, feature: "ai-router",
      usageMeta: result.usageMeta,
      status: "success",
    }).catch(e => console.error("[Router] Failed to log usage:", e));
    return { text: result.text, latency: ms };
  }

  if (result.is429) {
    console.warn(`[Router] Gemini key ${activeKey.label} exhausted (429), failing over`);
    recordError("Gemini", result.error || "429", ms);
    Promise.all([
      markKeyExhausted(supabaseUrl, supabaseKey, activeKey.keyId),
      logKeyUsage(supabaseUrl, supabaseKey, {
        keyId: activeKey.keyId, feature: "ai-router",
        status: "quota_error", errorMessage: result.error,
      }),
    ]).catch(e => console.error("[Router] Failed to mark key exhausted:", e));
    return tryGeminiWithFailover(systemPrompt, messages, opts, supabaseUrl, supabaseKey, t0, depth + 1);
  }

  // Non-429 error
  recordError("Gemini", result.error || "unknown", ms);
  logKeyUsage(supabaseUrl, supabaseKey, {
    keyId: activeKey.keyId, feature: "ai-router",
    status: "error", errorMessage: result.error,
  }).catch(e => console.error("[Router] Failed to log error:", e));
  return { text: null, latency: ms };
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

// --- Provider 3: Groq (safe fallback -- key already exists) ---
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

async function routerText(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: Opts = {}
): Promise<{ text: string; provider: string; latency: number }> {
  const hasMedia = hasAttachment(messages);
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

async function routerJSON(
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

// --- Gemini Stream with Key Vault + failover ---
async function tryGeminiStream(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal
): Promise<{ stream: ReadableStream | null; keyId?: string; label?: string }> {
  if (!shouldTryProvider("Gemini")) return { stream: null };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Try vault path first (when Supabase creds available)
  if (supabaseUrl && supabaseKey) {
    const vaultResult = await tryGeminiStreamWithFailover(systemPrompt, messages, opts, signal, supabaseUrl, supabaseKey, 0);
    if (vaultResult.stream) return vaultResult;
  }

  // Fallback to GEMINI_API_KEY env var (vault empty or unavailable)
  const fallbackKey = getKey("GEMINI_API_KEY");
  if (fallbackKey) {
    try {
      const body = buildGeminiBody(systemPrompt, messages, opts);
      const res = await fetch(
        `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=${fallbackKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }
      );
      return { stream: res.ok ? res.body : null };
    } catch {
      return { stream: null };
    }
  }

  return { stream: null };
}

async function tryGeminiStreamWithFailover(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal,
  supabaseUrl: string, supabaseKey: string,
  depth: number
): Promise<{ stream: ReadableStream | null; keyId?: string; label?: string }> {
  if (depth >= 3) return { stream: null };

  const activeKey = await getActiveGeminiKey(supabaseUrl, supabaseKey);
  if (!activeKey) return { stream: null };

  try {
    const body = buildGeminiBody(systemPrompt, messages, opts);
    const res = await fetch(
      `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=${activeKey.apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const is429 = res.status === 429 || errText.toLowerCase().includes("quota") || errText.toLowerCase().includes("rate limit");
      if (is429) {
        await markKeyExhausted(supabaseUrl, supabaseKey, activeKey.keyId);
        return tryGeminiStreamWithFailover(systemPrompt, messages, opts, signal, supabaseUrl, supabaseKey, depth + 1);
      }
      return { stream: null };
    }
    // Log stream start asynchronously -- best-effort
    logKeyUsage(supabaseUrl, supabaseKey, {
      keyId: activeKey.keyId, feature: "ai-router-stream",
      status: "success",
    }).catch(() => {});
    return { stream: res.body, keyId: activeKey.keyId, label: activeKey.label };
  } catch {
    return { stream: null };
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

async function routerStream(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: Opts = {}
): Promise<ReadableStream> {
  const abortControllers: AbortController[] = [];
  const cleanup = () => { for (const ac of abortControllers) try { ac.abort(); } catch { /* abort may throw */ } };

  const hasMedia = hasAttachment(messages);

  if (hasMedia) {
    const ac1 = new AbortController(); abortControllers.push(ac1);
    const geminiResult = await tryGeminiStream(systemPrompt, messages, opts, ac1.signal);
    if (geminiResult.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            const reader = geminiResult.stream!.getReader();
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
    tryGeminiStream(systemPrompt, messages, opts, ac1.signal).then(s => s.stream ? { provider: "Gemini", stream: s.stream!, controller: ac1 } : null),
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

// --- end inlined from _shared/ai-router.ts ---

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function aiChatText(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

async function aiChatJSON(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<any> {
  return routerJSON(systemPrompt, messages, opts);
}

async function aiChatStream(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<ReadableStream> {
  return routerStream(systemPrompt, messages, opts);
}



// --- end inlined from _shared/ai.ts ---
// --- inlined from _shared/textbook-retrieve.ts ---
const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `${EMBED_BASE}/models/gemini-embedding-001:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding?.values || null;
  } catch {
    return null;
  }
}

export interface RetrievedChunk {
  id: string;
  textbook_id: string;
  textbook_title: string;
  content: string;
  similarity: number;
}

export interface CitationReference {
  number: number;
  textbook_title: string;
  textbook_id: string;
  chunk_id: string;
  content: string;
  similarity: number;
}

export interface RAGContext {
  promptBlock: string;
  references: CitationReference[];
}

export interface RetrieveOptions {
  subject?: string;
  maxChunks?: number;
  similarityThreshold?: number;
}

async function retrieveRelevantChunks(
  supabaseUrl: string,
  supabaseKey: string,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const maxChunks = options.maxChunks ?? 5;
  const threshold = options.similarityThreshold ?? 0.5;

  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const vectorStr = `[${embedding.join(",")}]`;

  let url = `${supabaseUrl}/rest/v1/rpc/match_textbook_chunks`;
  if (options.subject) {
    url += `?subject=eq.${encodeURIComponent(options.subject)}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query_embedding: vectorStr,
      match_threshold: threshold,
      match_count: maxChunks,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    console.error(`[Retrieve] pgvector search failed (${res.status}): ${errText.slice(0, 200)}`);
    return [];
  }

  const data = await res.json();
  return (data || []).map((r: any) => ({
    id: r.id,
    textbook_id: r.textbook_id,
    textbook_title: r.textbook_title,
    content: r.content,
    similarity: r.similarity,
  }));
}

function buildRAGContext(chunks: RetrievedChunk[]): RAGContext {
  if (chunks.length === 0) return { promptBlock: "", references: [] };

  const references: CitationReference[] = chunks.map((c, i) => ({
    number: i + 1,
    textbook_title: c.textbook_title,
    textbook_id: c.textbook_id,
    chunk_id: c.id,
    content: c.content,
    similarity: c.similarity,
  }));

  const sections = chunks.map(
    (c, i) => `[${i + 1}] (from "${c.textbook_title}")\n${c.content}`
  );

  const promptBlock = `\n\n=== RELEVANT TEXTBOOK CONTEXT ===\n${sections.join("\n\n")}\n\n=== INSTRUCTION ===\nUse the above references to answer the student's question. Cite sources using [1], [2], etc. inline. If no reference is relevant, answer from your own knowledge without citations.`;

  return { promptBlock, references };
}

function serializeReferencesEvent(references: CitationReference[]): string {
  return `data: ${JSON.stringify({ type: "references", references })}\n\n`;
}

// --- end inlined from _shared/textbook-retrieve.ts ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const encoder = new TextEncoder();
    const { action, systemPrompt, messages, text, subject } = await req.json();

    if (action === "embed") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        return new Response(
          JSON.stringify({ embedding: [], error: "GEMINI_API_KEY not configured" }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const embedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-exp-03-07",
            content: { parts: [{ text: text || "" }] },
          }),
        }
      );
      if (!embedRes.ok) {
        const errText = await embedRes.text();
        return new Response(
          JSON.stringify({
            embedding: [],
            error: `Gemini embedding failed (${embedRes.status}): ${errText}`,
          }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      const embedData = await embedRes.json();
      const embedding = embedData.embedding?.values || [];
      return new Response(
        JSON.stringify({ embedding }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (action === "json") {
      const chatMessages = (messages || []).filter((m: any) => m.role !== "system").map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      const result = await aiChatJSON(Deno.env, systemPrompt || "You are a helpful assistant.", chatMessages, {
        temperature: 0.1,
        maxTokens: 2048,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    let systemMsg = systemPrompt || "You are a helpful assistant for JUPEB exam preparation.";
    let referencesEvent = "";

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      const chunks = await retrieveRelevantChunks(supabaseUrl, supabaseKey, lastUserMsg.content, {
        subject: subject || undefined,
        maxChunks: 3,
      });
      const rag = buildRAGContext(chunks);
      if (rag.promptBlock) {
        systemMsg += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
    }

    const chatMessages = (messages || []).filter((m: any) => m.role !== "system").map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      ...(m.attachment?.base64 ? { attachment: { base64: m.attachment.base64, mimeType: m.attachment.mimeType, name: m.attachment.name } } : {}),
    }));

    const aiStream = await aiChatStream(
      Deno.env,
      systemMsg,
      chatMessages,
      { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 2048 }
    );

    const combinedStream = new ReadableStream({
      async start(controller) {
        if (referencesEvent) {
          controller.enqueue(encoder.encode(referencesEvent));
        }
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
