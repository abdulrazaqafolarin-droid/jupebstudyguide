import { recordSuccess, recordError, shouldTryProvider } from "./provider-health.ts";
import {
  getVaultKeys,
  recordKeySuccess,
  recordKeyQuotaFailure,
  recordKeyTransientFailure,
  recordKeyFatalFailure,
  logKeyUsage,
  type VaultKey,
  type VaultProvider,
  type GeminiUsageMeta,
} from "./keyVault.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";
/** Max wait for stream response headers before trying the next key/provider.
 *  Free-tier Gemini regularly needs >12s to first byte under load; a 12s
 *  window aborted every stream attempt before Google could answer. */
const STREAM_HEADERS_TIMEOUT_MS = 22_000;
/** Max silence between stream chunks before the SSE pipe gives up. */
const STREAM_IDLE_TIMEOUT_MS = 45_000;
/**
 * Hard cap on total provider+key election time. Once the deadline passes no
 * further keys or providers are attempted, so worst-case latency stays
 * bounded (~deadline + one in-flight attempt) no matter how many keys are
 * in the vault. Without this, N keys each eating the header window stack up
 * (8 keys x 12s+ ≈ 100s+ of spinner before a structured error).
 */
const ELECTION_DEADLINE_MS = 45_000;

export interface RouterMessage {
  role: string;
  content: string;
  attachment?: { base64: string; mimeType: string; name: string };
}

export interface RouterOpts {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /**
   * Deliberate same-request retry — used by the chat-proxy non-streaming
   * fallback. Skips BOTH safety rails that would otherwise block it: the
   * in-memory provider circuit breaker (streaming just failed, so gemini is
   * necessarily in backoff) and transient per-key vault cooldowns (the stream
   * phase just exercised those keys on a *different* endpoint —
   * streamGenerateContent — whose 503s say nothing about generateContent).
   * is_active/token_exhausted filters always apply; bounded by the election
   * deadline like every other attempt.
   */
  bypassBackoff?: boolean;
}

export interface RouterContext {
  supabaseUrl: string | undefined;
  supabaseKey: string | undefined;
  encryptionSecret: string | undefined;
}

export function loadRouterContext(): RouterContext {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    supabaseKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    encryptionSecret: Deno.env.get("KEY_ENCRYPTION_SECRET"),
  };
}

function getKey(name: string): string | null {
  const k = Deno.env.get(name);
  return k && k.length > 0 ? k : null;
}

function modelFor(provider: VaultProvider, opts: RouterOpts): string {
  // NOTE: opts.model carries OpenAI-style ids (e.g. llama-3.3-70b-versatile)
  // used by Groq/NVIDIA. Gemini always uses its own model setting — passing a
  // Groq id to Gemini 404s, so it is deliberately ignored here.
  if (provider === "gemini") return Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
  if (opts.model) return opts.model;
  if (provider === "groq") return Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
  return Deno.env.get("NVIDIA_MODEL") || "nvidia/kimi-k2-6";
}

function envKeyName(provider: VaultProvider): string {
  if (provider === "gemini") return "GEMINI_API_KEY";
  if (provider === "groq") return "GROQ_API_KEY";
  return "NVIDIA_API_KEY";
}

function providerLabel(provider: VaultProvider): string {
  if (provider === "gemini") return "Gemini";
  if (provider === "groq") return "Groq";
  return "Kimi";
}

// ============================================================
// Failure classification — determines per-key consequences.
// quota     -> escalating cooldown, eventual exhaustion (auto-recovers first)
// fatal     -> auth/config problem, parked briefly, surfaced to admin
// transient -> network/5xx, short cooldown, auto-recovers
// ============================================================

export type FailureKind = "quota" | "fatal" | "transient";

export function classifyError(status: number, bodyText: string): FailureKind {
  const t = (bodyText || "").toLowerCase();
  if (
    status === 429 ||
    status === 402 ||
    t.includes("quota") ||
    t.includes("rate limit") ||
    t.includes("rate_limit") ||
    t.includes("too many requests")
  ) {
    return "quota";
  }
  if (status === 401 || status === 403 || status === 400 || status === 404) {
    return "fatal";
  }
  return "transient";
}

/**
 * Delays for automatic same-key retries after TRANSIENT failures (503/5xx,
 * network, header timeouts). Google's own 503 message says spikes "are usually
 * temporary. Please try again later" — one quick retry rides out short
 * capacity spikes instead of failing the whole election. Quota and fatal
 * failures are excluded: retrying those only burns deadline.
 * Returns the delay in ms, or null to give up.
 */
export const TRANSIENT_RETRY_DELAYS_MS = [2_000];

export function transientRetryDelayMs(
  failure: KeyAttemptFailure,
  retryCount: number,
  deadline: number
): number | null {
  if (failure.kind !== "transient") return null;
  if (retryCount >= TRANSIENT_RETRY_DELAYS_MS.length) return null;
  const delay = TRANSIENT_RETRY_DELAYS_MS[retryCount];
  return Date.now() + delay < deadline ? delay : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Key resolution: vault keys (decrypted, cooldown-aware) first,
// static env secret last as a lowest-priority fallback.
// ============================================================

export interface ResolvedKey {
  keyId: string | null;
  label: string;
  apiKey: string;
  fromEnv: boolean;
}

export async function resolveKeys(
  ctx: RouterContext,
  provider: VaultProvider,
  bypassCooldowns = false
): Promise<{ keys: ResolvedKey[]; vaultConfigured: boolean }> {
  const vaultConfigured = Boolean(ctx.supabaseUrl && ctx.supabaseKey && ctx.encryptionSecret);
  let keys: ResolvedKey[] = [];
  if (vaultConfigured) {
    const vaultKeys: VaultKey[] = await getVaultKeys(
      ctx.supabaseUrl as string,
      ctx.supabaseKey as string,
      ctx.encryptionSecret as string,
      provider,
      bypassCooldowns
    );
    keys = vaultKeys.map((k) => ({ keyId: k.keyId, label: k.label, apiKey: k.apiKey, fromEnv: false }));
  }
  const envKey = getKey(envKeyName(provider));
  if (envKey) {
    keys.push({ keyId: null, label: "env", apiKey: envKey, fromEnv: true });
  }
  return { keys, vaultConfigured };
}

async function recordAttempt(
  ctx: RouterContext,
  providerName: string,
  key: ResolvedKey,
  kind: "success" | FailureKind,
  detail: string,
  feature: string,
  model: string,
  usageMeta?: GeminiUsageMeta
): Promise<void> {
  if (!key.keyId) {
    // Env fallback key — no DB row to update; track in memory only.
    if (kind === "success") recordSuccess(providerName, 0);
    else recordError(providerName, detail, 0);
    return;
  }
  if (kind === "success") {
    recordSuccess(providerName, 0);
    await recordKeySuccess(ctx.supabaseUrl as string, ctx.supabaseKey as string, key.keyId);
    await logKeyUsage(ctx.supabaseUrl as string, ctx.supabaseKey as string, {
      keyId: key.keyId, feature, usageMeta, model, status: "success",
    }).catch((e) => console.error("[Router] Failed to log usage:", e));
    return;
  }
  recordError(providerName, detail, 0);
  const url = ctx.supabaseUrl as string;
  const sk = ctx.supabaseKey as string;
  if (kind === "quota") {
    await recordKeyQuotaFailure(url, sk, key.keyId, detail);
    await logKeyUsage(url, sk, {
      keyId: key.keyId, feature, model, status: "quota_error", errorMessage: detail,
    }).catch((e) => console.error("[Router] Failed to log quota error:", e));
  } else if (kind === "fatal") {
    await recordKeyFatalFailure(url, sk, key.keyId, detail);
    await logKeyUsage(url, sk, {
      keyId: key.keyId, feature, model, status: "error", errorMessage: detail,
    }).catch((e) => console.error("[Router] Failed to log error:", e));
  } else {
    await recordKeyTransientFailure(url, sk, key.keyId, detail);
  }
}

// ============================================================
// Request builders
// ============================================================

const GEMINI_INLINE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "application/pdf", "text/plain"];

function isGeminiInlineType(mimeType: string): boolean {
  return GEMINI_INLINE_TYPES.some((t) => mimeType.startsWith(t));
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiBody {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig: { temperature: number; maxOutputTokens: number; responseMimeType?: string };
}

function buildGeminiBody(systemPrompt: string, messages: RouterMessage[], opts: RouterOpts): GeminiBody {
  const contents: GeminiContent[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const parts: GeminiPart[] = [];
      if (m.attachment?.base64 && isGeminiInlineType(m.attachment.mimeType)) {
        parts.push({ inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.base64 } });
      }
      parts.push({ text: m.content || "" });
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });
  const body: GeminiBody = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  if (opts.json) body.generationConfig.responseMimeType = "application/json";
  return body;
}

interface OpenAIChatMessage {
  role: string;
  content: string;
}

function buildOpenAIMessages(systemPrompt: string, messages: RouterMessage[]): OpenAIChatMessage[] {
  const msgs: OpenAIChatMessage[] = [];
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

interface OpenAIBody {
  model: string;
  messages: OpenAIChatMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
  response_format?: { type: string };
}

function buildOpenAIBody(provider: VaultProvider, systemPrompt: string, messages: RouterMessage[], opts: RouterOpts, stream: boolean): OpenAIBody {
  const body: OpenAIBody = {
    model: modelFor(provider, opts),
    messages: buildOpenAIMessages(systemPrompt, messages),
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2048,
    stream,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  return body;
}

// ============================================================
// Response parsing (typed, no `any`)
// ============================================================

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  error?: { message?: string };
}

function parseGeminiText(data: GeminiResponse): string | null {
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("");
  return text || null;
}

function parseGeminiUsage(data: GeminiResponse): GeminiUsageMeta | undefined {
  const u = data.usageMetadata;
  if (!u) return undefined;
  return {
    promptTokenCount: u.promptTokenCount,
    candidatesTokenCount: u.candidatesTokenCount,
    totalTokenCount: u.totalTokenCount,
  };
}

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
  error?: { message?: string };
}

function parseOpenAIText(data: OpenAIResponse): string | null {
  return data.choices?.[0]?.message?.content || null;
}

function parseSSEDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;
  const data = trimmed.slice(6).trim();
  if (data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data) as OpenAIResponse & GeminiResponse;
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) return delta;
    const geminiText = parseGeminiText(parsed);
    if (geminiText) return geminiText;
  } catch { /* ignore parse error */ }
  return null;
}

// ============================================================
// Single-key attempts (text + stream)
// ============================================================

export interface KeyAttemptFailure {
  label: string;
  kind: FailureKind;
  status: number;
  detail: string;
}

interface TextAttemptOk {
  ok: true;
  text: string;
  usageMeta?: GeminiUsageMeta;
}

interface TextAttemptFail {
  ok: false;
  failure: KeyAttemptFailure;
}

async function attemptText(
  provider: VaultProvider,
  key: ResolvedKey,
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts,
  deadline?: number
): Promise<TextAttemptOk | TextAttemptFail> {
  const fail = (status: number, detail: string): TextAttemptFail => ({
    ok: false,
    failure: { label: key.label, kind: classifyError(status, detail), status, detail },
  });
  // Clamp the per-attempt timeout to the remaining election deadline when one
  // is provided, so a late attempt can't overshoot the global cap by a full
  // 55s window. Without a deadline (e.g. validateKey), keep the old behaviour.
  const timeoutMs = deadline !== undefined
    ? Math.max(1, Math.min(55_000, deadline - Date.now()))
    : 55_000;
  try {
    if (provider === "gemini") {
      const model = modelFor(provider, opts);
      const res = await fetch(
        `${GEMINI_BASE}/models/${model}:generateContent?key=${key.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildGeminiBody(systemPrompt, messages, opts)),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );
      if (!res.ok) {
        const err = await res.text().catch(() => "unknown");
        return fail(res.status, `${res.status}: ${err.slice(0, 200)}`);
      }
      const data = (await res.json()) as GeminiResponse;
      const text = parseGeminiText(data);
      if (!text) return fail(200, "empty candidates in Gemini response");
      return { ok: true, text, usageMeta: parseGeminiUsage(data) };
    }
    const base = provider === "groq" ? GROQ_BASE : NVIDIA_BASE;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key.apiKey}` },
      body: JSON.stringify(buildOpenAIBody(provider, systemPrompt, messages, opts, false)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      return fail(res.status, `${res.status}: ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as OpenAIResponse;
    const text = parseOpenAIText(data);
    if (!text) return fail(200, "empty choices in provider response");
    return { ok: true, text };
  } catch (err) {
    const detail = String(err).slice(0, 200);
    return { ok: false, failure: { label: key.label, kind: "transient" as FailureKind, status: 0, detail } };
  }
}

interface StreamAttemptOk {
  ok: true;
  stream: ReadableStream<Uint8Array>;
}

async function attemptStream(
  provider: VaultProvider,
  key: ResolvedKey,
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts,
  signal: AbortSignal,
  deadline: number
): Promise<StreamAttemptOk | TextAttemptFail> {
  const fail = (status: number, detail: string): TextAttemptFail => ({
    ok: false,
    failure: { label: key.label, kind: classifyError(status, detail), status, detail },
  });
  // Bound how long we wait for response HEADERS. routerStream is awaited
  // before a single byte reaches the client, so a provider that accepts the
  // connection and then goes silent would otherwise hang the chat forever.
  // The timer is disarmed the moment headers arrive so that long-running
  // streams are never cut off mid-answer.
  const attemptAc = new AbortController();
  const relayAbort = () => attemptAc.abort();
  if (signal.aborted) attemptAc.abort();
  else signal.addEventListener("abort", relayAbort, { once: true });
  let headerTimer: ReturnType<typeof setTimeout> | undefined;
  const disarm = () => {
    if (headerTimer !== undefined) clearTimeout(headerTimer);
    headerTimer = undefined;
    signal.removeEventListener("abort", relayAbort);
  };
  // Clamp the per-key window to the remaining election deadline so a late
  // attempt can't overshoot the global cap by a full timeout.
  headerTimer = setTimeout(
    () => attemptAc.abort(),
    Math.max(1, Math.min(STREAM_HEADERS_TIMEOUT_MS, deadline - Date.now()))
  );
  try {
    if (provider === "gemini") {
      const model = modelFor(provider, opts);
      const res = await fetch(
        `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${key.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildGeminiBody(systemPrompt, messages, opts)),
          signal: attemptAc.signal,
        }
      );
      disarm();
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "unknown");
        return fail(res.status, `${res.status}: ${err.slice(0, 200)}`);
      }
      return { ok: true, stream: res.body };
    }
    const base = provider === "groq" ? GROQ_BASE : NVIDIA_BASE;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key.apiKey}` },
      body: JSON.stringify(buildOpenAIBody(provider, systemPrompt, messages, opts, true)),
      signal: attemptAc.signal,
    });
    disarm();
    if (!res.ok || !res.body) {
      const err = await res.text().catch(() => "unknown");
      return fail(res.status, `${res.status}: ${err.slice(0, 200)}`);
    }
    return { ok: true, stream: res.body };
  } catch (err) {
    disarm();
    const detail = String(err).slice(0, 200);
    return { ok: false, failure: { label: key.label, kind: "transient", status: 0, detail } };
  }
}

// ============================================================
// Provider runners — iterate ALL keys of a provider.
// Throws ProviderFailure carrying every key's reason.
// ============================================================

export class ProviderFailure extends Error {
  provider: string;
  keyFailures: KeyAttemptFailure[];
  constructor(provider: string, keyFailures: KeyAttemptFailure[]) {
    super(`${provider}: ${keyFailures.map((k) => `[${k.label}] ${k.detail}`).join("; ") || "no keys"}`);
    this.provider = provider;
    this.keyFailures = keyFailures;
  }
}

const PROVIDER_ORDER: VaultProvider[] = ["gemini", "groq", "nvidia"];

export interface ProviderSuccess {
  text: string;
  provider: string;
  keyLabel: string;
  latency: number;
}

async function runProviderText(
  ctx: RouterContext,
  provider: VaultProvider,
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts,
  feature: string,
  deadline: number
): Promise<ProviderSuccess> {
  const t0 = performance.now();
  const label = providerLabel(provider);
  if (!opts.bypassBackoff && !shouldTryProvider(label)) {
    throw new ProviderFailure(label, [{ label: "-", kind: "transient", status: 0, detail: "provider in backoff" }]);
  }
  if (Date.now() >= deadline) {
    throw new ProviderFailure(label, [{
      label: "-",
      kind: "transient",
      status: 0,
      detail: `election deadline (${ELECTION_DEADLINE_MS}ms) reached`,
    }]);
  }
  const { keys, vaultConfigured } = await resolveKeys(ctx, provider, opts.bypassBackoff === true);
  if (keys.length === 0) {
    throw new ProviderFailure(label, [{
      label: "-",
      kind: "fatal",
      status: 0,
      detail: vaultConfigured
        ? "no usable keys in vault (all exhausted, disabled, or cooling down)"
        : `key vault not configured and ${envKeyName(provider)} not set`,
    }]);
  }
  const model = modelFor(provider, opts);
  const keyFailures: KeyAttemptFailure[] = [];
  for (const key of keys) {
    if (Date.now() >= deadline) {
      keyFailures.push({
        label: key.label,
        kind: "transient",
        status: 0,
        detail: `election deadline (${ELECTION_DEADLINE_MS}ms) reached`,
      });
      break;
    }
    let retryCount = 0;
    let attempt = await attemptText(provider, key, systemPrompt, messages, opts, deadline);
    while (!attempt.ok) {
      const delay = transientRetryDelayMs(attempt.failure, retryCount, deadline);
      if (delay === null) break;
      retryCount++;
      if (delay > 0) await sleep(delay);
      attempt = await attemptText(provider, key, systemPrompt, messages, opts, deadline);
    }
    if (attempt.ok) {
      const ms = Math.round(performance.now() - t0);
      recordSuccess(label, ms);
      await recordAttempt(ctx, label, key, "success", "", feature, model, attempt.usageMeta);
      return { text: attempt.text, provider: label, keyLabel: key.label, latency: ms };
    }
    keyFailures.push(attempt.failure);
    await recordAttempt(ctx, label, key, attempt.failure.kind, attempt.failure.detail, feature, model);
  }
  const ms = Math.round(performance.now() - t0);
  recordError(label, keyFailures.map((k) => k.detail).join("; ").slice(0, 200), ms);
  throw new ProviderFailure(label, keyFailures);
}

export interface StreamSuccess {
  stream: ReadableStream<Uint8Array>;
  provider: string;
  keyLabel: string;
  key: ResolvedKey;
}

async function runProviderStream(
  ctx: RouterContext,
  provider: VaultProvider,
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts,
  signal: AbortSignal,
  feature: string,
  deadline: number
): Promise<StreamSuccess> {
  const label = providerLabel(provider);
  if (!shouldTryProvider(label)) {
    throw new ProviderFailure(label, [{ label: "-", kind: "transient", status: 0, detail: "provider in backoff" }]);
  }
  if (Date.now() >= deadline) {
    throw new ProviderFailure(label, [{
      label: "-",
      kind: "transient",
      status: 0,
      detail: `election deadline (${ELECTION_DEADLINE_MS}ms) reached`,
    }]);
  }
  const { keys, vaultConfigured } = await resolveKeys(ctx, provider);
  if (keys.length === 0) {
    throw new ProviderFailure(label, [{
      label: "-",
      kind: "fatal",
      status: 0,
      detail: vaultConfigured
        ? "no usable keys in vault (all exhausted, disabled, or cooling down)"
        : `key vault not configured and ${envKeyName(provider)} not set`,
    }]);
  }
  const model = modelFor(provider, opts);
  const keyFailures: KeyAttemptFailure[] = [];
  for (const key of keys) {
    if (Date.now() >= deadline) {
      keyFailures.push({
        label: key.label,
        kind: "transient",
        status: 0,
        detail: `election deadline (${ELECTION_DEADLINE_MS}ms) reached`,
      });
      break;
    }
    let retryCount = 0;
    let attempt = await attemptStream(provider, key, systemPrompt, messages, opts, signal, deadline);
    while (!attempt.ok) {
      const delay = transientRetryDelayMs(attempt.failure, retryCount, deadline);
      if (delay === null) break;
      retryCount++;
      if (delay > 0) await sleep(delay);
      attempt = await attemptStream(provider, key, systemPrompt, messages, opts, signal, deadline);
    }
    if (attempt.ok) {
      recordSuccess(label, 0);
      await recordAttempt(ctx, label, key, "success", "", feature, model);
      return { stream: attempt.stream, provider: label, keyLabel: key.label, key };
    }
    keyFailures.push(attempt.failure);
    await recordAttempt(ctx, label, key, attempt.failure.kind, attempt.failure.detail, feature, model);
  }
  recordError(label, keyFailures.map((k) => k.detail).join("; ").slice(0, 200), 0);
  throw new ProviderFailure(label, keyFailures);
}

// ============================================================
// Public non-streaming API — race providers, first text wins.
// ============================================================

export async function routerText(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts = {},
  ctx: RouterContext = loadRouterContext()
): Promise<ProviderSuccess> {
  // Attachments REQUIRE Gemini (vision). Without attachments, race all providers.
  if (hasAttachment(messages)) {
    return geminiFirstScope(ctx, systemPrompt, messages, opts);
  }
  const deadline = Date.now() + ELECTION_DEADLINE_MS;
  const settled = await Promise.allSettled(
    PROVIDER_ORDER.map((p) => runProviderText(ctx, p, systemPrompt, messages, opts, "ai-router", deadline))
  );
  for (const s of settled) {
    if (s.status === "fulfilled") {
      console.log(`[Router] ${s.value.provider} responded in ${s.value.latency}ms`);
      return s.value;
    }
  }
  const reasons = settled
    .filter((s): s is PromiseRejectedResult => s.status === "rejected")
    .map((s) => (s.reason instanceof ProviderFailure ? s.reason.message : String(s.reason)))
    .join(" | ");
  throw new Error(`All AI providers failed (${reasons})`);
}

async function geminiFirstScope(
  ctx: RouterContext,
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts
): Promise<ProviderSuccess> {
  const deadline = Date.now() + ELECTION_DEADLINE_MS;
  try {
    return await runProviderText(ctx, "gemini", systemPrompt, messages, opts, "ai-router", deadline);
  } catch (err) {
    console.warn("[Router] Gemini failed for attachment request, falling back to text-only providers");
    const textOnly = stripAttachments(messages);
    const settled = await Promise.allSettled(
      (["groq", "nvidia"] as VaultProvider[]).map((p) => runProviderText(ctx, p, systemPrompt, textOnly, opts, "ai-router", deadline))
    );
    for (const s of settled) {
      if (s.status === "fulfilled") return s.value;
    }
    const reasons = settled
      .filter((s): s is PromiseRejectedResult => s.status === "rejected")
      .map((s) => (s.reason instanceof ProviderFailure ? s.reason.message : String(s.reason)))
      .join(" | ");
    throw new Error(`All AI providers failed for attachment request (Gemini: ${err instanceof ProviderFailure ? err.message : String(err)} | ${reasons})`);
  }
}

export async function routerJSON(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts = {},
  ctx: RouterContext = loadRouterContext()
): Promise<unknown> {
  const { text } = await routerText(systemPrompt, messages, { ...opts, json: true }, ctx);
  return JSON.parse(text) as unknown;
}

// ============================================================
// Public streaming API — sequential providers (no wasted calls).
// The final SSE error names EVERY provider and key reason.
// ============================================================

const encoder = new TextEncoder();

function hasAttachment(messages: RouterMessage[]): boolean {
  return messages.some((m) => m.attachment?.base64 != null);
}

function stripAttachments(messages: RouterMessage[]): RouterMessage[] {
  return messages.map((m) => {
    const { attachment: _attachment, ...rest } = m;
    return rest;
  });
}

function sseError(message: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`);
}

function sseDone(): Uint8Array {
  return encoder.encode("data: [DONE]\n\n");
}

function sseChoices(content: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
}

async function readWithIdleTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  ms: number
): Promise<ReadableStreamReadResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const readPromise = reader.read();
  // Guard against a late rejection of the abandoned read after we time out
  // (an unhandled rejection can kill the edge-function isolate).
  readPromise.catch(() => {});
  try {
    return await Promise.race([
      readPromise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`stream stalled (no data for ${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function pipeProviderStream(
  entry: StreamSuccess,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  const reader = entry.stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await readWithIdleTimeout(reader, STREAM_IDLE_TIMEOUT_MS);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const delta = parseSSEDelta(line);
        if (delta) controller.enqueue(sseChoices(delta));
      }
    }
    controller.enqueue(sseDone());
    controller.close();
  } catch (err) {
    try {
      await reader.cancel();
    } catch {
      // already closed — nothing to do
    }
    controller.enqueue(sseError(`Stream failed (${entry.provider}): ${err}`));
    controller.enqueue(sseDone());
    controller.close();
  }
}

export async function routerStream(
  systemPrompt: string,
  messages: RouterMessage[],
  opts: RouterOpts = {},
  ctx: RouterContext = loadRouterContext(),
  strict = false
): Promise<ReadableStream<Uint8Array>> {
  const providers: VaultProvider[] = hasAttachment(messages) ? ["gemini"] : PROVIDER_ORDER;
  const deadline = Date.now() + ELECTION_DEADLINE_MS;
  const failures: string[] = [];

  for (const provider of providers) {
    const ac = new AbortController();
    try {
      const entry = await runProviderStream(ctx, provider, systemPrompt, messages, opts, ac.signal, "ai-router-stream", deadline);
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          await pipeProviderStream(entry, controller);
        },
      });
    } catch (err) {
      ac.abort();
      failures.push(err instanceof ProviderFailure ? err.message : String(err));
    }
  }

  if (hasAttachment(messages)) {
    // Gemini (vision) failed — fall back to text-only providers.
    const textOnly = stripAttachments(messages);
    for (const provider of ["groq", "nvidia"] as VaultProvider[]) {
      const ac = new AbortController();
      try {
        const entry = await runProviderStream(ctx, provider, systemPrompt, textOnly, opts, ac.signal, "ai-router-stream", deadline);
        return new ReadableStream<Uint8Array>({
          async start(controller) {
            await pipeProviderStream(entry, controller);
          },
        });
      } catch (err) {
        ac.abort();
        failures.push(err instanceof ProviderFailure ? err.message : String(err));
      }
    }
  }

  const summary = `All AI providers unavailable for streaming (${failures.join(" | ") || "no providers attempted"})`;
  console.error(`[Router] ${summary}`);
  // strict callers (e.g. chat-proxy's non-streaming fallback) want the failure
  // as an exception so they can try an alternative before formatting SSE.
  if (strict) throw new Error(summary);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sseError(summary));
      controller.enqueue(sseDone());
      controller.close();
    },
  });
}

// ============================================================
// Key validation (used by admin "test key") — tiny live call.
// ============================================================

export interface KeyValidation {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  error?: string;
}

export async function validateKey(
  provider: VaultProvider,
  apiKey: string,
  model?: string
): Promise<KeyValidation> {
  const t0 = performance.now();
  const opts: RouterOpts = model ? { model, maxTokens: 16 } : { maxTokens: 16 };
  const resolved: ResolvedKey = { keyId: null, label: "test", apiKey, fromEnv: true };
  const attempt = await attemptText(provider, resolved, "Reply with: ok", [{ role: "user", content: "Reply with: ok" }], opts);
  const ms = Math.round(performance.now() - t0);
  if (attempt.ok) {
    return { ok: true, provider: providerLabel(provider), model: modelFor(provider, opts), latencyMs: ms };
  }
  return {
    ok: false,
    provider: providerLabel(provider),
    model: modelFor(provider, opts),
    latencyMs: ms,
    error: `[${attempt.failure.kind}] ${attempt.failure.detail}`,
  };
}
