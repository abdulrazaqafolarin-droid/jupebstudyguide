-- Reconcile the AI key pool with the schema already used by production.
-- Keep key material and configuration values out of seed data and CI.
ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

-- The old single-provider unique index prevents multiple providers from using
-- the same priority. The composite index matches the deployed failover model.
DROP INDEX IF EXISTS public.idx_ai_api_keys_priority;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_api_keys_provider_priority
  ON public.ai_api_keys (provider, priority);

-- The deployed policies historically called public.get_config() from their
-- USING/WITH CHECK clauses. That SECURITY DEFINER helper is callable directly
-- by every role and can disclose arbitrary config values. Replace those
-- policies with the authoritative profiles.is_admin flag instead. The
-- configured admin account has already been verified to carry this flag.
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_select_ai_api_keys ON public.ai_api_keys;
CREATE POLICY admin_only_select_ai_api_keys
  ON public.ai_api_keys FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_insert_ai_api_keys ON public.ai_api_keys;
CREATE POLICY admin_only_insert_ai_api_keys
  ON public.ai_api_keys FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_update_ai_api_keys ON public.ai_api_keys;
CREATE POLICY admin_only_update_ai_api_keys
  ON public.ai_api_keys FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_delete_ai_api_keys ON public.ai_api_keys;
CREATE POLICY admin_only_delete_ai_api_keys
  ON public.ai_api_keys FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_select_ai_usage_log ON public.ai_usage_log;
CREATE POLICY admin_only_select_ai_usage_log
  ON public.ai_usage_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_insert_ai_usage_log ON public.ai_usage_log;
CREATE POLICY admin_only_insert_ai_usage_log
  ON public.ai_usage_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_update_ai_usage_log ON public.ai_usage_log;
CREATE POLICY admin_only_update_ai_usage_log
  ON public.ai_usage_log FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

DROP POLICY IF EXISTS admin_only_delete_ai_usage_log ON public.ai_usage_log;
CREATE POLICY admin_only_delete_ai_usage_log
  ON public.ai_usage_log FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  ));

-- Keep the Data API closed to anonymous callers. Authenticated access is
-- additionally constrained by the admin-only RLS policies above.
REVOKE ALL PRIVILEGES ON TABLE public.ai_api_keys
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.ai_usage_log
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_usage_log TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.ai_api_keys TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.ai_usage_log TO service_role;

-- get_config() is absent on clean installs, but exists in the deployed
-- database. Keep it available only to trusted server-side callers.
DO $config_privileges$
BEGIN
  IF to_regprocedure('public.get_config(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_config(text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_config(text) TO service_role';
  END IF;
END;
$config_privileges$;
