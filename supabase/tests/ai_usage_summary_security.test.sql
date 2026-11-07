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

-- Create two isolated users without invoking signup's welcome-message flow.
ALTER TABLE auth.users DISABLE TRIGGER USER;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'usage-summary-admin@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'usage-summary-student@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

ALTER TABLE auth.users ENABLE TRIGGER USER;

-- The profile security trigger deliberately allows trusted service operations
-- to seed the admin fixture, but never ordinary authenticated profile writes.
SET LOCAL ROLE service_role;
SET LOCAL "request.jwt.claim.role" = 'service_role';
SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';

INSERT INTO public.profiles (user_id, display_name, is_admin)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Usage Summary Test Admin', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Usage Summary Test Student', false);

SELECT lives_ok(
  $$SELECT public.get_ai_usage_summary('usage-summary-admin@example.invalid')$$,
  'the admin-key-manager service-role request succeeds for a profile admin'
);

SELECT throws_ok(
  $$SELECT public.get_ai_usage_summary('usage-summary-student@example.invalid')$$,
  '42501',
  NULL,
  'the service-role path still rejects an email without profiles.is_admin'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

SELECT lives_ok(
  $$SELECT public.get_ai_usage_summary('ignored-client-email@example.invalid')$$,
  'an authenticated admin succeeds based on auth.uid, not a supplied email'
);

SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claims" =
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

SELECT throws_ok(
  $$SELECT public.get_ai_usage_summary('usage-summary-admin@example.invalid')$$,
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
