BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(10);

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.auto_weekly_champion()'::regprocedure
  ),
  'weekly champion function remains SECURITY DEFINER'
);

SELECT ok(
  NOT has_function_privilege(
    'anon', 'public.auto_weekly_champion()', 'EXECUTE'
  ),
  'anonymous callers cannot execute the weekly champion writer'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated', 'public.auto_weekly_champion()', 'EXECUTE'
  ),
  'authenticated clients cannot execute the weekly champion writer'
);

SELECT ok(
  has_function_privilege(
    'service_role', 'public.auto_weekly_champion()', 'EXECUTE'
  ),
  'trusted service_role can execute the weekly champion writer'
);

-- These are disposable identities in the local migration-test database.
-- Keep normal signup triggers enabled. The local JWT subject is set to the
-- seeded StudyBot identity so any sender-id fallback inside the signup
-- welcome-message trigger always receives a non-null sender.
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"service_role"}';

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'weekly-test-a@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'weekly-test-b@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

INSERT INTO public.profiles (user_id, display_name)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Weekly Test A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Weekly Test B')
ON CONFLICT (user_id) DO NOTHING;

DO $weekly_fixture$
DECLARE
  v_current_week_start DATE :=
    date_trunc('week', now() AT TIME ZONE 'UTC')::DATE;
  v_previous_week_start DATE;
BEGIN
  v_previous_week_start := v_current_week_start - 7;

  -- Simulate the empty row the old Monday cron created at the start of a week.
  INSERT INTO public.leaderboard_weeks (
    week_start, week_end, champion_user_id, champion_badge_awarded
  )
  VALUES (
    v_previous_week_start,
    v_current_week_start - 1,
    NULL,
    false
  )
  ON CONFLICT (week_start) DO UPDATE
  SET champion_user_id = NULL,
      champion_badge_awarded = false,
      week_end = EXCLUDED.week_end;

  -- User A wins the completed week. User B has a larger score in the
  -- current week, which the champion calculation must ignore.
  INSERT INTO public.score_events (
    user_id, amount, reason, reference_id, created_at
  )
  VALUES
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      100, 'achievement', 'weekly-test:previous-a',
      (v_previous_week_start + 1)::TIMESTAMP AT TIME ZONE 'UTC'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      60, 'achievement', 'weekly-test:previous-b',
      (v_previous_week_start + 2)::TIMESTAMP AT TIME ZONE 'UTC'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      5000, 'achievement', 'weekly-test:current-b',
      (v_current_week_start + 1)::TIMESTAMP AT TIME ZONE 'UTC'
    );
END;
$weekly_fixture$;

-- Exercise the same role used by the trusted Edge Function. Calling twice
-- also verifies the advisory lock / existing-row guard prevents a second badge.
SET LOCAL ROLE service_role;
SELECT public.auto_weekly_champion();
SELECT public.auto_weekly_champion();
RESET ROLE;

SELECT is(
  (
    SELECT champion_user_id
    FROM public.leaderboard_weeks
    WHERE week_start =
      (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 7)
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::UUID,
  'the previous completed week winner is selected, not the current-week leader'
);

SELECT is(
  (
    SELECT week_end
    FROM public.leaderboard_weeks
    WHERE week_start =
      (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 7)
  ),
  (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 1),
  'the completed week ends on Sunday in UTC'
);

SELECT ok(
  (
    SELECT champion_badge_awarded
    FROM public.leaderboard_weeks
    WHERE week_start =
      (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 7)
  ),
  'the completed-week winner is marked as having received the badge'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM public.score_events
    WHERE reason = 'champion_badge'
      AND reference_id =
        'champion_badge:' ||
        (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 7)::TEXT ||
        ':aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  1,
  'repeated invocation awards exactly one champion badge'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM public.leaderboard_weeks
    WHERE week_start =
      (date_trunc('week', now() AT TIME ZONE 'UTC')::DATE - 7)
  ),
  1,
  'the completed week has exactly one champion record'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM public.leaderboard_weeks
    WHERE week_start =
      date_trunc('week', now() AT TIME ZONE 'UTC')::DATE
  ),
  0,
  'the function does not create a premature record for the in-progress week'
);

SELECT * FROM finish();
ROLLBACK;
