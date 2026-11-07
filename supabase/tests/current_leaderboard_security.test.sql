BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(8);

SELECT ok(
  COALESCE(
    (
      SELECT reloptions @> ARRAY['security_invoker=true']
      FROM pg_class
      WHERE oid = 'public.current_leaderboard'::regclass
    ),
    false
  ),
  'current_leaderboard uses caller permissions'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.current_leaderboard', 'SELECT'),
  'anonymous users have no SELECT privilege on current_leaderboard'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.current_leaderboard', 'SELECT'),
  'authenticated users retain SELECT privilege on current_leaderboard'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.current_leaderboard', 'INSERT'),
  'authenticated users cannot insert through the leaderboard view'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.current_leaderboard', 'UPDATE'),
  'authenticated users cannot update through the leaderboard view'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.current_leaderboard', 'DELETE'),
  'authenticated users cannot delete through the leaderboard view'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.current_leaderboard LIMIT 1$$,
  '42501',
  NULL,
  'anonymous callers cannot read the leaderboard view'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

SELECT lives_ok(
  $$SELECT * FROM public.current_leaderboard LIMIT 1$$,
  'authenticated callers can read the leaderboard through the RLS-aware view'
);

SELECT * FROM finish();
ROLLBACK;
