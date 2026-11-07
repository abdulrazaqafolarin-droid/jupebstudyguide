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


-- Preserve the admin usage dashboard's two supported trust paths:
-- 1) authenticated admin RPC callers are bound to auth.uid();
-- 2) admin-key-manager validates the end-user JWT and email before calling
--    this RPC through its service_role client, whose auth.uid() is NULL.
-- For the server path, bind the supplied email to an actual profiles.is_admin
-- account. The service_role key is never exposed to the browser.
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  p_admin_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  v_is_admin BOOLEAN := false;
  v_role TEXT := COALESCE(auth.role(), '');
  result JSON;
BEGIN
  IF v_role = 'service_role' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles AS p
      JOIN auth.users AS u ON u.id = p.user_id
      WHERE p.is_admin IS TRUE
        AND lower(u.email) = lower(btrim(COALESCE(p_admin_email, '')))
    )
    INTO v_is_admin;
  ELSE
    SELECT COALESCE(p.is_admin, false)
    INTO v_is_admin
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid();
  END IF;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT json_build_object(
    'totalRequests', (
      SELECT COALESCE(SUM(total_requests), 0)
      FROM public.ai_api_keys
    ),
    'totalTokens', (
      SELECT COALESCE(SUM(total_tokens_used), 0)
      FROM public.ai_api_keys
    ),
    'activeKeysCount', (
      SELECT COUNT(*)
      FROM public.ai_api_keys
      WHERE is_active IS TRUE AND token_exhausted IS FALSE
    ),
    'totalKeysCount', (
      SELECT COUNT(*)
      FROM public.ai_api_keys
    ),
    'currentActiveKey', (
      SELECT json_build_object('label', label, 'priority', priority)
      FROM public.ai_api_keys
      WHERE is_active IS TRUE AND token_exhausted IS FALSE
      ORDER BY priority ASC, id ASC
      LIMIT 1
    ),
    'byFeature', (
      SELECT COALESCE(
        json_agg(json_build_object(
          'feature', feature,
          'totalTokens', total_tokens,
          'totalRequests', total_requests
        ) ORDER BY feature),
        '[]'::json
      )
      FROM (
        SELECT
          feature,
          SUM(total_tokens)::BIGINT AS total_tokens,
          COUNT(*)::BIGINT AS total_requests
        FROM public.ai_usage_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY feature
      ) AS feature_usage
    ),
    'byKey', (
      SELECT COALESCE(
        json_agg(json_build_object(
          'keyId', k.id,
          'label', k.label,
          'totalTokens', k.total_tokens_used,
          'totalRequests', k.total_requests,
          'percentageOfLoad', CASE
            WHEN totals.total_requests > 0
              THEN ROUND(100.0 * k.total_requests / totals.total_requests, 1)
            ELSE 0
          END
        ) ORDER BY k.priority ASC, k.id ASC),
        '[]'::json
      )
      FROM public.ai_api_keys AS k
      CROSS JOIN (
        SELECT COALESCE(SUM(total_requests), 0)::NUMERIC AS total_requests
        FROM public.ai_api_keys
        WHERE total_requests > 0
      ) AS totals
      WHERE k.total_requests > 0
    ),
    'dailyUsage', (
      SELECT COALESCE(
        json_agg(json_build_object(
          'date', d.date,
          'totalTokens', d.total_tokens,
          'totalRequests', d.total_requests
        ) ORDER BY d.date ASC),
        '[]'::json
      )
      FROM (
        SELECT
          DATE(created_at) AS date,
          SUM(total_tokens)::BIGINT AS total_tokens,
          COUNT(*)::BIGINT AS total_requests
        FROM public.ai_usage_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY DATE(created_at)
      ) AS d
    )
  )
  INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ai_usage_summary(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_summary(TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_ai_usage_summary(TEXT) IS
  'Returns AI usage aggregates to an authenticated admin user or to the admin-key-manager service after it verifies the end-user JWT and email.';
