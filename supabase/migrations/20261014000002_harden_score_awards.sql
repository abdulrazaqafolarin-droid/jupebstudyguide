-- Secure study-question rewards and preserve existing leaderboard history.
--
-- This migration was not present in the production Supabase migration history
-- during the 2026-11-07 security review. It replaces the earlier draft, which
-- deleted duplicate score rows and trusted a client-supplied reward reference.
-- Existing score_events are preserved; prior question rewards are backfilled
-- into a private claim ledger so they cannot be earned a second time.

-- Clients must not insert score events directly.
DROP POLICY IF EXISTS "Users insert own score events" ON public.score_events;
REVOKE INSERT, UPDATE, DELETE ON public.score_events FROM PUBLIC, anon, authenticated;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;

-- This table is an internal idempotency ledger. It is deliberately not exposed
-- through the Supabase Data API and has no client-facing policies or grants.
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
  'Private ledger preventing repeated attempt and correct-answer rewards per user and official question.';

-- Backfill claims from existing references. Do not delete or rewrite historical
-- score_events: production contains duplicate reference groups, and those
-- historical points must be preserved while preventing any further re-awards.
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

-- Keep the legacy generic RPC for trusted server-side compatibility only.
-- Normal signed-in clients must use record_question_attempt below.
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
  -- An authenticated, non-anonymous account is required for leaderboard points.
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

  -- Read the authoritative answer from the official, visible question bank.
  -- Never accept a client-provided correctness flag or point amount.
  SELECT q.correct_answer
    INTO v_correct_answer
  FROM public.study_questions AS q
  WHERE q.id = v_question_id
    AND q.hidden = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question is unavailable for scoring'
      USING ERRCODE = '22023';
  END IF;

  v_is_correct :=
    v_correct_answer IS NOT NULL
    AND btrim(v_correct_answer) <> ''
    AND upper(btrim(v_correct_answer)) <> 'TBD'
    AND upper(v_answer) = upper(btrim(v_correct_answer));

  -- One attempt reward per student/question. A later correct submission can
  -- still earn the separate correctness reward if the first attempt was wrong.
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

  -- One correctness reward per student/question, checked by this function.
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
  'Awards the fixed 5-point attempt and 10-point correctness rewards after checking the official answer key and a private per-user claim ledger.';
