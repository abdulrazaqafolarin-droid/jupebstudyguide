// Bundled edge function - all local imports inlined
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2"

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


// === index.ts ===

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only allow service_role key -- never expose this to anon/public users
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !serviceRoleKey || authHeader.replace("Bearer ", "") !== serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Internal service only" }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const encryptionSecret = Deno.env.get("KEY_ENCRYPTION_SECRET");

  if (!encryptionSecret) {
    return new Response(
      JSON.stringify({ error: "KEY_ENCRYPTION_SECRET not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const { data, error } = await supabase
      .from("ai_api_keys")
      .select("id, label, encrypted_key")
      .eq("is_active", true)
      .eq("token_exhausted", false)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error("[get-active-key] No keys available:", error?.message || "no keys found");
      return new Response(
        JSON.stringify({ error: "no_keys_available" }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await decryptApiKey(data.encrypted_key, encryptionSecret);

    return new Response(
      JSON.stringify({ keyId: data.id, apiKey, label: data.label }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-active-key] Error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
