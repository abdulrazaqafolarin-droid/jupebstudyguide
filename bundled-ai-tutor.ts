// Bundled edge function - all local imports inlined
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2"

// === ../_shared/provider-health.ts ===
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

export function recordSuccess(name: string, latencyMs: number): void {
  const s = getOrCreate(name);
  s.ok = true;
  s.latencyMs = latencyMs;
  s.consecutiveFailures = 0;
  s.backoffUntil = null;
  s.lastError = null;
}

export function recordError(name: string, error: string, latencyMs: number): void {
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

export function shouldTryProvider(name: string): boolean {
  const s = store.get(name);
  if (!s) return true;
  if (s.backoffUntil && Date.now() < s.backoffUntil) return false;
  return true;
}

export function getProviderStats(): ProviderStats[] {
  return [...store.values()].sort((a, b) => a.latencyMs - b.latencyMs);
}

export function resetProviderHealth(name: string): void {
  store.delete(name);
}

export function resetAllHealth(): void {
  store.clear();
}


// === ../_shared/keyVault.ts ===

const PBKDF2_SALT = "ai-key-vault-salt-v1";

// ============================================================
// AES-256-GCM Encryption (Web Crypto API -- works in Deno)
// ============================================================

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(PBKDF2_SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptApiKey(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(encrypted: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ============================================================
// Active Key Fetcher -- queries DB for highest-priority active key
// ============================================================

export interface ActiveKeyResult {
  keyId: string;
  apiKey: string;
  label: string;
}

export async function getActiveGeminiKey(
  supabaseUrl: string,
  supabaseKey: string,
  encryptionSecret: string
): Promise<ActiveKeyResult | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("ai_api_keys")
    .select("id, label, encrypted_key")
    .eq("is_active", true)
    .eq("token_exhausted", false)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("[KeyVault] No active key available:", error?.message || "no keys");
    return null;
  }

  try {
    const apiKey = await decryptApiKey(data.encrypted_key, encryptionSecret);
    return { keyId: data.id, apiKey, label: data.label };
  } catch (err) {
    console.error("[KeyVault] Failed to decrypt key:", err);
    return null;
  }
}

// ============================================================
// Usage Logging
// ============================================================

export interface GeminiUsageMeta {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export async function logKeyUsage(
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

// ============================================================
// Mark key as exhausted (quota hit)
// ============================================================

export async function markKeyExhausted(
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


// === ../_shared/ai-router.ts ===

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
  body: any, apiKey: string, stream: boolean
): Promise<Response> {
  const endpoint = stream
    ? `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=${apiKey}`
    : `${GEMINI_BASE}/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`;
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
    const res = await geminiFetch(body, apiKey, false);
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
  const encryptionSecret = Deno.env.get("KEY_ENCRYPTION_SECRET");

  // Fallback to static env var if key vault is not configured
  const fallbackKey = !supabaseUrl || !supabaseKey || !encryptionSecret ? getKey("GEMINI_API_KEY") : null;
  if (fallbackKey) {
    const result = await geminiCall(systemPrompt, messages, opts, fallbackKey);
    const ms = Math.round(performance.now() - t0);
    if (result.text) recordSuccess("Gemini", ms);
    else recordError("Gemini", result.error || "unknown", ms);
    return { text: result.text, latency: ms };
  }

  // No static key either -- can't do Gemini
  if (!supabaseUrl || !supabaseKey || !encryptionSecret) {
    return { text: null, latency: 0 };
  }

  return tryGeminiWithFailover(systemPrompt, messages, opts, supabaseUrl, supabaseKey, encryptionSecret, t0, 0);
}

async function tryGeminiWithFailover(
  systemPrompt: string, messages: RouterMessage[], opts: Opts,
  supabaseUrl: string, supabaseKey: string, encryptionSecret: string,
  t0: number, depth: number
): Promise<{ text: string | null; latency: number }> {
  // Safety: max 3 retries to avoid infinite loops
  if (depth >= 3) {
    console.error("[Router] Gemini failover exhausted all retries");
    return { text: null, latency: Math.round(performance.now() - t0) };
  }

  const activeKey = await getActiveGeminiKey(supabaseUrl, supabaseKey, encryptionSecret);
  if (!activeKey) {
    if (depth === 0) console.warn("[Router] No active Gemini keys available");
    return { text: null, latency: Math.round(performance.now() - t0) };
  }

  const result = await geminiCall(systemPrompt, messages, opts, activeKey.apiKey);
  const ms = Math.round(performance.now() - t0);

  if (result.text) {
    recordSuccess("Gemini", ms);
    // Log success usage asynchronously -- don't block response
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
    // Mark exhausted + log error asynchronously
    Promise.all([
      markKeyExhausted(supabaseUrl, supabaseKey, activeKey.keyId),
      logKeyUsage(supabaseUrl, supabaseKey, {
        keyId: activeKey.keyId, feature: "ai-router",
        status: "quota_error", errorMessage: result.error,
      }),
    ]).catch(e => console.error("[Router] Failed to mark key exhausted:", e));
    // Retry with next key
    return tryGeminiWithFailover(systemPrompt, messages, opts, supabaseUrl, supabaseKey, encryptionSecret, t0, depth + 1);
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

export async function routerText(
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

// --- Gemini Stream with Key Vault + failover ---
async function tryGeminiStream(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal
): Promise<{ stream: ReadableStream | null; keyId?: string; label?: string }> {
  if (!shouldTryProvider("Gemini")) return { stream: null };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionSecret = Deno.env.get("KEY_ENCRYPTION_SECRET");

  const fallbackKey = !supabaseUrl || !supabaseKey || !encryptionSecret ? getKey("GEMINI_API_KEY") : null;
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

  if (!supabaseUrl || !supabaseKey || !encryptionSecret) return { stream: null };

  return tryGeminiStreamWithFailover(systemPrompt, messages, opts, signal, supabaseUrl, supabaseKey, encryptionSecret, 0);
}

async function tryGeminiStreamWithFailover(
  systemPrompt: string, messages: RouterMessage[], opts: Opts, signal: AbortSignal,
  supabaseUrl: string, supabaseKey: string, encryptionSecret: string,
  depth: number
): Promise<{ stream: ReadableStream | null; keyId?: string; label?: string }> {
  if (depth >= 3) return { stream: null };

  const activeKey = await getActiveGeminiKey(supabaseUrl, supabaseKey, encryptionSecret);
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
        return tryGeminiStreamWithFailover(systemPrompt, messages, opts, signal, supabaseUrl, supabaseKey, encryptionSecret, depth + 1);
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

export async function routerStream(
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


// === ../_shared/ai.ts ===

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function aiChatText(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

export async function aiChatJSON(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<any> {
  return routerJSON(systemPrompt, messages, opts);
}

export async function aiChatStream(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<ReadableStream> {
  return routerStream(systemPrompt, messages, opts);
}

export { CORS_HEADERS };


// === ../_shared/textbook-embed.ts ===
const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    return geminiEmbed(text, key);
  }
  console.warn("[Embed] No GEMINI_API_KEY set -- embeddings unavailable");
  return null;
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  return Promise.all(texts.map(generateEmbedding));
}

async function geminiEmbed(text: string, key: string): Promise<number[] | null> {
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
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[Embed] Gemini error (${res.status}): ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error("[Embed] Gemini request failed:", String(err));
    return null;
  }
}


// === ../_shared/textbook-retrieve.ts ===

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

export async function retrieveRelevantChunks(
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

export function buildRAGContext(chunks: RetrievedChunk[]): RAGContext {
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

export function serializeReferencesEvent(references: CitationReference[]): string {
  return `data: ${JSON.stringify({ type: "references", references })}\n\n`;
}


// === index.ts ===

const TUTOR_SYSTEM_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who uses proven psychological learning techniques to help students truly understand and remember concepts. Your teaching style is engaging, addictive, and designed for long-term memory retention.

## CRITICAL: Mathematical Notation Rules
You MUST format ALL mathematical expressions using LaTeX with $ delimiters. The system uses KaTeX to render your output.
### For inline math (within text): Use single $ delimiters: $expression$
### For display/block math: Use double $$ delimiters on separate lines.

Use: \\frac, \\sqrt, \\int, \\sum, \\sin, \\cos, \\tan, \\times, \\div, \\pm, \\leq, \\geq, \\neq, \\rightarrow, \\alpha, \\beta, \\theta, \\Delta, \\Omega, \\infty for all math.

## Your Core Teaching Methods:
### 1. FEYNMAN TECHNIQUE - Explain complex concepts as if teaching a 12-year-old
### 2. CHUNKING & SCAFFOLDING - Break problems into bite-sized steps (max 3-4 at a time)
### 3. ACTIVE RECALL TRIGGERS - Pose quick "check yourself" questions after explaining
### 4. EMOTIONAL ENGAGEMENT - Use encouraging phrases, make it relatable
### 5. SPACED REPETITION HINTS - Flag "key concepts" that appear often in exams

## Response Format:
1. **Quick Answer** - Direct answer first
2. **The Breakdown** - Step-by-step explanation
3. **Memory Trick** - Mnemonic, analogy, or visual
4. **Quick Check** - One question to test understanding
5. **Exam Tip** - What examiners look for

## Your Personality:
- Enthusiastic, patient, never condescending
- Uses emoji sparingly
- Keeps responses focused
- Makes the student feel smart and capable

Remember: Your goal is to make learning STICK. ALWAYS format math with LaTeX using $ delimiters!`;

const GENERAL_CHAT_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who helps students with their study journey. You can:
- Answer general questions about Physics, Chemistry, Biology, and Mathematics
- Explain concepts and theories
- Give study advice and exam tips
- Create practice questions
- Help students understand the JUPEB syllabus and curriculum

Use the same LaTeX math formatting rules and teaching techniques from your core methodology.
Keep responses helpful, concise, and encouraging.`;

const SYLLABUS_TEACHING_PROMPT = `You are teaching a JUPEB A-level student as part of their 30-day syllabus study plan. Your goal is to ensure DEEP UNDERSTANDING before moving to the next concept.

## Your Teaching Approach:
### 1. STRUCTURED LESSON DELIVERY - Start with overview, use clear sections
### 2. A-LEVEL DEPTH - Explain the "why", include derivations, connect to real-world
### 3. ACTIVE LEARNING CHECKS - Ask questions after each major concept
### 4. USE A-LEVEL EXAMPLES - Draw from JUPEB past questions
### 5. MEMORY ANCHORS - Mnemonics, analogies, key takeaways
### 6. PACING - Don't rush, address questions fully before moving on

Remember: Your job is to make this student TRULY understand. Use proper LaTeX formatting for ALL mathematical expressions!`;

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
    const { messages, question, generalChat, syllabusTeaching, topic, subject, day, learningObjectives, attachment } = await req.json();

    let systemContent = TUTOR_SYSTEM_PROMPT;

    if (syllabusTeaching && topic) {
      systemContent += "\n\n" + SYLLABUS_TEACHING_PROMPT;
      systemContent += `\n\n--- Current Teaching Session ---
Subject: ${subject}
Day: ${day} of 30
Topic: ${topic.name}
Description: ${topic.description}
Subtopics to Cover: ${topic.subtopics?.join(', ') || 'N/A'}
Difficulty Level: ${topic.difficulty}
Learning Objectives for Today:
${learningObjectives?.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n') || 'N/A'}

Begin teaching this topic step by step. Start with fundamentals and build up to A-level depth. Check understanding frequently.`;
    } else if (generalChat) {
      systemContent += "\n\n" + GENERAL_CHAT_PROMPT;
    } else if (question) {
      systemContent += `\n\n--- Current Question Being Studied ---\nSubject: ${question.subject}\nTopic: ${question.topic}\nQuestion: ${question.question}\n${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}\nCorrect Answer: ${question.correctAnswer}\nExplanation: ${question.explanation}`;
    }

    let referencesEvent = "";

    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      const chunks = await retrieveRelevantChunks(supabaseUrl, supabaseKey, lastUserMsg.content, {
        subject: subject || undefined,
        maxChunks: 3,
      });
      const rag = buildRAGContext(chunks);
      if (rag.promptBlock) {
        systemContent += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
    }

    const chatMessages = (messages || []).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.attachment?.mimeType?.startsWith('image/')
        ? `[User attached an image: ${m.attachment.name}]\n${m.content || ''}`
        : m.content,
      ...(m.attachment?.base64 ? { attachment: { base64: m.attachment.base64, mimeType: m.attachment.mimeType, name: m.attachment.name } } : {}),
    }));

    const aiStream = await aiChatStream(
      Deno.env,
      systemContent,
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
    console.error("AI tutor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
