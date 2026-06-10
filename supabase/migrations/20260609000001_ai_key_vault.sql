-- AI Key Vault: managed API key pool with automatic failover
-- Migration: 20260609000001

-- ============================================================
-- TABLE 1: ai_api_keys — the managed key pool
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  encrypted_key text NOT NULL,
  key_preview text NOT NULL, -- last 4 chars of the raw key, for UI identification
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  token_exhausted boolean NOT NULL DEFAULT false,
  total_requests integer NOT NULL DEFAULT 0,
  total_tokens_used bigint NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  exhausted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per priority to avoid ambiguity in failover ordering
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_api_keys_priority ON public.ai_api_keys (priority);

-- Speed up the "get next active key" query
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_active_priority
  ON public.ai_api_keys (priority)
  WHERE is_active = true AND token_exhausted = false;

COMMENT ON TABLE public.ai_api_keys IS 'Pool of Gemini API keys with automatic failover. Keys are encrypted at rest.';

-- ============================================================
-- TABLE 2: ai_usage_log — per-request usage audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid REFERENCES public.ai_api_keys(id) ON DELETE SET NULL,
  feature text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  model text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'quota_error', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_key_id ON public.ai_usage_log (key_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature ON public.ai_usage_log (feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_status ON public.ai_usage_log (status);

COMMENT ON TABLE public.ai_usage_log IS 'Per-request AI usage log for billing and monitoring.';

-- ============================================================
-- RLS: admin-only access via email check
-- ============================================================
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Admin email check helper (defined once, used by both tables)
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email' = 
      (SELECT COALESCE(current_setting('app.admin_email', true), ''))
    , false)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ai_api_keys RLS
CREATE POLICY "admin_only_select_ai_api_keys"
  ON public.ai_api_keys FOR SELECT
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_insert_ai_api_keys"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_update_ai_api_keys"
  ON public.ai_api_keys FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_delete_ai_api_keys"
  ON public.ai_api_keys FOR DELETE
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

-- ai_usage_log RLS
CREATE POLICY "admin_only_select_ai_usage_log"
  ON public.ai_usage_log FOR SELECT
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_insert_ai_usage_log"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_update_ai_usage_log"
  ON public.ai_usage_log FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

CREATE POLICY "admin_only_delete_ai_usage_log"
  ON public.ai_usage_log FOR DELETE
  USING (
    auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

-- ============================================================
-- Service role bypass: edge functions use service_role key
-- Service role has bypss RLS by default, so these policies
-- only apply to anon/key authenticated requests from the client.
-- ============================================================

-- ============================================================
-- SQL FUNCTION: increment_key_stats
-- Called by edge functions after every successful Gemini call
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_key_stats(
  p_key_id uuid,
  p_token_count integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.ai_api_keys
  SET
    total_requests = total_requests + 1,
    total_tokens_used = total_tokens_used + p_token_count,
    last_used_at = now()
  WHERE id = p_key_id;
$$;

-- ============================================================
-- SQL FUNCTION: get_ai_usage_summary
-- Returns aggregated stats for the admin usage dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  p_admin_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Verify caller is admin
  IF auth.jwt() ->> 'email' != p_admin_email THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'totalRequests', (SELECT COALESCE(SUM(total_requests), 0) FROM ai_api_keys),
    'totalTokens', (SELECT COALESCE(SUM(total_tokens_used), 0) FROM ai_api_keys),
    'activeKeysCount', (SELECT COUNT(*) FROM ai_api_keys WHERE is_active = true AND token_exhausted = false),
    'totalKeysCount', (SELECT COUNT(*) FROM ai_api_keys),
    'currentActiveKey', (
      SELECT json_build_object('label', label, 'priority', priority)
      FROM ai_api_keys
      WHERE is_active = true AND token_exhausted = false
      ORDER BY priority ASC
      LIMIT 1
    ),
    'byFeature', (
      SELECT COALESCE(json_agg(json_build_object(
        'feature', feature,
        'totalTokens', SUM(total_tokens),
        'totalRequests', COUNT(*)
      )), '[]'::json)
      FROM ai_usage_log
      WHERE created_at > now() - interval '30 days'
      GROUP BY feature
    ),
    'byKey', (
      SELECT COALESCE(json_agg(json_build_object(
        'keyId', k.id,
        'label', k.label,
        'totalTokens', k.total_tokens_used,
        'totalRequests', k.total_requests,
        'percentageOfLoad', CASE
          WHEN (SELECT SUM(total_requests) FROM ai_api_keys WHERE total_requests > 0) > 0
          THEN ROUND(100.0 * k.total_requests / NULLIF((SELECT SUM(total_requests) FROM ai_api_keys WHERE total_requests > 0), 0), 1)
          ELSE 0
        END
      )), '[]'::json)
      FROM ai_api_keys k
      WHERE k.total_requests > 0
      ORDER BY k.priority ASC
    ),
    'dailyUsage', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', d.date,
        'totalTokens', d.total_tokens,
        'totalRequests', d.total_requests
      ) ORDER BY d.date ASC), '[]'::json)
      FROM (
        SELECT
          DATE(created_at) AS date,
          SUM(total_tokens) AS total_tokens,
          COUNT(*) AS total_requests
        FROM ai_usage_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY DATE(created_at)
      ) d
    )
  ) INTO result;

  RETURN result;
END;
$$;
