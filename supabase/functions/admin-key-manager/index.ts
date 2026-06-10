import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptApiKey } from "../_shared/keyVault.ts";

/// DEPLOYMENT — FIRST-TIME SETUP
/// ==============================
/// After deploying this edge function, set KEY_ENCRYPTION_SECRET in Supabase secrets:
///   supabase secrets set KEY_ENCRYPTION_SECRET=$(openssl rand -hex 32)
/// This secret is used for AES-256-GCM encryption of API keys at rest.
/// If not set, ALL key management operations will fail with 500.
/// Also verify ADMIN_EMAIL is set in Supabase secrets:
///   supabase secrets set ADMIN_EMAIL=admin@yourdomain.com
/// ==============================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "";

type Action =
  | "check-setup"
  | "complete-setup"
  | "list-keys"
  | "add-key"
  | "update-key"
  | "delete-key"
  | "reset-exhausted"
  | "reset-all-exhausted"
  | "reorder-keys"
  | "get-usage-summary"
  | "get-recent-logs";

interface Payload {
  action: Action;
  label?: string;
  apiKey?: string;
  id?: string;
  priority?: number;
  is_active?: boolean;
  hard?: boolean;
  orderedIds?: string[];
  limit?: number;
  feature?: string;
  status?: string;
  adminEmail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Verify authentication via Supabase JWT
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

  // Verify admin email
  if (!user.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response(
      JSON.stringify({ error: "Admin access required" }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const encryptionSecret = Deno.env.get("KEY_ENCRYPTION_SECRET");
  if (!encryptionSecret) {
    return new Response(
      JSON.stringify({ error: "KEY_ENCRYPTION_SECRET not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: Payload = await req.json();
    const { action } = payload;

    switch (action) {
      case "check-setup":
        return handleCheckSetup(supabase);
      case "complete-setup":
        return handleCompleteSetup(supabase, payload.adminEmail || ADMIN_EMAIL);
      case "list-keys":
        return handleListKeys(supabase);
      case "add-key":
        return handleAddKey(supabase, encryptionSecret, payload);
      case "update-key":
        return handleUpdateKey(supabase, payload);
      case "delete-key":
        return handleDeleteKey(supabase, payload);
      case "reset-exhausted":
        return handleResetExhausted(supabase, payload);
      case "reset-all-exhausted":
        return handleResetAllExhausted(supabase);
      case "reorder-keys":
        return handleReorderKeys(supabase, payload);
      case "get-usage-summary":
        return handleGetUsageSummary(supabase);
      case "get-recent-logs":
        return handleGetRecentLogs(supabase, payload);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("[admin-key-manager] Error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

// ---- Handlers ----

async function handleCheckSetup(supabase: ReturnType<typeof createClient>) {
  const { count, error } = await supabase
    .from("ai_api_keys")
    .select("*", { count: "exact", head: true });

  return new Response(
    JSON.stringify({
      setupComplete: !error && (count ?? 0) > 0,
      adminEmail: ADMIN_EMAIL || null,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleCompleteSetup(
  supabase: ReturnType<typeof createClient>,
  adminEmail: string
) {
  return new Response(
    JSON.stringify({ success: true, adminEmail }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleListKeys(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("ai_api_keys")
    .select("id, label, key_preview, priority, is_active, token_exhausted, total_requests, total_tokens_used, last_used_at, exhausted_at, created_at")
    .order("priority", { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ keys: data }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleAddKey(
  supabase: ReturnType<typeof createClient>,
  encryptionSecret: string,
  payload: Payload
) {
  if (!payload.label || !payload.apiKey) {
    return new Response(
      JSON.stringify({ error: "label and apiKey are required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const encrypted = await encryptApiKey(payload.apiKey, encryptionSecret);
  const preview = payload.apiKey.slice(-4);

  // Auto-assign priority if not given
  let priority = payload.priority;
  if (!priority) {
    const { data: maxKey } = await supabase
      .from("ai_api_keys")
      .select("priority")
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();
    priority = (maxKey?.priority ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("ai_api_keys")
    .insert({
      label: payload.label,
      encrypted_key: encrypted,
      key_preview: `••••••••••••${preview}`,
      priority,
    })
    .select("id, label, key_preview, priority, is_active, token_exhausted, total_requests, total_tokens_used, last_used_at, exhausted_at, created_at")
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ key: data }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleUpdateKey(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
) {
  if (!payload.id) {
    return new Response(
      JSON.stringify({ error: "id is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const updates: Record<string, unknown> = {};
  if (payload.label !== undefined) updates.label = payload.label;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("ai_api_keys")
    .update(updates)
    .eq("id", payload.id)
    .select("id, label, key_preview, priority, is_active, token_exhausted, total_requests, total_tokens_used, last_used_at, exhausted_at, created_at")
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ key: data }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleDeleteKey(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
) {
  if (!payload.id) {
    return new Response(
      JSON.stringify({ error: "id is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const { error } = await supabase
    .from("ai_api_keys")
    .delete()
    .eq("id", payload.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleResetExhausted(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
) {
  if (!payload.id) {
    return new Response(
      JSON.stringify({ error: "id is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("ai_api_keys")
    .update({ token_exhausted: false, exhausted_at: null })
    .eq("id", payload.id)
    .select("id, label, key_preview, priority, is_active, token_exhausted, total_requests, total_tokens_used, last_used_at, exhausted_at, created_at")
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ key: data }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleResetAllExhausted(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("ai_api_keys")
    .update({ token_exhausted: false, exhausted_at: null })
    .eq("token_exhausted", true)
    .select("id");

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ resetCount: data?.length ?? 0 }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleReorderKeys(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
) {
  if (!payload.orderedIds || !Array.isArray(payload.orderedIds)) {
    return new Response(
      JSON.stringify({ error: "orderedIds array is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  for (let i = 0; i < payload.orderedIds.length; i++) {
    const { error } = await supabase
      .from("ai_api_keys")
      .update({ priority: i + 1 })
      .eq("id", payload.orderedIds[i]);

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to reorder key ${payload.orderedIds[i]}: ${error.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleGetUsageSummary(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc("get_ai_usage_summary", {
    p_admin_email: ADMIN_EMAIL,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleGetRecentLogs(
  supabase: ReturnType<typeof createClient>,
  payload: Payload
) {
  let query = supabase
    .from("ai_usage_log")
    .select(`
      id, key_id, feature, prompt_tokens, completion_tokens, total_tokens, model, status, error_message, created_at,
      ai_api_keys!inner(label)
    `)
    .order("created_at", { ascending: false })
    .limit(payload.limit ?? 50);

  if (payload.feature) {
    query = query.eq("feature", payload.feature);
  }
  if (payload.status) {
    query = query.eq("status", payload.status);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ logs: data }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}
