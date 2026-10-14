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

-- Prevent clients from bypassing award_score by inserting arbitrary score rows directly.
DROP POLICY IF EXISTS "Users insert own score events" ON public.score_events;
REVOKE INSERT, UPDATE, DELETE ON public.score_events FROM PUBLIC, anon, authenticated;

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
  v_reference_key TEXT;
  v_question_exists BOOLEAN;
  v_reference_date DATE;
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

  v_reference_key := split_part(p_reference_id, ':', 2);
  IF v_reference_key IS NULL OR btrim(v_reference_key) = '' THEN
    RAISE EXCEPTION 'A non-empty reward reference key is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_reason IN ('answered_question', 'correct_answer') THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.study_questions q
      WHERE q.id::TEXT = v_reference_key
        AND q.hidden = false
      UNION ALL
      SELECT 1
      FROM public.custom_questions q
      WHERE q.id::TEXT = v_reference_key
        AND q.user_id = p_user_id
    ) INTO v_question_exists;

    IF NOT v_question_exists THEN
      RAISE EXCEPTION 'Question reward reference is not valid for this user'
        USING ERRCODE = '22023';
    END IF;

    IF p_reason = 'correct_answer' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.study_questions q
        WHERE q.id::TEXT = v_reference_key
          AND q.hidden = false
          AND q.correct_answer IS NOT NULL
          AND btrim(q.correct_answer) <> ''
          AND upper(btrim(q.correct_answer)) <> 'TBD'
        UNION ALL
        SELECT 1
        FROM public.custom_questions q
        WHERE q.id::TEXT = v_reference_key
          AND q.user_id = p_user_id
          AND btrim(q.correct_answer) <> ''
          AND upper(btrim(q.correct_answer)) <> 'TBD'
      ) INTO v_question_exists;

      IF NOT v_question_exists THEN
        RAISE EXCEPTION 'Cannot award correctness for a question without an answer key'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  ELSIF p_reason = 'syllabus_day' THEN
    IF v_reference_key !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Invalid syllabus day reward reference'
        USING ERRCODE = '22023';
    END IF;
    IF v_reference_key::INTEGER NOT BETWEEN 1 AND 30 THEN
      RAISE EXCEPTION 'Invalid syllabus day reward reference'
        USING ERRCODE = '22023';
    END IF;
  ELSIF p_reason = 'streak_day' THEN
    IF v_reference_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid streak date reward reference'
        USING ERRCODE = '22023';
    END IF;
    v_reference_date := to_date(v_reference_key, 'YYYY-MM-DD');
    IF to_char(v_reference_date, 'YYYY-MM-DD') <> v_reference_key
       OR v_reference_date NOT BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1 THEN
      RAISE EXCEPTION 'Streak rewards are limited to the current local date'
        USING ERRCODE = '22023';
    END IF;
  ELSIF p_reason = 'achievement' THEN
    IF v_reference_key NOT IN (
      'first_day', 'streak_3', 'streak_7', 'streak_14', 'streak_30',
      'first_10', 'first_50', 'first_100', 'first_500', 'first_1000',
      'master_10', 'master_50', 'master_100', 'master_200',
      'accuracy_high', 'accuracy_perfect', 'perfect_10', 'all_subjects',
      'four_subjects', 'first_upload', 'upload_5', 'upload_10',
      'syllabus_start', 'syllabus_week1', 'syllabus_half', 'syllabus_25',
      'syllabus_complete', 'night_owl', 'early_bird'
    ) THEN
      RAISE EXCEPTION 'Invalid achievement reward reference'
        USING ERRCODE = '22023';
    END IF;
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
