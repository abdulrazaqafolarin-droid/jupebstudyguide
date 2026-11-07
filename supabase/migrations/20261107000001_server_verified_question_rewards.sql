-- Secure study-question rewards and preserve existing leaderboard history.
--
-- Production history contains duplicate score references and this migration
-- intentionally does not delete or rewrite historical score_events rows.
-- Existing question rewards are backfilled into a private claim ledger.

-- Client roles retain read-only access. In particular, TRUNCATE bypasses
-- row-level security, so it must not be granted to anon or authenticated.
DROP POLICY IF EXISTS "Users insert own score events" ON public.score_events;
REVOKE ALL PRIVILEGES ON TABLE public.score_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.score_events TO anon, authenticated;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;

-- Private idempotency ledger. It is not exposed through the Supabase Data API.
CREATE TABLE IF NOT EXISTS public.question_reward_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('attempt', 'correct')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id, reward_type)
);

ALTER TABLE public.question_reward_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.question_reward_claims
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.question_reward_claims IS
  'Private ledger preventing repeated attempt and correctness rewards per student and official question.';

-- Backfill from existing official-question reward references. Keep all
-- historical score_events rows, including existing duplicate reference groups.
INSERT INTO public.question_reward_claims (user_id, question_id, reward_type, created_at)
SELECT DISTINCT ON (user_id, question_id, reward_type)
  user_id,
  question_id,
  reward_type,
  created_at
FROM (
  SELECT
    user_id,
    substring(
      reference_id
      FROM char_length(reason) + 2
      FOR char_length(reference_id) - char_length(reason) - char_length(user_id::TEXT) - 2
    ) AS question_id,
    CASE reason
      WHEN 'answered_question' THEN 'attempt'
      WHEN 'correct_answer' THEN 'correct'
    END AS reward_type,
    created_at
  FROM public.score_events
  WHERE reason IN ('answered_question', 'correct_answer')
    AND reference_id LIKE reason || ':%:' || user_id::TEXT
) AS existing_rewards
WHERE question_id <> ''
ORDER BY user_id, question_id, reward_type, created_at
ON CONFLICT (user_id, question_id, reward_type) DO NOTHING;

-- Retain the legacy generic function for trusted server-side use only.
REVOKE ALL PRIVILEGES ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_score(UUID, INTEGER, TEXT, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.record_question_attempt(
  p_question_id TEXT,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_question_id TEXT := btrim(COALESCE(p_question_id, ''));
  v_answer TEXT := btrim(COALESCE(p_answer, ''));
  v_correct_answer TEXT;
  v_is_correct BOOLEAN := false;
  v_attempt_awarded BOOLEAN := false;
  v_correct_awarded BOOLEAN := false;
BEGIN
  -- A signed-in, non-anonymous student account is required for points.
  IF v_user_id IS NULL
     OR COALESCE(auth.jwt() ->> 'is_anonymous', 'false') = 'true' THEN
    RAISE EXCEPTION 'A signed-in student account is required'
      USING ERRCODE = '42501';
  END IF;

  IF v_question_id = '' OR char_length(v_question_id) > 200 THEN
    RAISE EXCEPTION 'Invalid question identifier'
      USING ERRCODE = '22023';
  END IF;

  IF v_answer = '' THEN
    RAISE EXCEPTION 'An answer is required to earn question points'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_answer) > 10000 THEN
    RAISE EXCEPTION 'Answer is too long'
      USING ERRCODE = '22023';
  END IF;

  -- SECURITY DEFINER bypasses study_questions RLS, so explicitly mirror the
  -- entitlement gate used by the question-bank SELECT policy. A visible
  -- question must not become a reward endpoint for expired or unactivated
  -- accounts that cannot access the question in the app.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = v_user_id
      AND (
        p.is_admin IS TRUE
        OR p.is_activated IS TRUE
        OR p.trial_expires_at > statement_timestamp()
      )
  ) THEN
    RAISE EXCEPTION 'An active trial or activation is required to earn question points'
      USING ERRCODE = '42501';
  END IF;

  -- Only the centrally curated, visible JUPEB question bank can award points.
  -- Student-created custom_questions remain usable for practice but are not
  -- trusted evidence for leaderboard rewards.
  SELECT q.correct_answer
    INTO v_correct_answer
  FROM public.study_questions AS q
  WHERE q.id = v_question_id
    AND q.hidden = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'eligible_for_points', false,
      'attempt_awarded', false,
      'correct_awarded', false,
      'duplicate', false
    );
  END IF;

  v_is_correct :=
    v_correct_answer IS NOT NULL
    AND btrim(v_correct_answer) <> ''
    AND upper(btrim(v_correct_answer)) <> 'TBD'
    AND upper(v_answer) = upper(btrim(v_correct_answer));

  -- One attempt reward per student/question.
  INSERT INTO public.question_reward_claims (user_id, question_id, reward_type)
  VALUES (v_user_id, v_question_id, 'attempt')
  ON CONFLICT (user_id, question_id, reward_type) DO NOTHING
  RETURNING true INTO v_attempt_awarded;

  v_attempt_awarded := COALESCE(v_attempt_awarded, false);

  IF v_attempt_awarded THEN
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (
      v_user_id,
      5,
      'answered_question',
      'answered_question:' || v_question_id || ':' || v_user_id::TEXT
    );
  END IF;

  -- One correctness reward per student/question. A later correct answer can
  -- still earn this reward after a prior wrong attempt.
  IF v_is_correct THEN
    INSERT INTO public.question_reward_claims (user_id, question_id, reward_type)
    VALUES (v_user_id, v_question_id, 'correct')
    ON CONFLICT (user_id, question_id, reward_type) DO NOTHING
    RETURNING true INTO v_correct_awarded;

    v_correct_awarded := COALESCE(v_correct_awarded, false);

    IF v_correct_awarded THEN
      INSERT INTO public.score_events (user_id, amount, reason, reference_id)
      VALUES (
        v_user_id,
        10,
        'correct_answer',
        'correct_answer:' || v_question_id || ':' || v_user_id::TEXT
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'eligible_for_points', true,
    'attempt_awarded', v_attempt_awarded,
    'correct_awarded', v_correct_awarded,
    'is_correct', v_is_correct,
    'duplicate', NOT (v_attempt_awarded OR v_correct_awarded)
  );
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.record_question_attempt(TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_question_attempt(TEXT, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.record_question_attempt(TEXT, TEXT) IS
  'Awards fixed attempt and correctness rewards only to activated or in-trial users for official visible questions, after checking the database answer key and private per-student claim ledger.';
