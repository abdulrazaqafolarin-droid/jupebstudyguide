-- Weekly Leaderboard Reset Cron Job
-- Runs every Monday at 00:00 UTC to determine the weekly champion
-- Requires pg_cron extension (enable in Supabase Dashboard → Database → Extensions)

DO $$
BEGIN
  -- Try to enable pg_cron if not already available
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — cron jobs will not be scheduled. Enable via Supabase Dashboard.';
END;
$$;

-- Create the weekly champion function (used both by cron and manually)
CREATE OR REPLACE FUNCTION public.auto_weekly_champion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_champion_id UUID;
  v_existing UUID;
BEGIN
  v_week_start := date_trunc('week', now())::DATE;
  v_week_end := (date_trunc('week', now()) + interval '6 days')::DATE;

  SELECT id INTO v_existing FROM public.leaderboard_weeks
  WHERE week_start = v_week_start;
  IF FOUND THEN
    RETURN;
  END IF;

  SELECT user_id INTO v_champion_id
  FROM public.score_events
  WHERE created_at >= v_week_start::timestamptz
    AND created_at < (v_week_start + interval '7 days')::timestamptz
  GROUP BY user_id
  ORDER BY SUM(amount) DESC
  LIMIT 1;

  INSERT INTO public.leaderboard_weeks (week_start, week_end, champion_user_id, champion_badge_awarded)
  VALUES (v_week_start, v_week_end, v_champion_id, v_champion_id IS NOT NULL);

  IF v_champion_id IS NOT NULL THEN
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (v_champion_id, 0, 'champion_badge',
      'champion_badge:' || v_week_start::text || ':' || v_champion_id::text);
  END IF;
END;
$$;

-- Schedule the weekly champion determination (only works if pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('weekly-champion', '0 1 * * 1', 'SELECT public.auto_weekly_champion();');
    RAISE NOTICE 'Cron job weekly-champion scheduled successfully.';
  END IF;
END;
$$;
