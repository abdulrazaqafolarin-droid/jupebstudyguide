import { createClient } from "npm:@supabase/supabase-js@2";

export interface ActiveKeyResult {
  keyId: string;
  apiKey: string;
  label: string;
}

export async function getActiveGeminiKey(
  supabaseUrl: string,
  supabaseKey: string,
  excludeKeyIds: string[] = [],
): Promise<ActiveKeyResult | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let query = supabase
    .from("ai_api_keys")
    .select("id, label, api_key")
    .eq("is_active", true)
    .eq("token_exhausted", false)
    .order("priority", { ascending: true });

  if (excludeKeyIds.length > 0) {
    query = query.not("id", "in", `(${excludeKeyIds.map(id => `"${id}"`).join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[KeyVault] Error fetching keys:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.error("[KeyVault] No active keys available");
    return null;
  }

  const idx = Math.floor(Math.random() * data.length);
  const key = data[idx];
  return { keyId: key.id, apiKey: key.api_key, label: key.label };
}

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
