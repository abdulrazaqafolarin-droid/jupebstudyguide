-- LEADERBOARD REWRITE: Accumulated scoring + weekly reset + champion tracking

-- 1. Helper: get the current week start (Monday 00:00 UTC)
CREATE OR REPLACE FUNCTION public.current_week_start()
RETURNS TIMESTAMPTZ
LANGUAGE sql IMMUTABLE
AS $$
  SELECT date_trunc('week', now())::timestamptz;
$$;

-- 2. Helper: get current week end (Sunday 23:59:59 UTC)
CREATE OR REPLACE FUNCTION public.current_week_end()
RETURNS TIMESTAMPTZ
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (date_trunc('week', now()) + interval '6 days' + interval '23 hours' + interval '59 minutes' + interval '59 seconds')::timestamptz;
$$;

-- 3. Score events table — every point awarded is an immutable row
CREATE TABLE public.score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  reference_id TEXT,           -- idempotency key, null allowed for some events
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_events_user ON public.score_events (user_id);
CREATE INDEX idx_score_events_week ON public.score_events (created_at);
CREATE INDEX idx_score_events_reference ON public.score_events (reference_id) WHERE reference_id IS NOT NULL;

ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Score events viewable by authenticated"
ON public.score_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own score events"
ON public.score_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Function to award points (idempotent via reference_id)
CREATE OR REPLACE FUNCTION public.award_score(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  -- Skip if reference_id already exists (idempotent)
  IF p_reference_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.score_events
    WHERE reference_id = p_reference_id AND user_id = p_user_id;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  INSERT INTO public.score_events (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- 5. Leaderboard weeks table — tracks each weekly cycle and its champion
CREATE TABLE public.leaderboard_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  champion_user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  champion_badge_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leaderboard_weeks_start ON public.leaderboard_weeks (week_start DESC);

ALTER TABLE public.leaderboard_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard weeks viewable by authenticated"
ON public.leaderboard_weeks FOR SELECT TO authenticated USING (true);

-- Only the weekly-reset edge function (service role) inserts
CREATE POLICY "Service role can insert leaderboard weeks"
ON public.leaderboard_weeks FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update leaderboard weeks"
ON public.leaderboard_weeks FOR UPDATE TO service_role USING (true);

-- 6. View: current week leaderboard with scores
CREATE OR REPLACE VIEW public.current_leaderboard AS
SELECT
  se.user_id,
  SUM(se.amount) AS week_score,
  COUNT(*) AS event_count,
  MAX(se.created_at) AS last_event_at
FROM public.score_events se
WHERE se.created_at >= public.current_week_start()
GROUP BY se.user_id;

-- 7. Function: get full leaderboard for a given week
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  week_score BIGINT,
  event_count BIGINT,
  display_name TEXT,
  avatar_url TEXT,
  rank BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH scores AS (
    SELECT
      se.user_id,
      SUM(se.amount)::BIGINT AS week_score,
      COUNT(*)::BIGINT AS event_count
    FROM public.score_events se
    WHERE se.created_at >= COALESCE(p_week_start, public.current_week_start()::DATE)::timestamptz
      AND se.created_at < (COALESCE(p_week_start, public.current_week_start()::DATE) + interval '7 days')::timestamptz
    GROUP BY se.user_id
  )
  SELECT
    s.user_id,
    s.week_score,
    s.event_count,
    p.display_name,
    p.avatar_url,
    ROW_NUMBER() OVER (ORDER BY s.week_score DESC) AS rank
  FROM scores s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.week_score DESC;
$$;

-- 8. Add score tracking columns to user_stats (kept for backward compat, no longer primary source)
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS week_score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_score_accumulated INTEGER NOT NULL DEFAULT 0;

-- 9. Realtime for score_events (so leaderboard updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_events;
