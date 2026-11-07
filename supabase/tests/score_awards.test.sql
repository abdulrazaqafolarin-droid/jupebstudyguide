BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(15);

-- Signup creates a StudyBot welcome message. This suite is about score awards,
-- not message delivery; message-level triggers depend on an authenticated
-- request context that a migration test does not have. Keep them disabled only
-- while the disposable test users are created, then restore them immediately.
ALTER TABLE public.messages DISABLE TRIGGER USER;

-- These IDs exist only inside this rolled-back local test transaction.
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'score-test-a@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'score-test-b@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

ALTER TABLE public.messages ENABLE TRIGGER USER;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.score_events'::regclass
      AND conname = 'score_events_reference_nonempty'
      AND NOT convalidated
  ),
  'non-empty reference constraint is installed without rewriting legacy rows'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.score_events', 'INSERT'),
  'authenticated users cannot insert score events directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.score_events', 'UPDATE'),
  'authenticated users cannot update score events directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.score_events', 'DELETE'),
  'authenticated users cannot delete score events directly'
);

SET LOCAL ROLE service_role;
SELECT throws_ok(
  $insert$
    INSERT INTO public.score_events (user_id, amount, reason, reference_id)
    VALUES (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      100,
      'achievement',
      NULL
    )
  $insert$,
  '23514',
  NULL,
  'table-level guard rejects a direct score insert without a reference'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

SELECT ok(
  NOT has_function_privilege(
    'authenticated', 'public.award_score(uuid,integer,text,text)', 'EXECUTE'
  ),
  'authenticated clients cannot execute the generic award_score RPC'
);
SELECT ok(
  has_function_privilege(
    'service_role', 'public.award_score(uuid,integer,text,text)', 'EXECUTE'
  ),
  'trusted service_role retains award_score execution'
);

SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';

SELECT throws_ok(
  $SELECT public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'achievement', NULL
  )$,
  '22023',
  NULL,
  'award_score rejects a missing reference'
);

SELECT throws_ok(
  $$SELECT public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'achievement',
    'achievement:first_day:extra:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )$$,
  '22023',
  NULL,
  'award_score rejects extra reference segments'
);

SELECT is(
  public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'achievement',
    'achievement:first_day:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )->>'duplicate',
  'false',
  'the first valid achievement award is recorded'
);

SELECT is(
  public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'achievement',
    'achievement:first_day:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )->>'duplicate',
  'true',
  'repeating the same award is treated as a duplicate'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.score_events
    WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND reference_id = 'achievement:first_day:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  1,
  'a repeated award creates only one score row'
);

SELECT throws_ok(
  $$SELECT public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'achievement',
    'achievement:not_a_real_achievement:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )$$,
  '22023',
  NULL,
  'unknown achievement identifiers are rejected'
);

DO $quiz_limit_test$
DECLARE
  session_number integer;
BEGIN
  FOR session_number IN 1..20 LOOP
    PERFORM public.award_score(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      25,
      'quiz_complete',
      'quiz_complete:ci-session-' || session_number::text ||
        ':aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
  END LOOP;
END;
$quiz_limit_test$;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.score_events
    WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND reason = 'quiz_complete'
      AND created_at >= now() - interval '24 hours'
  ),
  20,
  'twenty unique quiz rewards are allowed in the rolling 24-hour window'
);

SELECT throws_ok(
  $$SELECT public.award_score(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 25, 'quiz_complete',
    'quiz_complete:ci-session-21:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )$$,
  '22023',
  NULL,
  'the twenty-first quiz reward is rejected'
);

SELECT * FROM finish();
ROLLBACK;
