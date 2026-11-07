BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(8);

SELECT ok(
  NOT has_function_privilege(
    'anon', 'public.get_ai_usage_summary(text)', 'EXECUTE'
  ),
  'anonymous callers cannot execute the admin usage summary'
);

SELECT ok(
  has_function_privilege(
    'authenticated', 'public.get_ai_usage_summary(text)', 'EXECUTE'
  ),
  'authenticated role retains the admin-only RPC entry point'
);

SELECT ok(
  has_function_privilege(
    'service_role', 'public.get_ai_usage_summary(text)', 'EXECUTE'
  ),
  'the verified admin edge function retains service-role RPC access'
);

-- supabase/seed.sql creates this local-only system identity. Promote its
-- disposable profile only inside this rolled-back test transaction.
SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';

UPDATE public.profiles
SET is_admin = true
WHERE user_id = '00000000-0000-0000-0000-000000000000';

SELECT lives_ok(
  $$SELECT public.get_ai_usage_summary('studybot@jupebstudyguide.app')$$,
  'the admin-key-manager service-role request succeeds for a profile admin'
);

SELECT throws_ok(
  $$SELECT public.get_ai_usage_summary('not-an-admin@example.invalid')$$,
  '42501',
  NULL,
  'the service-role path rejects an email without profiles.is_admin'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';

SELECT lives_ok(
  $$SELECT public.get_ai_usage_summary('ignored-client-email@example.invalid')$$,
  'an authenticated admin succeeds based on auth.uid, not a supplied email'
);

SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

SELECT throws_ok(
  $$SELECT public.get_ai_usage_summary('studybot@jupebstudyguide.app')$$,
  '42501',
  NULL,
  'an authenticated non-admin cannot impersonate an admin by email'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.get_ai_usage_summary(text)'::regprocedure
      AND p.prosrc ILIKE '%get_config%'
  ),
  'the usage summary authorization no longer depends on the generic config helper'
);

SELECT * FROM finish();
ROLLBACK;
