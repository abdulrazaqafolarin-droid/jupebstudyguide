import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPreviousCompletedWeek(now: Date) {
  // Use UTC, matching the database function and the Monday 01:00 UTC cron.
  const currentWeekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const daysSinceMonday = (currentWeekStart.getUTCDay() + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysSinceMonday);

  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);

  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1);

  return {
    startDate: previousWeekStart.toISOString().slice(0, 10),
    endDate: previousWeekEnd.toISOString().slice(0, 10),
    startIso: previousWeekStart.toISOString(),
    endExclusiveIso: currentWeekStart.toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Weekly reset service configuration is missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fail closed: require service_role key or a valid admin user JWT.
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.slice("Bearer ".length);
    if (token !== supabaseKey) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Unable to verify admin access: ${profileError.message}`);
      }

      if (!profile?.is_admin && user.email !== Deno.env.get("ADMIN_EMAIL")) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Keep one source of truth: the database function calculates the previous
    // completed UTC week, locks it, records its champion and writes the badge.
    const { error: processError } = await supabase.rpc("auto_weekly_champion");
    if (processError) {
      throw new Error(`Failed to process completed week: ${processError.message}`);
    }

    const period = getPreviousCompletedWeek(new Date());
    const { data: week, error: weekError } = await supabase
      .from("leaderboard_weeks")
      .select("id, week_start, week_end, champion_user_id, champion_badge_awarded")
      .eq("week_start", period.startDate)
      .single();

    if (weekError || !week) {
      throw new Error(weekError?.message || "Completed week record was not found");
    }

    let championScore = 0;
    if (week.champion_user_id) {
      const { data: rankings, error: rankingError } = await supabase.rpc(
        "get_weekly_leaderboard",
        { p_week_start: period.startDate },
      );

      if (rankingError) {
        // The champion record is already committed by the transaction above.
        // Keep the admin response successful and report a score of zero only
        // when this optional display lookup cannot be completed.
        console.warn("Could not load completed-week champion score:", rankingError);
      } else {
        const champion = (rankings ?? []).find(
          (row) => row.user_id === week.champion_user_id,
        );
        championScore = Number(champion?.week_score ?? 0);
      }
    }

    const hasChampion = Boolean(week.champion_user_id);
    return new Response(
      JSON.stringify({
        success: true,
        message: hasChampion
          ? "Completed week processed successfully"
          : "No scores in the completed week; an empty week record was created",
        week: {
          id: week.id,
          week_start: week.week_start,
          week_end: week.week_end,
          champion: week.champion_user_id,
          champion_score: championScore,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
