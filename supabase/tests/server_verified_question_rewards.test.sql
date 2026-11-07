BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(12);

SELECT ok(
  NOT has_function_privilege(
    'anon', 'public.record_question_attempt(text,text)', 'EXECUTE'
  ),
  'anonymous callers cannot execute the question reward RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated', 'public.record_question_attempt(text,text)', 'EXECUTE'
  ),
  'authenticated callers can submit answers through the question reward RPC'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated', 'public.award_score(uuid,integer,text,text)', 'EXECUTE'
  ),
  'authenticated clients cannot execute the generic score-award RPC'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated', 'public.question_reward_claims', 'SELECT'
  ),
  'authenticated clients cannot read the private reward-claim ledger'
);

-- Reuse the disposable StudyBot account created by supabase/seed.sql. The
-- service_role fixture updates only its profile inside this rolled-back test.
SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';

INSERT INTO public.profiles (
  user_id, display_name, is_admin, is_activated, trial_started_at, trial_expires_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Reward Test Student',
  false,
  false,
  now() - interval '2 days',
  now() - interval '1 day'
)
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    is_admin = false,
    is_activated = false,
    trial_started_at = EXCLUDED.trial_started_at,
    trial_expires_at = EXCLUDED.trial_expires_at;

INSERT INTO public.study_questions (
  id, subject, year, category, question, options, correct_answer, hidden
)
VALUES
(
  'server-reward-entitlement-test',
  'Chemistry',
  2024,
  'objective',
  'Local-only question used to test server-side reward eligibility',
  '[{"label":"A","text":"Option A"},{"label":"B","text":"Option B"}]'::jsonb,
  'A',
  false
),
(
  'server-reward-hidden-test',
  'Chemistry',
  2024,
  'objective',
  'Local-only hidden question used to verify reward denial',
  '[{"label":"A","text":"Option A"},{"label":"B","text":"Option B"}]'::jsonb,
  'A',
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';

SELECT throws_ok(
  $$SELECT public.record_question_attempt(
    'server-reward-entitlement-test', 'A'
  )$$,
  '42501',
  NULL,
  'an expired, unactivated account cannot earn question points'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';

UPDATE public.profiles
SET trial_started_at = now(),
    trial_expires_at = now() + interval '1 day'
WHERE user_id = '00000000-0000-0000-0000-000000000000';

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';

SELECT is(
  (public.record_question_attempt(
    'server-reward-hidden-test', 'A'
  )->>'eligible_for_points')::BOOLEAN,
  false,
  'a hidden official question cannot award points'
);

SELECT is(
  (public.record_question_attempt(
    'server-reward-entitlement-test', 'B'
  )->>'attempt_awarded')::BOOLEAN,
  true,
  'the first eligible wrong answer earns the one-time attempt reward'
);

SELECT is(
  (public.record_question_attempt(
    'server-reward-entitlement-test', 'B'
  )->>'duplicate')::BOOLEAN,
  true,
  'repeating an attempt does not award the attempt reward again'
);

SELECT is(
  (public.record_question_attempt(
    'server-reward-entitlement-test', 'A'
  )->>'correct_awarded')::BOOLEAN,
  true,
  'a later correct answer earns its separate one-time correctness reward'
);

SELECT is(
  (public.record_question_attempt(
    'server-reward-entitlement-test', 'A'
  )->>'duplicate')::BOOLEAN,
  true,
  'repeating a correct answer does not award correctness points again'
);

SELECT is(
  (
    SELECT COALESCE(sum(amount), 0)::INTEGER
    FROM public.score_events
    WHERE user_id = '00000000-0000-0000-0000-000000000000'
      AND reference_id IN (
        'answered_question:server-reward-entitlement-test:00000000-0000-0000-0000-000000000000',
        'correct_answer:server-reward-entitlement-test:00000000-0000-0000-0000-000000000000'
      )
  ),
  15,
  'the eligible student receives exactly five attempt points and ten correctness points'
);

-- This ledger is intentionally private to API roles too. The migration test
-- checks its contents as the local database owner, not as a client role.
RESET ROLE;

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM public.question_reward_claims
    WHERE user_id = '00000000-0000-0000-0000-000000000000'
      AND question_id = 'server-reward-entitlement-test'
  ),
  2,
  'the private ledger stores exactly one attempt claim and one correctness claim'
);

SELECT * FROM finish();
ROLLBACK;
