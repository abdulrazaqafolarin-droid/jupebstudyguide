import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller has admin privileges (service role already, but double-check)
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", user.id)
          .single();
        if (!profile?.is_admin && user.email !== Deno.env.get("ADMIN_EMAIL")) {
          return new Response(
            JSON.stringify({ error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Calculate current week boundaries
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = monday.toISOString().split("T")[0];
    const weekEnd = sunday.toISOString().split("T")[0];

    // Check if this week already processed
    const { data: existing } = await supabase
      .from("leaderboard_weeks")
      .select("id, champion_user_id")
      .eq("week_start", weekStart)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Week already processed",
          champion: existing.champion_user_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find this week's champion
    const { data: scores } = await supabase
      .from("score_events")
      .select("user_id, amount")
      .gte("created_at", monday.toISOString())
      .lt("created_at", sunday.toISOString());

    if (!scores || scores.length === 0) {
      // No scores yet — create the week entry without a champion
      const { data: week } = await supabase
        .from("leaderboard_weeks")
        .insert({ week_start: weekStart, week_end: weekEnd })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          message: "No scores this week, created empty week entry",
          week,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate scores and find champion
    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      scoreMap.set(s.user_id, (scoreMap.get(s.user_id) ?? 0) + s.amount);
    }
    const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
    const championId = sorted[0][0];

    // Create week entry with champion
    const { data: week, error: weekError } = await supabase
      .from("leaderboard_weeks")
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        champion_user_id: championId,
        champion_badge_awarded: true,
      })
      .select()
      .single();

    if (weekError) {
      throw new Error(`Failed to create week entry: ${weekError.message}`);
    }

    // Send honorary badge notification via chat or notification system
    // We create a notification by inserting into the notifications table
    // Since we don't have a notifications DB table (it's localStorage), we
    // create a score event for the badge itself, visible on the leaderboard
    const badgeRef = `champion_badge:${weekStart}:${championId}`;
    const { error: badgeError } = await supabase.from("score_events").insert({
      user_id: championId,
      amount: 0,
      reason: "champion_badge",
      reference_id: badgeRef,
    });

    if (badgeError) {
      console.error("Failed to insert champion badge event:", badgeError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Week processed successfully",
        week: {
          id: week.id,
          week_start: weekStart,
          week_end: weekEnd,
          champion: championId,
          champion_score: sorted[0][1],
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
