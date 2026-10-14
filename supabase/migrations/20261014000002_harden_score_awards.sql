-- Harden reward writes: enforce caller ownership, fixed point values, and race-safe idempotency.
-- Existing duplicate reference events are collapsed to the earliest event before adding the unique index.
WITH ranked_events AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, reference_id
           ORDER BY created_at ASC, id ASC
         ) AS duplicate_rank
  FROM public.score_events
  WHERE reference_id IS NOT NULL
)
DELETE FROM public.score_events AS event
USING ranked_events AS ranked
WHERE event.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_score_events_user_reference
  ON public.score_events (user_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.award_score(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_amount INTEGER;
  v_inserted_id UUID;
BEGIN
  -- Service-role edge functions may award server-verified events. All other
  -- callers may award only to their own authenticated account.
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'Not allowed to award points to another user'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid reward request'
      USING ERRCODE = '22023';
  END IF;

  v_expected_amount := CASE p_reason
    WHEN 'answered_question' THEN 5
    WHEN 'correct_answer' THEN 10
    WHEN 'streak_day' THEN 20
    WHEN 'syllabus_day' THEN 50
    WHEN 'achievement' THEN 100
    WHEN 'quiz_complete' THEN 25
    ELSE NULL
  END;

  IF v_expected_amount IS NULL OR p_amount <> v_expected_amount THEN
    RAISE EXCEPTION 'Invalid reward reason or point amount'
      USING ERRCODE = '22023';
  END IF;

  IF p_reference_id IS NULL OR btrim(p_reference_id) = '' THEN
    RAISE EXCEPTION 'A unique reward reference is required'
      USING ERRCODE = '22023';
  END IF;

  -- The client uses reason:reference:userId. Reject mismatched ownership tags.
  IF left(p_reference_id, length(p_reason) + 1) <> p_reason || ':'
     OR right(p_reference_id, length(p_user_id::TEXT)) <> p_user_id::TEXT THEN
    RAISE EXCEPTION 'Invalid reward reference'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.score_events (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id)
  ON CONFLICT (user_id, reference_id) WHERE reference_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;
