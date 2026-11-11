/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER_EMAIL = "abdulrazaqafolarin@gmail.com";
const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

// Best-effort brute-force throttle (per warm isolate): 10 validation attempts
// per user per minute. Durable account security remains in the database.
const attemptBuckets = new Map<string, { count: number; resetAt: number }>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const { code, action, count, duration_days, target_email } = body ?? {};
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey || !anonKey) {
      return json({ error: "Activation service is temporarily unavailable" }, 503);
    }

    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid authentication" }, 401);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (callerProfileError) return json({ error: "Could not verify account permissions" }, 503);

    const isOwnerAdmin =
      user.email?.trim().toLowerCase() === OWNER_EMAIL &&
      callerProfile?.is_admin === true;

    if (action === "validate") {
      if (!code || typeof code !== "string") return json({ error: "Activation code is required" }, 400);

      const nowMs = Date.now();
      const bucket = attemptBuckets.get(user.id);
      if (bucket && bucket.resetAt > nowMs && bucket.count >= 10) {
        return json({ error: "Too many attempts. Please wait a minute and try again." }, 429);
      }
      if (!bucket || bucket.resetAt <= nowMs) attemptBuckets.set(user.id, { count: 1, resetAt: nowMs + 60_000 });
      else bucket.count += 1;
      if (attemptBuckets.size > 5_000) {
        for (const [id, entry] of attemptBuckets) if (entry.resetAt <= nowMs) attemptBuckets.delete(id);
      }

      const normalizedCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
        return json({ error: "Invalid code format. Use format: XXXX-XXXX-XXXX" }, 400);
      }

      const { data, error } = await admin.rpc("consume_activation_code", {
        p_code: normalizedCode,
        p_user_id: user.id,
      });
      if (error) return json({ error: "Could not activate this code. Please contact the administrator." }, 500);
      return json(data);
    }

    if (action === "check-status") {
      const { data: profile, error } = await admin
        .from("profiles")
        .select("is_activated, is_admin, subscription_started_at, subscription_expires_at, subscription_duration_days")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return json({ error: "Could not check subscription status" }, 503);
      return json({
        is_activated: profile?.is_activated ?? false,
        is_admin: isOwnerAdmin,
        subscription_started_at: profile?.subscription_started_at ?? null,
        subscription_expires_at: profile?.subscription_expires_at ?? null,
        subscription_duration_days: profile?.subscription_duration_days ?? null,
      });
    }

    if (action === "generate-codes") {
      if (!isOwnerAdmin) return json({ error: "Only the established administrator can generate activation codes" }, 403);
      const days = Number(duration_days);
      if (![7, 30, 90].includes(days)) return json({ error: "Choose a 7-day, 30-day, or 90-day subscription" }, 400);
      const requestedCount = Math.min(Math.max(Number(count) || 1, 1), 100);
      const { data, error } = await admin.rpc("generate_activation_codes", {
        p_created_by: user.id,
        p_count: requestedCount,
        p_duration_days: days,
      });
      if (error) return json({ error: error.message || "Failed to generate codes" }, 500);
      return json({ success: true, codes: data ?? [] });
    }

    if (action === "assign-subscription") {
      if (!isOwnerAdmin) return json({ error: "Only the established administrator can assign subscriptions" }, 403);
      if (typeof target_email !== "string" || !target_email.trim()) {
        return json({ error: "Enter the user's account email" }, 400);
      }
      const days = Number(duration_days);
      if (![7, 30, 90].includes(days)) return json({ error: "Choose a 7-day, 30-day, or 90-day subscription" }, 400);
      if (target_email.trim().toLowerCase() === OWNER_EMAIL) {
        return json({ error: "The administrator account is not assigned paid terms" }, 400);
      }

      const { data: userPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return json({ error: "Could not look up that account" }, 503);
      const targetUser = userPage.users.find((candidate) =>
        candidate.email?.trim().toLowerCase() === target_email.trim().toLowerCase()
      );
      if (!targetUser) return json({ error: "No account was found for that email address" }, 404);

      const { data: targetProfile, error: profileError } = await admin
        .from("profiles")
        .select("subscription_started_at, subscription_expires_at")
        .eq("user_id", targetUser.id)
        .maybeSingle();
      if (profileError || !targetProfile) return json({ error: "Could not load the user's subscription record" }, 503);

      const now = new Date();
      const previousExpiry = targetProfile.subscription_expires_at
        ? new Date(targetProfile.subscription_expires_at)
        : null;
      const activeExpiry = previousExpiry && previousExpiry.getTime() > now.getTime() ? previousExpiry : null;
      const start = activeExpiry ?? now;
      const expiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          is_activated: true,
          trial_started_at: null,
          trial_expires_at: null,
          subscription_started_at: activeExpiry ? targetProfile.subscription_started_at ?? now.toISOString() : now.toISOString(),
          subscription_expires_at: expiry.toISOString(),
          subscription_duration_days: days,
        })
        .eq("user_id", targetUser.id);
      if (updateError) return json({ error: "Could not assign this subscription" }, 500);

      return json({
        success: true,
        email: targetUser.email,
        duration_days: days,
        subscription_expires_at: expiry.toISOString(),
      });
    }

    if (action === "list-codes") {
      if (!isOwnerAdmin) return json({ error: "Admin access required" }, 403);
      const { data: codes, error } = await admin
        .from("activation_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: "Failed to list activation codes" }, 500);

      const enriched = codes || [];
      const usedUserIds = enriched.filter((c: any) => c.used_by).map((c: any) => c.used_by);
      if (usedUserIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", usedUserIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
        return json({
          codes: enriched.map((c: any) => ({
            ...c,
            used_by_profile: c.used_by ? profileMap[c.used_by] || null : null,
          })),
        });
      }
      return json({ codes: enriched });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[validate-activation]", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
