BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(11);

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

-- Do not invoke signup welcome-message triggers: these tests create only the
-- minimal local identities required to exercise the RPC entitlement check.
ALTER TABLE auth.users DISABLE TRIGGER USER;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'reward-test-active@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'reward-test-expired@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

ALTER TABLE auth.users ENABLE TRIGGER USER;

-- The profile-guard migration allows trial fields only during the trusted
-- signup initialization context. This is a disposable local test fixture.
SELECT set_config('app.signup_trial_initialize', 'true', true);

INSERT INTO public.profiles (
  user_id, display_name, is_activated, trial_started_at, trial_expires_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Reward Test Active',
    false,
    now(),
    now() + interval '1 day'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Reward Test Expired',
    false,
    now() - interval '2 days',
    now() - interval '1 day'
  );

SELECT set_config('app.signup_trial_initialize', 'false', true);

INSERT INTO public.study_questions (
  id, subject, year, category, question, options, correct_answer, hidden
)
VALUES (
  'server-reward-entitlement-test',
  'Chemistry',
  2024,
  'objective',
  'Local-only question used to test server-side reward eligibility',
  '[{"label":"A","text":"Option A"},{"label":"B","text":"Option B"}]'::jsonb,
  'A',
  false
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

SELECT throws_ok(
  $$SELECT public.record_question_attempt(
    'server-reward-entitlement-test', 'A'
  )$$,
  '42501',
  NULL,
  'an expired, unactivated account cannot earn question points'
);

SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

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
    WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND reference_id IN (
        'answered_question:server-reward-entitlement-test:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'correct_answer:server-reward-entitlement-test:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      )
  ),
  15,
  'the eligible student receives exactly five attempt points and ten correctness points'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM public.question_reward_claims
    WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND question_id = 'server-reward-entitlement-test'
  ),
  2,
  'the private ledger stores exactly one attempt claim and one correctness claim'
);

SELECT * FROM finish();
ROLLBACK;
