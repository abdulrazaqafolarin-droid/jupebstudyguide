import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER_EMAIL = "abdulrazaqafolarin@gmail.com";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Session protection is unavailable" }, 503);

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "Your session is no longer valid. Please sign in again." }, 401);

  // Fail closed if this exact Supabase session has already been revoked.
  const { data: sessionIsActive, error: sessionError } = await userClient.rpc("current_auth_session_is_active");
  if (sessionError) return json({ error: "Could not verify this device session. Please retry." }, 503);
  if (sessionIsActive !== true) return json({ error: "This account was signed in on another device. Please sign in again." }, 401);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) return json({ error: "Could not verify account permissions." }, 503);

  // Only the single established owner account is exempt from single-device
  // enforcement. A profile flag alone never grants an exemption.
  if (user.email?.trim().toLowerCase() === OWNER_EMAIL && profile?.is_admin === true) {
    return json({ success: true, admin: true, device_limit: "unlimited" });
  }

  // Enforce MFA at the server boundary as well as in the app. Never revoke
  // another device while this login is still at AAL1 and must reach AAL2.
  const { data: assurance, error: assuranceError } =
    await userClient.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (assuranceError) {
    return json({ error: "Could not verify multi-factor authentication. Please retry." }, 503);
  }
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    return json({ error: "Complete multi-factor authentication before securing this device." }, 403);
  }

  const { error: revokeError } = await admin.auth.admin.signOut(token, "others");
  if (revokeError) {
    console.error("[enforce-single-session] could not revoke old sessions:", revokeError.message);
    return json({ error: "Could not secure this account on this device. Please try again." }, 503);
  }

  return json({ success: true, admin: false, device_limit: 1 });
});
