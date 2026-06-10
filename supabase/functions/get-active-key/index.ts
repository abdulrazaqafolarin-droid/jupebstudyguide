import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptApiKey } from "../_shared/keyVault.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only allow service_role key — never expose this to anon/public users
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
