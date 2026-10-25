import { createClient } from "npm:@supabase/supabase-js@2";

const PBKDF2_SALT = "ai-key-vault-salt-v1";

// ============================================================
// AES-256-GCM Encryption (Web Crypto API — works in Deno)
// The live ai_api_keys.api_key column holds the encrypted blob.
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
// Multi-provider key pool with cooldown auto-recovery.
// A key is usable when: is_active AND NOT token_exhausted AND
// (cooldown_until IS NULL OR cooldown_until <= now).
// Transient failures set a short cooldown (auto-recover).
// Repeated quota failures escalate to token_exhausted (manual reset).
// ============================================================

export type VaultProvider = "gemini" | "groq" | "nvidia";

export const VAULT_PROVIDERS: VaultProvider[] = ["gemini", "groq", "nvidia"];

export function isVaultProvider(value: unknown): value is VaultProvider {
  return value === "gemini" || value === "groq" || value === "nvidia";
}

export interface VaultKey {
  keyId: string;
  apiKey: string;
  label: string;
  provider: VaultProvider;
  priority: number;
}

interface VaultRow {
  id: string;
  label: string;
  api_key: string;
  provider: string;
  priority: number;
  cooldown_until: string | null;
}

const QUOTA_FAILURES_BEFORE_EXHAUSTED = 5;
const MAX_COOLDOWN_SECONDS = 24 * 3600;

function cooldownSecondsForQuotaFailures(consecutiveFailures: number): number {
  const next = consecutiveFailures + 1;
  return Math.min(300 * 2 ** (next - 1), MAX_COOLDOWN_SECONDS);
}

function toVaultKey(row: VaultRow, apiKey: string): VaultKey {
  return {
    keyId: row.id,
    apiKey,
    label: row.label,
    provider: isVaultProvider(row.provider) ? row.provider : "gemini",
    priority: row.priority,
  };
}

export async function getVaultKeys(
  supabaseUrl: string,
  supabaseKey: string,
  encryptionSecret: string,
  provider: VaultProvider,
  bypassCooldowns = false
): Promise<VaultKey[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_api_keys")
    .select("id, label, api_key, provider, priority, cooldown_until")
    .eq("provider", provider)
    .eq("is_active", true)
    .eq("token_exhausted", false)
    .order("priority", { ascending: true });

  if (error || !data) {
    console.error(`[KeyVault] No ${provider} keys available:`, error?.message || "no keys");
    return [];
  }

  const keys: VaultKey[] = [];
  for (const row of data as VaultRow[]) {
    // Transient cooldowns protect across requests; a deliberate same-request
    // retry (chat-proxy non-stream fallback) passes bypassCooldowns so keys
    // just exercised on the *streaming* endpoint can be tried on the
    // *non-streaming* one. is_active/token_exhausted filters always apply.
    if (!bypassCooldowns && row.cooldown_until && row.cooldown_until > now) continue;
    try {
      const apiKey = await decryptApiKey(row.api_key, encryptionSecret);
      if (!apiKey) throw new Error("decrypted to empty string");
      keys.push(toVaultKey(row, apiKey));
    } catch (err) {
      // A single corrupt row (e.g. plaintext stored by an old version)
      // must never take down the whole provider — record and skip.
      console.error(`[KeyVault] Skipping ${provider} key "${row.label}" (undecryptable):`, String(err).slice(0, 120));
      await supabase
        .from("ai_api_keys")
        .update({ last_error: "Stored value is not a valid encrypted key — delete and re-add this key." })
        .eq("id", row.id);
    }
  }
  return keys;
}

async function touchKey(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string,
  patch: Record<string, string | number | boolean | null>
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.from("ai_api_keys").update(patch).eq("id", keyId);
}

export async function recordKeySuccess(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string
): Promise<void> {
  await touchKey(supabaseUrl, supabaseKey, keyId, {
    consecutive_failures: 0,
    cooldown_until: null,
    last_error: null,
    last_used_at: new Date().toISOString(),
  });
}

export async function recordKeyQuotaFailure(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from("ai_api_keys")
    .select("consecutive_failures")
    .eq("id", keyId)
    .maybeSingle();
  const failures = ((data as { consecutive_failures?: number } | null)?.consecutive_failures ?? 0) + 1;
  const cooldownSeconds = cooldownSecondsForQuotaFailures(failures - 1);
  const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
  const patch: Record<string, string | number | boolean | null> = {
    consecutive_failures: failures,
    cooldown_until: cooldownUntil,
    last_error: errorMessage.slice(0, 300),
  };
  if (failures >= QUOTA_FAILURES_BEFORE_EXHAUSTED) {
    patch.token_exhausted = true;
    patch.exhausted_at = new Date().toISOString();
  }
  await supabase.from("ai_api_keys").update(patch).eq("id", keyId);
}

export async function recordKeyTransientFailure(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string,
  errorMessage: string
): Promise<void> {
  await touchKey(supabaseUrl, supabaseKey, keyId, {
    cooldown_until: new Date(Date.now() + 60 * 1000).toISOString(),
    last_error: errorMessage.slice(0, 300),
  });
}

export async function recordKeyFatalFailure(
  supabaseUrl: string,
  supabaseKey: string,
  keyId: string,
  errorMessage: string
): Promise<void> {
  // Auth/config errors (401/403/400/404): the key will keep failing until a
  // human intervenes, so park it briefly and surface the reason in the UI.
  await touchKey(supabaseUrl, supabaseKey, keyId, {
    cooldown_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    last_error: errorMessage.slice(0, 300),
  });
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
// Manual exhaustion controls (kept for the admin UI)
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
