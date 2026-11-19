/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const attemptBuckets = new Map<string, { count: number; resetAt: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    const { code, action, count, duration_days, exam_program_id } = await req.json();
    const programId = exam_program_id === undefined ? "jupeb" : exam_program_id;
    if (programId !== "jupeb" && programId !== "jamb") {
      return new Response(JSON.stringify({ error: "Choose JUPEB or JAMB / UTME." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Activation service is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authHeader.slice(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "validate") {
      const nowMs = Date.now();
      const bucket = attemptBuckets.get(user.id);
      if (bucket && bucket.resetAt > nowMs && bucket.count >= 10) {
        return new Response(JSON.stringify({ error: "Too many attempts. Please wait a minute and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!bucket || bucket.resetAt <= nowMs) attemptBuckets.set(user.id, { count: 1, resetAt: nowMs + 60_000 });
      else bucket.count += 1;
      if (attemptBuckets.size > 5000) {
        for (const [id, entry] of attemptBuckets) if (entry.resetAt <= nowMs) attemptBuckets.delete(id);
      }

      if (typeof code !== "string" || !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase())) {
        return new Response(JSON.stringify({ error: "Invalid code format. Use XXXX-XXXX-XXXX." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.rpc("consume_activation_code", {
        p_code: code.trim().toUpperCase(),
        p_user_id: user.id,
        p_exam_program_id: programId,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "check-status") {
      const [{ data: profile }, { data: entitlement }] = await Promise.all([
        supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle(),
        supabase.from("exam_program_entitlements").select("trial_expires_at,subscription_expires_at")
          .eq("user_id", user.id).eq("exam_program_id", programId).maybeSingle(),
      ]);
      return new Response(JSON.stringify({
        is_admin: profile?.is_admin ?? false,
        trial_expires_at: entitlement?.trial_expires_at ?? null,
        subscription_expires_at: entitlement?.subscription_expires_at ?? null,
        exam_program_id: programId,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate-codes") {
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("is_admin").eq("user_id", user.id).single();
      if (profileError || !profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const safeCount = Number.isInteger(count) ? Math.min(Math.max(Number(count), 1), 100) : 1;
      const days = Number(duration_days);
      if (![7, 30, 90].includes(days)) {
        return new Response(JSON.stringify({ error: "Choose a 7-day, 30-day, or 90-day subscription." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.rpc("generate_activation_codes", {
        p_count: safeCount,
        p_duration_days: days,
        p_exam_program_id: programId,
        p_created_by: user.id,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, codes: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list-codes") {
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("is_admin").eq("user_id", user.id).single();
      if (profileError || !profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: codes, error } = await supabase.from("activation_codes")
        .select("id,code,plan_type,duration_days,exam_program_id,is_used,used_by,used_at,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const usedIds = (codes ?? []).flatMap((row) => row.used_by ? [row.used_by] : []);
      let enriched = codes ?? [];
      if (usedIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id,display_name").in("user_id", usedIds);
        const byId = Object.fromEntries((profiles ?? []).map((row) => [row.user_id, row]));
        enriched = enriched.map((row) => ({ ...row, used_by_profile: row.used_by ? byId[row.used_by] ?? null : null }));
      }
      return new Response(JSON.stringify({ codes: enriched }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[validate-activation]", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
