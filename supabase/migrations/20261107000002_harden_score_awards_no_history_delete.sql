-- Harden score awards without deleting or rewriting existing score history.
-- The earlier draft migration removed 26 duplicate achievement rows (2,600 points)
-- across 10 accounts. This migration preserves every existing row and only blocks
-- invalid or repeated awards going forward.

-- Do not rely on an RLS INSERT policy or client table grants for reward writes.
-- Remove the legacy policy and keep all score-event mutations behind trusted
-- database functions. This also protects projects where the earlier hardening
-- migration was not applied.
DROP POLICY IF EXISTS "Users insert own score events" ON public.score_events;
REVOKE INSERT, UPDATE, DELETE ON public.score_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_score_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.reference_id IS NULL OR btrim(NEW.reference_id) = '' THEN
    RAISE EXCEPTION 'A non-empty score event user and reference are required'
      USING ERRCODE = '23514';
  END IF;

  -- Serialize identical user/reference writes to close the concurrent-RPC race.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.user_id::text || ':' || NEW.reference_id, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.score_events e
    WHERE e.user_id = NEW.user_id
      AND e.reference_id = NEW.reference_id
  ) THEN
    RAISE EXCEPTION 'Duplicate score event reference'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_score_event ON public.score_events;
CREATE TRIGGER prevent_duplicate_score_event
  BEFORE INSERT ON public.score_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_score_event();

CREATE OR REPLACE FUNCTION public.award_score(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_expected_amount INTEGER;
  v_inserted_id UUID;
  v_reference_key TEXT;
  v_question_exists BOOLEAN;
  v_reference_date DATE;
  v_quiz_awards_last_24h INTEGER;
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

  -- The app generates exactly reason:referenceKey:userId. Require that
  -- canonical three-part form; prefix/suffix-only checks let extra segments
  -- bypass idempotency for an otherwise valid achievement or question key.
  v_reference_key := split_part(p_reference_id, ':', 2);
  IF v_reference_key IS NULL
     OR btrim(v_reference_key) = ''
     OR p_reference_id <> (p_reason || ':' || v_reference_key || ':' || p_user_id::TEXT) THEN
    RAISE EXCEPTION 'Reward reference must be exactly reason:key:userId'
      USING ERRCODE = '22023';
  END IF;

  -- Fast idempotency check means retries of an existing reward still succeed
  -- even if the user has reached a per-day reward cap.
  IF EXISTS (
    SELECT 1
    FROM public.score_events
    WHERE user_id = p_user_id
      AND reference_id = p_reference_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
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
  ELSIF p_reason = 'quiz_complete' THEN
    -- Different quiz session IDs use different reference locks. Serialize all
    -- quiz rewards for this user before counting so concurrent sessions cannot
    -- race past the per-24-hour limit.
    PERFORM pg_advisory_xact_lock(
      hashtextextended('quiz_complete:' || p_user_id::TEXT, 0)
    );

    SELECT COUNT(*)::INTEGER INTO v_quiz_awards_last_24h
    FROM public.score_events
    WHERE user_id = p_user_id
      AND reason = 'quiz_complete'
      AND created_at >= now() - interval '24 hours';

    IF v_quiz_awards_last_24h >= 20 THEN
      RAISE EXCEPTION 'Daily quiz reward limit reached'
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

  BEGIN
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_amount, p_reason, p_reference_id)
    RETURNING id INTO v_inserted_id;
  EXCEPTION WHEN unique_violation THEN
    -- The insert trigger serializes identical references; a concurrent retry
    -- becomes a harmless duplicate instead of creating another score event.
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END;

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;

