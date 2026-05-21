-- Weekly Leaderboard Reset Cron Job
-- This runs every Monday at 00:00 UTC to determine the weekly champion
-- Requires pg_cron extension (enabled by default on Supabase)

-- Select the weekly champion and record the week's results
-- This is called by the edge function, but we also set up a cron to invoke it

-- First, ensure the edge function exists and is deployed
-- Then create the cron job to invoke the weekly-reset edge function

-- Option 1: Using pg_cron to invoke the edge function via HTTP
-- Note: This requires the pg_net extension for HTTP requests from within PostgreSQL

-- First enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the cron job that fires every Monday at midnight UTC
SELECT cron.schedule(
  'weekly-reset',           -- unique job name
  '0 0 * * 1',             -- cron expression: every Monday at 00:00
  $$SELECT extensions.http_post(
    url := 'https://esvrhnlwquunsdduvbnr.supabase.co/functions/v1/weekly-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_key')
    ),
    body := '{}'::jsonb
  );$$
);

-- Alternative simpler approach: just schedule a SQL query
-- that aggregates scores weekly and stores the champion
-- (This runs entirely in-database without needing the edge function)
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
  -- Calculate current week
  v_week_start := date_trunc('week', now())::DATE;
  v_week_end := (date_trunc('week', now()) + interval '6 days')::DATE;

  -- Check if already processed
  SELECT id INTO v_existing FROM public.leaderboard_weeks
  WHERE week_start = v_week_start;
  IF FOUND THEN
    RETURN;
  END IF;

  -- Find champion
  SELECT user_id INTO v_champion_id
  FROM public.score_events
  WHERE created_at >= v_week_start::timestamptz
    AND created_at < (v_week_start + interval '7 days')::timestamptz
  GROUP BY user_id
  ORDER BY SUM(amount) DESC
  LIMIT 1;

  -- Insert week record
  INSERT INTO public.leaderboard_weeks (week_start, week_end, champion_user_id, champion_badge_awarded)
  VALUES (v_week_start, v_week_end, v_champion_id, v_champion_id IS NOT NULL);

  -- If champion found, award a bonus badge event
  IF v_champion_id IS NOT NULL THEN
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (v_champion_id, 0, 'champion_badge',
      'champion_badge:' || v_week_start::text || ':' || v_champion_id::text);
  END IF;
END;
$$;

-- Schedule the weekly champion determination
SELECT cron.schedule('weekly-champion', '0 1 * * 1', 'SELECT public.auto_weekly_champion();');

-- Note: To manually run: SELECT public.auto_weekly_champion();
-- To view cron jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('weekly-champion');
