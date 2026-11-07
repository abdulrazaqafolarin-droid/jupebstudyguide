BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT plan(16);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_api_keys'
      AND column_name='provider' AND data_type='text'
      AND is_nullable='NO' AND column_default LIKE '%gemini%'
  ),
  'AI key provider column matches the deployed schema'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_api_keys'
      AND column_name='last_error' AND data_type='text'
      AND is_nullable='YES'
  ),
  'AI key last_error remains nullable text'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_api_keys'
      AND column_name='consecutive_failures' AND data_type='integer'
      AND is_nullable='NO' AND column_default LIKE '%0%'
  ),
  'AI key consecutive_failures defaults to zero'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_api_keys'
      AND column_name='cooldown_until'
      AND data_type='timestamp with time zone' AND is_nullable='YES'
  ),
  'AI key cooldown_until is nullable timestamptz'
);

SELECT ok(
  to_regclass('public.idx_ai_api_keys_provider_priority') IS NOT NULL,
  'provider and priority have the composite unique index'
);

SELECT ok(
  to_regclass('public.idx_ai_api_keys_priority') IS NULL,
  'legacy single-provider priority index is removed'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ai_api_keys'::regclass)
  AND
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ai_usage_log'::regclass),
  'AI key and usage tables both enforce RLS'
);

SELECT ok(
  NOT has_table_privilege('anon','public.ai_api_keys','SELECT'),
  'anonymous users cannot read AI keys'
);

SELECT ok(
  NOT has_table_privilege('anon','public.ai_usage_log','SELECT'),
  'anonymous users cannot read AI usage logs'
);

SELECT ok(
  has_table_privilege('authenticated','public.ai_api_keys','SELECT'),
  'authenticated admin UI retains the AI key read privilege'
);

SELECT ok(
  has_table_privilege('authenticated','public.ai_usage_log','SELECT'),
  'authenticated admin UI retains the usage log read privilege'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('ai_api_keys','ai_usage_log')
      AND (
        COALESCE(qual,'') ILIKE '%get_config%'
        OR COALESCE(with_check,'') ILIKE '%get_config%'
      )
  ),
  'AI key and usage policies no longer invoke get_config'
);

SELECT ok(
  (
    SELECT count(*)=8
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('ai_api_keys','ai_usage_log')
      AND (
        COALESCE(qual,'') ILIKE '%is_admin%'
        OR COALESCE(with_check,'') ILIKE '%is_admin%'
      )
  ),
  'all eight AI key and usage policies use profiles.is_admin'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.get_config(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'anon', to_regprocedure('public.get_config(text)'), 'EXECUTE'
    )
  END,
  'anonymous callers cannot execute get_config'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.get_config(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'authenticated', to_regprocedure('public.get_config(text)'), 'EXECUTE'
    )
  END,
  'authenticated callers cannot execute get_config directly'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.get_config(text)') IS NULL THEN true
    ELSE has_function_privilege(
      'service_role', to_regprocedure('public.get_config(text)'), 'EXECUTE'
    )
  END,
  'trusted server-side callers retain get_config execution when present'
);

SELECT * FROM finish();
ROLLBACK;
