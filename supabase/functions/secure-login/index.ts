import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function keyedHash(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Login service is temporarily unavailable" }, 503);

  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return json({ error: "Email and password are required" }, 400);
  }

  // Supabase's edge gateway supplies x-real-ip; do not trust a client-provided
  // X-Forwarded-For chain. Missing IP fails into a shared conservative bucket.
  const clientIp = req.headers.get("x-real-ip")?.trim() || "unknown";
  const [accountHash, ipHash] = await Promise.all([
    sha256(`account:${email}`),
    sha256(`ip:${clientIp}`),
  ]);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: gate, error: gateError } = await admin.rpc("check_login_allowed", {
    p_account_hash: accountHash,
    p_ip_hash: ipHash,
  });
  if (gateError) return json({ error: "Login protection is temporarily unavailable" }, 503);
  if (!gate?.allowed) {
    const retry = Math.max(1, Number(gate.retry_after) || 60);
    return new Response(JSON.stringify({
      error: gate.reason === "account_locked"
        ? "Too many unsuccessful attempts. This account is temporarily locked."
        : "Too many login attempts from this network. Please try again later.",
      retryAfter: retry,
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": String(retry) },
    });
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const authBody = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      const { error: recordError } = await admin.rpc("record_login_failure", {
        p_account_hash: accountHash,
        p_ip_hash: ipHash,
      });
      if (recordError) return json({ error: "Login protection is temporarily unavailable" }, 503);
      // Keep invalid-email and invalid-password responses indistinguishable.
      return json({ error: authResponse.status === 429
        ? "Too many login attempts. Please try again later."
        : "Invalid email or password." }, authResponse.status === 429 ? 429 : 401);
    }

    // Clear only this account's lockout. Keep the shared IP failure counter
    // so successful sign-ins for another account cannot reset network limits.
    await admin.from("login_security_counters").delete()
      .eq("scope", "account").eq("subject_hash", accountHash);
    return json(authBody, 200);
  } catch {
    return json({ error: "Unable to reach the login service. Please try again." }, 503);
  }
});
