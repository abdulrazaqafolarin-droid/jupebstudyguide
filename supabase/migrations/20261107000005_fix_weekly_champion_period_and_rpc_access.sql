-- Determine the champion for the week that has just finished.
-- Cron runs on Monday at 01:00 UTC; using the current week here would freeze
-- the new week's champion after only its first hour.
CREATE OR REPLACE FUNCTION public.auto_weekly_champion()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_current_week_start DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_champion_id UUID;
  v_existing UUID;
  v_existing_champion UUID;
  v_existing_badge_awarded BOOLEAN;
BEGIN
  -- Use UTC explicitly to match score event timestamps and the cron schedule.
  v_current_week_start := date_trunc('week', now() AT TIME ZONE 'UTC')::DATE;
  v_week_start := v_current_week_start - 7;
  v_week_end := v_current_week_start - 1;

  -- Cron and an authorized admin Edge Function may run at nearly the same time.
  -- Serialize this completed week before checking/inserting its single record.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('weekly-champion:' || v_week_start::TEXT, 0)
  );

  SELECT id, champion_user_id, champion_badge_awarded
  INTO v_existing, v_existing_champion, v_existing_badge_awarded
  FROM public.leaderboard_weeks
  WHERE week_start = v_week_start;

  -- Older versions inserted an empty row at the START of the week, before
  -- there could be a champion. Preserve finalized rows, but allow those blank
  -- placeholders to be filled now that the week has actually ended.
  IF FOUND AND (
    v_existing_champion IS NOT NULL
    OR COALESCE(v_existing_badge_awarded, false)
  ) THEN
    RETURN;
  END IF;

  SELECT se.user_id INTO v_champion_id
  FROM public.score_events se
  WHERE se.created_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'UTC')
    AND se.created_at < (v_current_week_start::TIMESTAMP AT TIME ZONE 'UTC')
  GROUP BY se.user_id
  ORDER BY SUM(se.amount) DESC, se.user_id ASC
  LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.leaderboard_weeks (
      week_start,
      week_end,
      champion_user_id,
      champion_badge_awarded
    )
    VALUES (
      v_week_start,
      v_week_end,
      v_champion_id,
      v_champion_id IS NOT NULL
    );
  ELSIF v_champion_id IS NOT NULL THEN
    UPDATE public.leaderboard_weeks
    SET champion_user_id = v_champion_id,
        champion_badge_awarded = true,
        week_end = v_week_end
    WHERE id = v_existing
      AND champion_user_id IS NULL
      AND NOT COALESCE(champion_badge_awarded, false);

    IF NOT FOUND THEN
      RETURN;
    END IF;
  ELSE
    -- Keep an empty placeholder intact when the completed week had no scores.
    RETURN;
  END IF;

  IF v_champion_id IS NOT NULL THEN
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (
      v_champion_id,
      0,
      'champion_badge',
      'champion_badge:' || v_week_start::TEXT || ':' || v_champion_id::TEXT
    );
  END IF;
END;
$$;

-- The scheduled cron job runs as postgres (the function owner). The Edge
-- Function uses service_role. Neither anonymous nor authenticated clients
-- should be able to invoke this SECURITY DEFINER write operation through RPC.
REVOKE ALL ON FUNCTION public.auto_weekly_champion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_weekly_champion() TO service_role;
