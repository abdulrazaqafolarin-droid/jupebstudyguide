/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkAuthSessionActive } from "../_shared/auth-session.ts";

const OWNER_EMAIL = "abdulrazaqafolarin@gmail.com";
const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Best-effort brute-force throttle (per warm isolate): 10 validation attempts
// per user per minute. Durable account/session checks remain in the database.
const attemptBuckets = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const rawBody: unknown = await req.json();
    const body = rawBody && typeof rawBody === "object"
      ? rawBody as Record<string, unknown>
      : {};
    const { code, action, count, duration_days, target_email } = body;
    // Requests from the existing JUPEB client remain JUPEB-scoped by default.
    const examProgramId = body.exam_program_id === undefined ? "jupeb" : body.exam_program_id;
    if (examProgramId !== "jupeb" && examProgramId !== "jamb") {
      return json({ error: "Choose JUPEB or JAMB / UTME." }, 400);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Activation service is temporarily unavailable" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return json({ error: "Invalid authentication" }, 401);

    const sessionActive = await checkAuthSessionActive(supabaseUrl, anonKey, token);
    if (sessionActive !== true) {
      return json(
        {
          error: sessionActive === false
            ? "This device session is no longer active. Please sign in again."
            : "Could not verify this device session.",
        },
        sessionActive === false ? 401 : 503,
      );
    }

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("is_admin, is_activated, subscription_started_at, subscription_expires_at, subscription_duration_days")
      .eq("user_id", user.id)
      .maybeSingle();
    if (callerProfileError || !callerProfile) {
      return json({ error: "Could not verify account permissions" }, 503);
    }

    const isOwnerAdmin =
      user.email?.trim().toLowerCase() === OWNER_EMAIL &&
      callerProfile.is_admin === true;

    if (action === "validate") {
      if (typeof code !== "string") return json({ error: "Activation code is required" }, 400);

      const nowMs = Date.now();
      const bucket = attemptBuckets.get(user.id);
      if (bucket && bucket.resetAt > nowMs && bucket.count >= 10) {
        return json({ error: "Too many attempts. Please wait a minute and try again." }, 429);
      }
      if (!bucket || bucket.resetAt <= nowMs) {
        attemptBuckets.set(user.id, { count: 1, resetAt: nowMs + 60_000 });
      } else {
        bucket.count += 1;
      }
      if (attemptBuckets.size > 5_000) {
        for (const [id, entry] of attemptBuckets) {
          if (entry.resetAt <= nowMs) attemptBuckets.delete(id);
        }
      }

      const normalizedCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
        return json({ error: "Invalid code format. Use format: XXXX-XXXX-XXXX" }, 400);
      }

      const { data, error } = await admin.rpc("consume_activation_code", {
        p_code: normalizedCode,
        p_user_id: user.id,
        p_exam_program_id: examProgramId,
      });
      if (error) return json({ error: "Could not activate this code. Please contact the administrator." }, 500);
      return json(data);
    }

    if (action === "check-status") {
      const [{ data: entitlement, error: entitlementError }, { data: profile, error: profileError }] = await Promise.all([
        admin.from("exam_program_entitlements")
          .select("trial_started_at, trial_expires_at, subscription_started_at, subscription_expires_at, subscription_duration_days")
          .eq("user_id", user.id)
          .eq("exam_program_id", examProgramId)
          .maybeSingle(),
        admin.from("profiles")
          .select("is_activated, is_admin")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (entitlementError || profileError) return json({ error: "Could not check programme access" }, 503);
      return json({
        is_activated: profile?.is_activated ?? false,
        is_admin: isOwnerAdmin,
        trial_started_at: entitlement?.trial_started_at ?? null,
        trial_expires_at: entitlement?.trial_expires_at ?? null,
        subscription_started_at: entitlement?.subscription_started_at ?? null,
        subscription_expires_at: entitlement?.subscription_expires_at ?? null,
        subscription_duration_days: entitlement?.subscription_duration_days ?? null,
        exam_program_id: examProgramId,
      });
    }

    if (action === "generate-codes") {
      if (!isOwnerAdmin) return json({ error: "Only the established administrator can generate activation codes" }, 403);
      const days = Number(duration_days);
      if (![7, 30, 90].includes(days)) {
        return json({ error: "Choose a 7-day, 30-day, or 90-day subscription" }, 400);
      }
      const safeCount = Number.isInteger(Number(count))
        ? Math.min(Math.max(Number(count), 1), 100)
        : 1;
      const { data, error } = await admin.rpc("generate_activation_codes", {
        p_created_by: user.id,
        p_count: safeCount,
        p_duration_days: days,
        p_exam_program_id: examProgramId,
      });
      if (error) return json({ error: error.message || "Failed to generate codes" }, 500);
      return json({ success: true, codes: data ?? [] });
    }

    // Retain the previously deployed admin assignment action, but write to the
    // new programme-scoped entitlement record so it actually grants access.
    if (action === "assign-subscription") {
      if (!isOwnerAdmin) return json({ error: "Only the established administrator can assign subscriptions" }, 403);
      if (typeof target_email !== "string" || !target_email.trim()) {
        return json({ error: "Enter the user's account email" }, 400);
      }
      const days = Number(duration_days);
      if (![7, 30, 90].includes(days)) {
        return json({ error: "Choose a 7-day, 30-day, or 90-day subscription" }, 400);
      }
      if (target_email.trim().toLowerCase() === OWNER_EMAIL) {
        return json({ error: "The administrator account is not assigned paid terms" }, 400);
      }

      const { data: userPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return json({ error: "Could not look up that account" }, 503);
      const targetUser = userPage.users.find((candidate) =>
        candidate.email?.trim().toLowerCase() === target_email.trim().toLowerCase()
      );
      if (!targetUser) return json({ error: "No account was found for that email address" }, 404);

      const { data: existing, error: existingError } = await admin
        .from("exam_program_entitlements")
        .select("subscription_started_at, subscription_expires_at")
        .eq("user_id", targetUser.id)
        .eq("exam_program_id", examProgramId)
        .maybeSingle();
      if (existingError) return json({ error: "Could not load the user's programme entitlement" }, 503);

      const now = new Date();
      const previousExpiry = existing?.subscription_expires_at
        ? new Date(existing.subscription_expires_at)
        : null;
      const activeExpiry = previousExpiry && previousExpiry.getTime() > now.getTime()
        ? previousExpiry
        : null;
      const start = activeExpiry ?? now;
      const startIso = activeExpiry
        ? existing?.subscription_started_at ?? now.toISOString()
        : now.toISOString();
      const expiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      const expiryIso = expiry.toISOString();

      const { error: entitlementError } = await admin
        .from("exam_program_entitlements")
        .upsert({
          user_id: targetUser.id,
          exam_program_id: examProgramId,
          trial_started_at: null,
          trial_expires_at: null,
          subscription_started_at: startIso,
          subscription_expires_at: expiryIso,
          subscription_duration_days: days,
          updated_at: now.toISOString(),
        }, { onConflict: "user_id,exam_program_id" });
      if (entitlementError) return json({ error: "Could not assign this programme subscription" }, 500);

      // Keep legacy profile fields in sync for older JUPEB account screens.
      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({
          is_activated: true,
          trial_started_at: null,
          trial_expires_at: null,
          subscription_started_at: startIso,
          subscription_expires_at: expiryIso,
          subscription_duration_days: days,
        })
        .eq("user_id", targetUser.id);
      if (profileUpdateError) return json({ error: "Subscription saved but legacy profile sync failed" }, 500);

      return json({
        success: true,
        email: targetUser.email,
        exam_program_id: examProgramId,
        duration_days: days,
        subscription_expires_at: expiryIso,
      });
    }

    if (action === "list-codes") {
      if (!isOwnerAdmin) return json({ error: "Admin access required" }, 403);
      const { data: codes, error } = await admin
        .from("activation_codes")
        .select("id,code,plan_type,duration_days,exam_program_id,is_used,used_by,used_at,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: "Failed to list activation codes" }, 500);

      const usedUserIds = (codes ?? []).flatMap((row) => row.used_by ? [row.used_by] : []);
      let enriched = codes ?? [];
      if (usedUserIds.length) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", usedUserIds);
        const byId = Object.fromEntries((profiles ?? []).map((row) => [row.user_id, row]));
        enriched = enriched.map((row) => ({
          ...row,
          used_by_profile: row.used_by ? byId[row.used_by] ?? null : null,
        }));
      }
      return json({ codes: enriched });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[validate-activation]", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
